/**
 * HTTP Server Tests
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";

vi.mock("node:crypto", () => ({
  randomUUID: vi.fn(() => "test-uuid-123"),
}));

let corsMiddleware: (
  req: MockRequest,
  res: MockResponse,
  next: () => void
) => void;
let noCacheMiddleware: (
  req: MockRequest,
  res: MockResponse,
  next: () => void
) => void;
let mcpPostHandler: (req: MockRequest, res: MockResponse) => Promise<void>;
let mcpGetHandler: (req: MockRequest, res: MockResponse) => Promise<void>;
let mcpDeleteHandler: (req: MockRequest, res: MockResponse) => Promise<void>;

interface MockRequest {
  method: string;
  path: string;
  headers: Record<string, string | undefined>;
  query: Record<string, string | string[] | undefined>;
  body: unknown;
}

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  data: unknown;
  status: Mock;
  json: Mock;
  send: Mock;
  setHeader: Mock;
  end: Mock;
  headersSent: boolean;
}

function createMockRequest(overrides: Partial<MockRequest> = {}): MockRequest {
  return {
    method: "GET",
    path: "/",
    headers: {},
    query: {},
    body: undefined,
    ...overrides,
  };
}

function createMockResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    headers: {},
    data: undefined,
    headersSent: false,
    status: vi.fn(function (this: MockResponse, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function (this: MockResponse, data: unknown) {
      this.data = data;
      return this;
    }),
    send: vi.fn(function (this: MockResponse, data: unknown) {
      this.data = data;
      this.headersSent = true;
      return this;
    }),
    setHeader: vi.fn(function (
      this: MockResponse,
      name: string,
      value: string
    ) {
      this.headers[name] = value;
      return this;
    }),
    end: vi.fn(function (this: MockResponse) {
      this.headersSent = true;
      return this;
    }),
  };
  return res;
}

const allMockTransports: {
  sessionId: string;
  handleRequest: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  onclose: (() => void) | undefined;
}[] = [];

let mockApp: {
  use: Mock;
  get: Mock;
  post: Mock;
  delete: Mock;
  listen: Mock;
};

vi.mock("express", () => {
  const createApp = () => {
    const app = {
      use: vi.fn((...args: unknown[]) => {
        const handler = args[0];
        const path = typeof handler === "string" ? handler : undefined;

        if (typeof handler === "function" && handler.length === 3) {
          corsMiddleware = handler as typeof corsMiddleware;
        }

        if (
          path &&
          args[1] &&
          typeof args[1] === "function" &&
          (args[1] as { length: number }).length === 3
        ) {
          const middleware = args[1] as typeof noCacheMiddleware;
          if (path === "/mcp") {
            noCacheMiddleware = middleware;
          }
        }
        return app;
      }),
      get: vi.fn((...args: unknown[]) => {
        const path = args[0] as string;
        const handler = args[args.length - 1] as typeof mcpGetHandler;
        if (path === "/mcp") {
          mcpGetHandler = handler;
        }
        return app;
      }),
      post: vi.fn((...args: unknown[]) => {
        const path = args[0] as string;
        const handler = args[args.length - 1] as typeof mcpPostHandler;
        if (path === "/mcp") {
          mcpPostHandler = handler;
        }
        return app;
      }),
      delete: vi.fn((...args: unknown[]) => {
        const path = args[0] as string;
        const handler = args[args.length - 1] as typeof mcpDeleteHandler;
        if (path === "/mcp") {
          mcpDeleteHandler = handler;
        }
        return app;
      }),
      listen: vi.fn((_port: number, _host: string, callback: () => void) => {
        callback();
        return {
          on: vi.fn(),
          close: vi.fn((cb: () => void) => {
            cb();
          }),
        };
      }),
    };
    mockApp = app;
    return app;
  };

  const express = Object.assign(
    vi.fn(() => createApp()),
    {
      json: vi.fn(() => vi.fn()),
    }
  );
  return { default: express };
});

vi.mock("helmet", () => ({
  default: vi.fn(() => vi.fn()),
}));

vi.mock("express-rate-limit", () => ({
  default: vi.fn(() => vi.fn()),
}));

vi.mock("@modelcontextprotocol/sdk/server/streamableHttp.js", () => {
  let counter = 0;

  class MockStreamableHTTPServerTransport {
    sessionId: string;
    handleRequest: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    onclose: (() => void) | undefined;

    constructor(options?: { onsessioninitialized?: (sid: string) => void }) {
      this.sessionId = `session-${++counter}`;
      this.handleRequest = vi.fn().mockResolvedValue(undefined);
      this.close = vi.fn().mockResolvedValue(undefined);
      this.onclose = undefined;
      allMockTransports.push(this);
      if (options?.onsessioninitialized) {
        const sid = this.sessionId;
        queueMicrotask(() => {
          options.onsessioninitialized!(sid);
        });
      }
    }
  }

  return {
    StreamableHTTPServerTransport: MockStreamableHTTPServerTransport,
  };
});

vi.mock("@modelcontextprotocol/sdk/types.js", () => ({
  isInitializeRequest: vi.fn((body) => {
    return body?.method === "initialize";
  }),
}));

vi.mock("./cors.js", () => ({
  isCorsAllowedPath: vi.fn((path: string) => {
    return path === "/mcp" || path.startsWith("/mcp/");
  }),
}));

import { startHttpServer } from "./http-server.js";
import type { HttpServerConfig } from "./config.js";

function getLatestTransport() {
  return allMockTransports[allMockTransports.length - 1]!;
}

describe("HTTP Server", () => {
  const mockConfig: HttpServerConfig = {
    host: "127.0.0.1",
    port: 3000,
  };

  let mockGetServer: Mock;
  let mockServer: { connect: Mock };

  beforeEach(() => {
    allMockTransports.length = 0;

    mockServer = {
      connect: vi.fn().mockResolvedValue(undefined),
    };
    mockGetServer = vi.fn(() => mockServer);
  });

  describe("startHttpServer", () => {
    it("should start server and register routes", async () => {
      await startHttpServer(mockGetServer, mockConfig);

      expect(mockApp.post).toHaveBeenCalledWith("/mcp", expect.any(Function));
      expect(mockApp.get).toHaveBeenCalledWith("/mcp", expect.any(Function));
      expect(mockApp.delete).toHaveBeenCalledWith("/mcp", expect.any(Function));
    });

    it("should listen on configured host and port", async () => {
      await startHttpServer(mockGetServer, mockConfig);

      expect(mockApp.listen).toHaveBeenCalledWith(
        3000,
        "127.0.0.1",
        expect.any(Function)
      );
    });

    it("should apply helmet security middleware", async () => {
      const helmet = await import("helmet");

      await startHttpServer(mockGetServer, mockConfig);

      expect(helmet.default).toHaveBeenCalledWith(
        expect.objectContaining({
          contentSecurityPolicy: expect.any(Object),
          crossOriginEmbedderPolicy: false,
        })
      );
    });

    it("should apply rate limiting to mcp endpoint", async () => {
      const rateLimit = await import("express-rate-limit");

      await startHttpServer(mockGetServer, mockConfig);

      expect(rateLimit.default).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 60000,
          max: 100,
        })
      );
    });
  });

  describe("MCP POST handler", () => {
    beforeEach(async () => {
      await startHttpServer(mockGetServer, mockConfig);
    });

    it("should handle initialize request for new session", async () => {
      const req = createMockRequest({
        method: "POST",
        path: "/mcp",
        headers: {},
        body: { method: "initialize", params: {} },
      });
      const res = createMockResponse();

      await mcpPostHandler(req, res);

      expect(mockServer.connect).toHaveBeenCalled();
      expect(allMockTransports.length).toBe(1);
      expect(allMockTransports[0]!.handleRequest).toHaveBeenCalled();
    });

    it("should reject requests without session ID when not initializing", async () => {
      const req = createMockRequest({
        method: "POST",
        path: "/mcp",
        headers: {},
        body: { method: "tools/list" },
      });
      const res = createMockResponse();

      await mcpPostHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: -32600,
            message: "Bad Request: No valid session ID provided",
          }),
        })
      );
    });
  });

  describe("MCP GET handler", () => {
    beforeEach(async () => {
      await startHttpServer(mockGetServer, mockConfig);
    });

    it("should reject requests without session ID", async () => {
      const req = createMockRequest({
        method: "GET",
        path: "/mcp",
        headers: {},
      });
      const res = createMockResponse();

      await mcpGetHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should reject requests with invalid session ID", async () => {
      const req = createMockRequest({
        method: "GET",
        path: "/mcp",
        headers: { "mcp-session-id": "invalid-session" },
      });
      const res = createMockResponse();

      await mcpGetHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("MCP DELETE handler", () => {
    beforeEach(async () => {
      await startHttpServer(mockGetServer, mockConfig);
    });

    it("should reject requests without session ID", async () => {
      const req = createMockRequest({
        method: "DELETE",
        path: "/mcp",
        headers: {},
      });
      const res = createMockResponse();

      await mcpDeleteHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("CORS middleware", () => {
    beforeEach(async () => {
      await startHttpServer(mockGetServer, mockConfig);
    });

    it("should allow requests without origin", () => {
      const req = createMockRequest({ path: "/mcp", headers: {} });
      const res = createMockResponse();
      const next = vi.fn();

      corsMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("should set CORS headers for allowed paths", () => {
      const req = createMockRequest({
        path: "/mcp",
        headers: { origin: "http://example.com" },
      });
      const res = createMockResponse();
      const next = vi.fn();

      corsMiddleware(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Origin",
        "http://example.com"
      );
      expect(next).toHaveBeenCalled();
    });

    it("should handle OPTIONS preflight requests", () => {
      const req = createMockRequest({
        method: "OPTIONS",
        path: "/mcp",
        headers: { origin: "http://example.com" },
      });
      const res = createMockResponse();
      const next = vi.fn();

      corsMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.end).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it("should block cross-origin requests to non-MCP paths", async () => {
      vi.mocked(
        (await import("./cors.js")).isCorsAllowedPath
      ).mockReturnValueOnce(false);

      const req = createMockRequest({
        path: "/other",
        headers: { origin: "http://evil.com" },
      });
      const res = createMockResponse();
      const next = vi.fn();

      corsMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("Cache control middleware", () => {
    beforeEach(async () => {
      await startHttpServer(mockGetServer, mockConfig);
    });

    it("should set no-cache headers", () => {
      const res = createMockResponse();
      const next = vi.fn();

      noCacheMiddleware(createMockRequest(), res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, private"
      );
      expect(res.setHeader).toHaveBeenCalledWith("Pragma", "no-cache");
      expect(res.setHeader).toHaveBeenCalledWith("Expires", "0");
      expect(next).toHaveBeenCalled();
    });
  });

  describe("Session lifecycle", () => {
    beforeEach(async () => {
      await startHttpServer(mockGetServer, mockConfig);
    });

    it("should reuse existing transport for valid session ID", async () => {
      const initReq = createMockRequest({
        method: "POST",
        path: "/mcp",
        headers: {},
        body: { method: "initialize", params: {} },
      });
      const initRes = createMockResponse();
      await mcpPostHandler(initReq, initRes);

      const transport = getLatestTransport();
      const sessionId = transport.sessionId;

      const req = createMockRequest({
        method: "POST",
        path: "/mcp",
        headers: { "mcp-session-id": sessionId },
        body: { method: "tools/list" },
      });
      const res = createMockResponse();
      await mcpPostHandler(req, res);

      expect(transport.handleRequest).toHaveBeenCalled();
    });

    it("should return 404 for unknown session ID", async () => {
      const req = createMockRequest({
        method: "POST",
        path: "/mcp",
        headers: { "mcp-session-id": "unknown-session-id" },
        body: { method: "tools/list" },
      });
      const res = createMockResponse();
      await mcpPostHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should remove session when transport.onclose is called", async () => {
      const initReq = createMockRequest({
        method: "POST",
        path: "/mcp",
        headers: {},
        body: { method: "initialize", params: {} },
      });
      const initRes = createMockResponse();
      await mcpPostHandler(initReq, initRes);

      const transport = getLatestTransport();
      const sessionId = transport.sessionId;

      if (transport.onclose) transport.onclose();

      const req = createMockRequest({
        method: "POST",
        path: "/mcp",
        headers: { "mcp-session-id": sessionId },
        body: { method: "tools/list" },
      });
      const res = createMockResponse();
      await mcpPostHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("Error handling", () => {
    beforeEach(async () => {
      await startHttpServer(mockGetServer, mockConfig);
    });

    it("should return 500 when handleRequest throws on existing session", async () => {
      const initReq = createMockRequest({
        method: "POST",
        path: "/mcp",
        headers: {},
        body: { method: "initialize", params: {} },
      });
      const initRes = createMockResponse();
      await mcpPostHandler(initReq, initRes);

      const transport = getLatestTransport();
      const sessionId = transport.sessionId;

      transport.handleRequest.mockRejectedValueOnce(
        new Error("Transport error")
      );

      const req = createMockRequest({
        method: "POST",
        path: "/mcp",
        headers: { "mcp-session-id": sessionId },
        body: { method: "tools/list" },
      });
      const res = createMockResponse();
      await mcpPostHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("should not send 500 response when headers already sent on POST", async () => {
      const initReq = createMockRequest({
        method: "POST",
        path: "/mcp",
        headers: {},
        body: { method: "initialize", params: {} },
      });
      const initRes = createMockResponse();
      await mcpPostHandler(initReq, initRes);

      const transport = getLatestTransport();
      const sessionId = transport.sessionId;

      transport.handleRequest.mockRejectedValueOnce(
        new Error("Transport error")
      );

      const req = createMockRequest({
        method: "POST",
        path: "/mcp",
        headers: { "mcp-session-id": sessionId },
        body: { method: "tools/list" },
      });
      const res = createMockResponse();
      res.headersSent = true;
      await mcpPostHandler(req, res);

      expect(res.status).not.toHaveBeenCalled();
    });

    it("should return 500 when DELETE handleRequest throws", async () => {
      const initReq = createMockRequest({
        method: "POST",
        path: "/mcp",
        headers: {},
        body: { method: "initialize", params: {} },
      });
      const initRes = createMockResponse();
      await mcpPostHandler(initReq, initRes);

      const transport = getLatestTransport();
      const sessionId = transport.sessionId;

      transport.handleRequest.mockRejectedValueOnce(new Error("Delete error"));

      const req = createMockRequest({
        method: "DELETE",
        path: "/mcp",
        headers: { "mcp-session-id": sessionId },
      });
      const res = createMockResponse();
      await mcpDeleteHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("should not send response when DELETE throws and headers already sent", async () => {
      const initReq = createMockRequest({
        method: "POST",
        path: "/mcp",
        headers: {},
        body: { method: "initialize", params: {} },
      });
      const initRes = createMockResponse();
      await mcpPostHandler(initReq, initRes);

      const transport = getLatestTransport();
      const sessionId = transport.sessionId;

      transport.handleRequest.mockRejectedValueOnce(new Error("Delete error"));

      const req = createMockRequest({
        method: "DELETE",
        path: "/mcp",
        headers: { "mcp-session-id": sessionId },
      });
      const res = createMockResponse();
      res.headersSent = true;
      await mcpDeleteHandler(req, res);

      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("Global error handler", () => {
    let errorHandler: (
      err: Error,
      req: MockRequest,
      res: MockResponse,
      next: () => void
    ) => void;

    beforeEach(async () => {
      await startHttpServer(mockGetServer, mockConfig);

      const useCalls = mockApp.use.mock.calls;
      for (let i = useCalls.length - 1; i >= 0; i--) {
        const arg = useCalls[i]?.[0];
        if (typeof arg === "function" && arg.length === 4) {
          errorHandler = arg as typeof errorHandler;
          break;
        }
      }
    });

    it("should return 500 JSON-RPC error", () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      errorHandler(new Error("Unhandled error"), req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("should not send response when headers already sent", () => {
      const req = createMockRequest();
      const res = createMockResponse();
      res.headersSent = true;
      const next = vi.fn();

      errorHandler(new Error("Unhandled error"), req, res, next);

      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("Cleanup and shutdown", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should clean up idle sessions on interval", async () => {
      await startHttpServer(mockGetServer, mockConfig);

      const initReq = createMockRequest({
        method: "POST",
        path: "/mcp",
        headers: {},
        body: { method: "initialize", params: {} },
      });
      const initRes = createMockResponse();
      await mcpPostHandler(initReq, initRes);

      const sessionId = getLatestTransport().sessionId;

      await vi.advanceTimersByTimeAsync(35 * 60 * 1000);

      const req = createMockRequest({
        method: "POST",
        path: "/mcp",
        headers: { "mcp-session-id": sessionId },
        body: { method: "tools/list" },
      });
      const res = createMockResponse();
      await mcpPostHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should handle transport.close() rejection during cleanupSession", async () => {
      await startHttpServer(mockGetServer, mockConfig);

      const initReq = createMockRequest({
        method: "POST",
        path: "/mcp",
        headers: {},
        body: { method: "initialize", params: {} },
      });
      const initRes = createMockResponse();
      await mcpPostHandler(initReq, initRes);

      getLatestTransport().close.mockRejectedValue(new Error("Close failed"));

      await vi.advanceTimersByTimeAsync(35 * 60 * 1000);
    });

    it("should handle transport.close() throwing synchronously during cleanupSession", async () => {
      await startHttpServer(mockGetServer, mockConfig);

      const initReq = createMockRequest({
        method: "POST",
        path: "/mcp",
        headers: {},
        body: { method: "initialize", params: {} },
      });
      const initRes = createMockResponse();
      await mcpPostHandler(initReq, initRes);

      getLatestTransport().close.mockImplementation(() => {
        throw new Error("Close failed synchronously");
      });

      await vi.advanceTimersByTimeAsync(35 * 60 * 1000);
    });

    it("should shut down gracefully on SIGINT", async () => {
      const processOnSpy = vi.spyOn(process, "on");
      const processExitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      await startHttpServer(mockGetServer, mockConfig);

      const sigintCall = processOnSpy.mock.calls.find(
        (call) => call[0] === "SIGINT"
      );
      expect(sigintCall).toBeDefined();

      const sigintHandler = sigintCall![1] as () => void;

      const initReq = createMockRequest({
        method: "POST",
        path: "/mcp",
        headers: {},
        body: { method: "initialize", params: {} },
      });
      const initRes = createMockResponse();
      await mcpPostHandler(initReq, initRes);

      sigintHandler();

      await vi.advanceTimersByTimeAsync(5001);

      expect(processExitSpy).toHaveBeenCalledWith(0);

      processOnSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    it("should register SIGTERM handler", async () => {
      const processOnSpy = vi.spyOn(process, "on");

      await startHttpServer(mockGetServer, mockConfig);

      const sigtermCall = processOnSpy.mock.calls.find(
        (call) => call[0] === "SIGTERM"
      );
      expect(sigtermCall).toBeDefined();

      processOnSpy.mockRestore();
    });
  });

  describe("GET handler with valid session", () => {
    beforeEach(async () => {
      await startHttpServer(mockGetServer, mockConfig);
    });

    it("should handle GET request with valid session ID", async () => {
      const initReq = createMockRequest({
        method: "POST",
        path: "/mcp",
        headers: {},
        body: { method: "initialize", params: {} },
      });
      const initRes = createMockResponse();
      await mcpPostHandler(initReq, initRes);

      const sessionId = getLatestTransport().sessionId;

      const req = createMockRequest({
        method: "GET",
        path: "/mcp",
        headers: { "mcp-session-id": sessionId },
      });
      const res = createMockResponse();
      await mcpGetHandler(req, res);

      expect(getLatestTransport().handleRequest).toHaveBeenCalled();
    });
  });

  describe("DELETE handler with valid session", () => {
    beforeEach(async () => {
      await startHttpServer(mockGetServer, mockConfig);
    });

    it("should reject DELETE with unknown session ID", async () => {
      const req = createMockRequest({
        method: "DELETE",
        path: "/mcp",
        headers: { "mcp-session-id": "unknown-id" },
      });
      const res = createMockResponse();
      await mcpDeleteHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
