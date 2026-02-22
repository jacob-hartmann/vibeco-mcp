/**
 * Vibe API Types
 *
 * Shared types for the Vibe API client.
 */

// ---------------------------------------------------------------------------
// Error Types
// ---------------------------------------------------------------------------

/** Error codes returned by the Vibe client */
export type VibeErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "VALIDATION_ERROR"
  | "SERVER_ERROR"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "UNKNOWN";

/**
 * Typed error for Vibe API operations.
 */
export class VibeClientError extends Error {
  constructor(
    message: string,
    public readonly code: VibeErrorCode,
    public readonly statusCode: number | undefined,
    public readonly retryable: boolean,
    public readonly apiMessage?: string
  ) {
    super(message);
    this.name = "VibeClientError";
  }
}

// ---------------------------------------------------------------------------
// Result Types
// ---------------------------------------------------------------------------

/** Success result from a Vibe API call */
export interface VibeSuccess<T> {
  success: true;
  data: T;
}

/** Error result from a Vibe API call */
export interface VibeError {
  success: false;
  error: VibeClientError;
}

/** Discriminated union for API results */
export type VibeResult<T> = VibeSuccess<T> | VibeError;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Configuration for the Vibe API client */
export interface VibeConfig {
  /** Vibe API key (required) */
  apiKey: string;
  /** API base URL (defaults to https://clear-platform.vibe.co/rest/reporting/v1) */
  baseUrl: string;
}

// ---------------------------------------------------------------------------
// Rate Limit Info
// ---------------------------------------------------------------------------

/** Rate limit information from Vibe API response headers */
export interface VibeRateLimitInfo {
  /** Total requests allowed per window */
  limit: number;
  /** Requests remaining in current window */
  remaining: number;
  /** ISO timestamp when the rate limit window resets */
  resetAt: string;
  /** Seconds to wait before retrying (only present when rate limited) */
  retryAfter?: number;
}
