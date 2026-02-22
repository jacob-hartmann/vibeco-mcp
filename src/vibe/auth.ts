/**
 * Vibe Authentication
 *
 * Loads Vibe API credentials from environment variables.
 *
 * Authentication is API key-based:
 *   - VIBE_API_KEY (required) - API key sent via X-API-KEY header
 *   - VIBE_API_BASE_URL (optional, defaults to https://clear-platform.vibe.co/rest/reporting/v1)
 */

import { VIBE_API_BASE_URL } from "../constants.js";
import type { VibeConfig } from "./types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export class VibeAuthError extends Error {
  constructor(
    message: string,
    public readonly code: "NO_API_KEY"
  ) {
    super(message);
    this.name = "VibeAuthError";
  }
}

// ---------------------------------------------------------------------------
// Config Loading
// ---------------------------------------------------------------------------

/**
 * Load Vibe configuration from environment variables.
 *
 * @throws {VibeAuthError} if required credentials are missing.
 */
export function loadVibeConfig(): VibeConfig {
  const apiKey = process.env["VIBE_API_KEY"];
  if (!apiKey) {
    throw new VibeAuthError(
      "VIBE_API_KEY environment variable is required. " +
        "Get your API key from: Vibe account > Developer Tool > API Keys.",
      "NO_API_KEY"
    );
  }

  const baseUrl = process.env["VIBE_API_BASE_URL"] ?? VIBE_API_BASE_URL;

  return { apiKey, baseUrl };
}

/**
 * Check whether Vibe API credentials are configured.
 * Returns true if VIBE_API_KEY is set.
 */
export function isVibeConfigured(): boolean {
  return !!process.env["VIBE_API_KEY"];
}
