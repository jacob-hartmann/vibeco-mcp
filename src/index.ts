#!/usr/bin/env node
/**
 * Vibe MCP Server
 *
 * A Model Context Protocol (MCP) server for Vibe CTV/streaming advertising reporting.
 *
 * This server provides tools, resources, and prompts for interacting
 * with the Vibe Reporting API via MCP-compatible clients.
 *
 * Supports two transport modes:
 * - stdio (default): JSON-RPC over stdin/stdout
 * - http: HTTP transport with StreamableHTTP
 *
 * Set MCP_TRANSPORT=http to use HTTP mode.
 *
 * All logging goes to stderr to avoid corrupting JSON-RPC over stdout.
 *
 * @see https://modelcontextprotocol.io/
 * @see https://help.vibe.co/en/articles/8943325-vibe-api-reporting
 */

import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerTools } from "./tools/index.js";
import { registerResources } from "./resources/index.js";
import { registerPrompts } from "./prompts/index.js";

const SERVER_NAME = "vibeco-mcp";

// Read version from package.json to keep it in sync
const require = createRequire(import.meta.url);
const packageJson = require("../package.json") as { version: string };
const SERVER_VERSION = packageJson.version;

/**
 * Start the server in stdio mode
 */
async function startStdioServer(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[${SERVER_NAME}] Server running on stdio transport`);
}

/**
 * Create an MCP server with all handlers registered
 */
function createServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "Vibe MCP server for CTV/streaming advertising analytics. " +
        "Start with vibe.ping to verify connectivity. " +
        "Use vibe.advertisers.list to discover advertisers, then vibe.campaigns.list for campaign details. " +
        "Create reports with vibe.reports.create and check status with vibe.reports.status.",
    }
  );

  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}

/**
 * Start the server in HTTP mode
 */
async function startHttpServerMode(): Promise<void> {
  const { getHttpServerConfig, startHttpServer } =
    await import("./server/index.js");

  const config = getHttpServerConfig();
  await startHttpServer(createServer, config);
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const transport = process.env["MCP_TRANSPORT"] ?? "stdio";
  console.error(
    `[${SERVER_NAME}] Starting server v${SERVER_VERSION} (${transport} transport)...`
  );

  if (transport === "http") {
    await startHttpServerMode();
  } else {
    const server = createServer();

    process.on("SIGTERM", () => {
      void server.close();
    });
    process.on("SIGINT", () => {
      void server.close();
    });

    await startStdioServer(server);
  }
}

// Run the server
main().catch((error: unknown) => {
  console.error(`[${SERVER_NAME}] Fatal error:`, error);
  process.exit(1);
});
