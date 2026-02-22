/**
 * Vibe Module
 *
 * Vibe API client and authentication utilities.
 */

export { VibeClient } from "./client.js";
export { loadVibeConfig, isVibeConfigured, VibeAuthError } from "./auth.js";
export { getVibeClient, getVibeClientOrThrow } from "./client-factory.js";
export {
  VibeClientError,
  type VibeConfig,
  type VibeResult,
  type VibeSuccess,
  type VibeError,
  type VibeErrorCode,
  type VibeRateLimitInfo,
} from "./types.js";
