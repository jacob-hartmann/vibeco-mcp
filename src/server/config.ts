/**
 * HTTP Server Configuration
 *
 * Configuration for the HTTP transport mode.
 */

import { DEFAULT_SERVER_PORT } from "../constants.js";

/**
 * Configuration for the HTTP server
 */
export interface HttpServerConfig {
  /** Host to bind the server to */
  host: string;
  /** Port to listen on */
  port: number;
}

/**
 * Load HTTP server config from environment variables.
 */
export function getHttpServerConfig(): HttpServerConfig {
  const host = process.env["MCP_SERVER_HOST"] ?? "127.0.0.1";
  const port = parseInt(
    process.env["MCP_SERVER_PORT"] ?? DEFAULT_SERVER_PORT,
    10
  );

  return { host, port };
}
