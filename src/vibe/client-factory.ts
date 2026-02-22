/**
 * Vibe Client Factory
 *
 * Shared factory for creating VibeClient instances from MCP request context.
 * Used by both tools and resources to avoid code duplication.
 *
 * Caches the client instance and invalidates when env vars change.
 */

import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerRequest,
  ServerNotification,
} from "@modelcontextprotocol/sdk/types.js";
import { VibeClient } from "./client.js";
import { loadVibeConfig, VibeAuthError } from "./auth.js";

/**
 * Result type for getVibeClient - allows callers to handle errors gracefully
 */
export type VibeClientResult =
  | { success: true; client: VibeClient }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Client Cache
// ---------------------------------------------------------------------------

let cachedClient: VibeClient | undefined;
let cachedConfigHash: string | undefined;

function getConfigHash(): string {
  return `${process.env["VIBE_API_KEY"] ?? ""}:${process.env["VIBE_API_BASE_URL"] ?? ""}`;
}

/**
 * Get a VibeClient from MCP request context.
 *
 * Loads API key from environment variables.
 * Caches the instance and invalidates if env vars change.
 *
 * @param _extra - MCP request handler extra context (reserved for future use)
 * @returns Result with client or error message
 */
export function getVibeClient(
  _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
): VibeClientResult {
  try {
    const hash = getConfigHash();
    if (cachedClient && cachedConfigHash === hash) {
      return { success: true, client: cachedClient };
    }

    const config = loadVibeConfig();
    cachedClient = new VibeClient(config);
    cachedConfigHash = hash;
    return { success: true, client: cachedClient };
  } catch (err) {
    // Invalidate cache on error
    cachedClient = undefined;
    cachedConfigHash = undefined;

    if (err instanceof VibeAuthError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown auth error",
    };
  }
}

/**
 * Get a VibeClient, throwing on error.
 *
 * Use this variant when errors should propagate as exceptions (e.g., resources).
 *
 * @param extra - MCP request handler extra context
 * @returns VibeClient instance
 * @throws Error if client cannot be created
 */
export function getVibeClientOrThrow(
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>
): VibeClient {
  const result = getVibeClient(extra);
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.client;
}
