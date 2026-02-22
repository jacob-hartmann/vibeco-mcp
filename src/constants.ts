/**
 * Shared Constants
 *
 * Centralized constants used across the application.
 */

// ---------------------------------------------------------------------------
// API URLs
// ---------------------------------------------------------------------------

/** Vibe API base URL */
export const VIBE_API_BASE_URL =
  "https://clear-platform.vibe.co/rest/reporting/v1";

// ---------------------------------------------------------------------------
// Timeouts
// ---------------------------------------------------------------------------

/** Timeout for external API requests in milliseconds (30 seconds) */
export const FETCH_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// HTTP Server
// ---------------------------------------------------------------------------

/** Default port for the HTTP server */
export const DEFAULT_SERVER_PORT = "3000";

/** Number of characters to display from session IDs in logs */
export const SESSION_ID_DISPLAY_LENGTH = 8;

// ---------------------------------------------------------------------------
// JSON-RPC Error Codes
// ---------------------------------------------------------------------------

/** JSON-RPC invalid request error code */
export const JSONRPC_ERROR_INVALID_REQUEST = -32600;

/** JSON-RPC internal error code */
export const JSONRPC_ERROR_INTERNAL = -32603;
