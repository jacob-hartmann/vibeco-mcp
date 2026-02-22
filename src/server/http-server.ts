/**
 * HTTP Server for MCP
 *
 * Creates an Express-based HTTP server with:
 * - MCP endpoint with StreamableHTTP transport
 * - Security hardening (helmet, rate limiting, CORS, cache control)
 * - Session management via LRU cache
 * - No OAuth (API key auth is between server and Vibe, not client and MCP server)
 */

import { randomUUID } from "node:crypto";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

import type { HttpServerConfig } from "./config.js";
import { isCorsAllowedPath } from "./cors.js";
import {
  SESSION_ID_DISPLAY_LENGTH,
  JSONRPC_ERROR_INVALID_REQUEST,
  JSONRPC_ERROR_INTERNAL,
} from "../constants.js";
import { LRUCache } from "../utils/lru-cache.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Session idle timeout in milliseconds (30 minutes) */
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

/** Session cleanup interval in milliseconds (5 minutes) */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/** Rate limit: max requests per window */
const RATE_LIMIT_MAX = 100;

/** Rate limit window in milliseconds (1 minute) */
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

/** Maximum number of concurrent sessions */
const MAX_SESSIONS = 1000;

// ---------------------------------------------------------------------------
// HTTP Server
// ---------------------------------------------------------------------------

/** Track session last activity for idle timeout */
interface SessionInfo {
  transport: StreamableHTTPServerTransport;
  lastActivity: number;
}

/**
 * Start the HTTP server with MCP endpoints.
 */
export async function startHttpServer(
  getServer: () => McpServer,
  config: HttpServerConfig
): Promise<void> {
  const { host, port } = config;

  const app = express();

  // Security headers via helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'none'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // Rate limiting
  const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
  });

  app.use("/mcp", limiter);

  // CORS middleware
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (!origin) {
      next();
      return;
    }

    const isAllowed = isCorsAllowedPath(req.path);

    if (isAllowed) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, DELETE, OPTIONS"
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, mcp-session-id"
      );
      res.setHeader("Access-Control-Max-Age", "86400");

      if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
      }

      next();
      return;
    }

    res.status(403).json({ error: "Cross-origin requests not allowed" });
    return;
  });

  // Cache-Control
  const noCacheMiddleware: express.RequestHandler = (_req, res, next) => {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  };

  app.use("/mcp", noCacheMiddleware);

  // Parse JSON bodies
  app.use(express.json());

  // Session management
  const sessions = new LRUCache<SessionInfo>({
    maxSize: MAX_SESSIONS,
    /* v8 ignore start */
    onEvict: (sessionId, session) => {
      console.error(
        `[vibeco-mcp] Evicting session ${sessionId.slice(0, SESSION_ID_DISPLAY_LENGTH)} (max sessions reached)`
      );
      try {
        session.transport.close().catch((err: unknown) => {
          console.error(
            `[vibeco-mcp] Error closing evicted session:`,
            err instanceof Error ? err.message : err
          );
        });
      } catch {
        // Ignore close errors on eviction
      }
    },
    /* v8 ignore stop */
  });

  // Helper to update session activity
  const touchSession = (sessionId: string): void => {
    const session = sessions.get(sessionId);
    /* v8 ignore start */
    if (!session) return;
    /* v8 ignore stop */
    session.lastActivity = Date.now();
    sessions.set(sessionId, session);
  };

  // Helper to clean up a session
  const cleanupSession = (sessionId: string): void => {
    const session = sessions.get(sessionId);
    /* v8 ignore start */
    if (!session) return;
    /* v8 ignore stop */
    try {
      session.transport.close().catch((err: unknown) => {
        console.error(
          `[vibeco-mcp] Error closing session ${sessionId.slice(0, SESSION_ID_DISPLAY_LENGTH)}:`,
          /* v8 ignore next */
          err instanceof Error ? err.message : err
        );
      });
    } catch (err) {
      console.error(
        `[vibeco-mcp] Error closing session ${sessionId.slice(0, SESSION_ID_DISPLAY_LENGTH)}:`,
        /* v8 ignore next */
        err instanceof Error ? err.message : err
      );
    }
    sessions.delete(sessionId);
  };

  // MCP POST handler
  const mcpPostHandler: express.RequestHandler = async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    try {
      let transport: StreamableHTTPServerTransport;

      const existingSession = sessionId ? sessions.get(sessionId) : undefined;
      if (sessionId && existingSession) {
        transport = existingSession.transport;
        touchSession(sessionId);
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          /* v8 ignore start */
          sessionIdGenerator: () => randomUUID(),
          /* v8 ignore stop */
          onsessioninitialized: (sid) => {
            sessions.set(sid, {
              transport,
              lastActivity: Date.now(),
            });
          },
        });

        transport.onclose = () => {
          const sid = transport.sessionId;
          /* v8 ignore start */
          if (sid && sessions.has(sid)) {
            sessions.delete(sid);
          }
          /* v8 ignore stop */
        };

        const server = getServer();
        await server.connect(transport as unknown as Transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else if (sessionId && !existingSession) {
        res.status(404).json({
          jsonrpc: "2.0",
          error: {
            code: JSONRPC_ERROR_INVALID_REQUEST,
            message: "Session not found",
          },
          id: null,
        });
        return;
      } else {
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: JSONRPC_ERROR_INVALID_REQUEST,
            message: "Bad Request: No valid session ID provided",
          },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("[vibeco-mcp] Error handling MCP request:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: JSONRPC_ERROR_INTERNAL,
            message: "Internal server error",
          },
          id: null,
        });
      }
    }
  };

  // MCP GET handler (SSE streams)
  const mcpGetHandler: express.RequestHandler = async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    const session = sessionId ? sessions.get(sessionId) : undefined;
    if (!sessionId || !session) {
      res.status(sessionId ? 404 : 400).json({
        jsonrpc: "2.0",
        error: {
          code: JSONRPC_ERROR_INVALID_REQUEST,
          message: sessionId ? "Session not found" : "Missing session ID",
        },
        id: null,
      });
      return;
    }

    touchSession(sessionId);
    await session.transport.handleRequest(req, res);
  };

  // MCP DELETE handler (session termination)
  const mcpDeleteHandler: express.RequestHandler = async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const session = sessionId ? sessions.get(sessionId) : undefined;

    if (!sessionId || !session) {
      res.status(sessionId ? 404 : 400).json({
        jsonrpc: "2.0",
        error: {
          code: JSONRPC_ERROR_INVALID_REQUEST,
          message: sessionId ? "Session not found" : "Missing session ID",
        },
        id: null,
      });
      return;
    }

    try {
      await session.transport.handleRequest(req, res);
    } catch (error) {
      console.error("[vibeco-mcp] Error handling session termination:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: JSONRPC_ERROR_INTERNAL,
            message: "Error processing session termination",
          },
          id: null,
        });
      }
    }
  };

  // Register routes (no auth middleware needed)
  app.post("/mcp", mcpPostHandler);
  app.get("/mcp", mcpGetHandler);
  app.delete("/mcp", mcpDeleteHandler);

  // Global error handler
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error("[vibeco-mcp] Unhandled error:", err);

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: JSONRPC_ERROR_INTERNAL,
            message: "Internal server error",
          },
          id: null,
        });
      }
    }
  );

  // Start session cleanup interval
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
      if (now - session.lastActivity > SESSION_IDLE_TIMEOUT_MS) {
        console.error(
          `[vibeco-mcp] Closing idle session ${sessionId.slice(0, SESSION_ID_DISPLAY_LENGTH)}...`
        );
        cleanupSession(sessionId);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  cleanupInterval.unref();

  // Start listening
  await new Promise<void>((resolve, reject) => {
    const server = app.listen(port, host, () => {
      console.error(`[vibeco-mcp] HTTP server listening on ${host}:${port}`);
      console.error(`[vibeco-mcp] MCP endpoint: http://${host}:${port}/mcp`);
      resolve();
    });

    server.on("error", reject);

    // Graceful shutdown handler
    const shutdown = (signal: string): void => {
      console.error(
        `[vibeco-mcp] Received ${signal}, shutting down gracefully...`
      );

      server.close(() => {
        console.error("[vibeco-mcp] HTTP server closed");
      });

      clearInterval(cleanupInterval);

      console.error(`[vibeco-mcp] Closing ${sessions.size} active session(s)...`);
      for (const [sessionId, session] of sessions.entries()) {
        try {
          /* v8 ignore start */
          session.transport.close().catch((err: unknown) => {
            console.error(
              `[vibeco-mcp] Error closing session ${sessionId.slice(0, SESSION_ID_DISPLAY_LENGTH)}:`,
              err instanceof Error ? err.message : err
            );
          });
          /* v8 ignore stop */
        } catch {
          // Ignore close errors during shutdown
        }
      }
      sessions.clear();

      setTimeout(() => {
        console.error("[vibeco-mcp] Shutdown complete");
        process.exit(0);
      }, 5000);
    };

    process.on("SIGINT", () => {
      shutdown("SIGINT");
    });
    /* v8 ignore start */
    process.on("SIGTERM", () => {
      shutdown("SIGTERM");
    });
    /* v8 ignore stop */
  });
}
