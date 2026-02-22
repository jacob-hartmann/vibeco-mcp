/**
 * Vibe API Client
 *
 * Generic HTTP client wrapper for the Vibe REST API.
 *
 * - Sets `X-API-KEY: <API_KEY>` on all requests
 * - Tracks rate limit info from response headers
 * - Centralizes error mapping into typed VibeClientError
 * - Uses AbortController for request timeouts
 */

import { FETCH_TIMEOUT_MS } from "../constants.js";
import {
  VibeClientError,
  type VibeConfig,
  type VibeResult,
  type VibeRateLimitInfo,
} from "./types.js";

// ---------------------------------------------------------------------------
// HTTP Methods
// ---------------------------------------------------------------------------

type HttpMethod = "GET" | "POST";

interface RequestOptions {
  /** URL path relative to the base URL (e.g., "/get_advertiser_ids") */
  path: string;
  /** HTTP method (defaults to GET) */
  method?: HttpMethod;
  /** Query parameters */
  params?: Record<string, string>;
  /** JSON request body */
  body?: unknown;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/**
 * Vibe API Client
 *
 * Wraps the Vibe REST API with typed error handling and auth.
 */
export class VibeClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private rateLimitInfo: VibeRateLimitInfo | undefined;

  constructor(config: VibeConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
  }

  /**
   * Get the latest rate limit info from the most recent response.
   */
  getRateLimitInfo(): VibeRateLimitInfo | undefined {
    return this.rateLimitInfo;
  }

  /**
   * Make an authenticated request to the Vibe API.
   *
   * @param options - Request configuration
   * @returns Typed result with data or error
   */
  async request<T>(options: RequestOptions): Promise<VibeResult<T>> {
    const { path, method = "GET", params, body } = options;

    // Build URL
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    // Set up timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, FETCH_TIMEOUT_MS);

    try {
      const headers: Record<string, string> = {
        "X-API-KEY": this.apiKey,
        Accept: "application/json",
      };

      const init: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(body);
      }

      const response = await fetch(url.toString(), init);

      // Parse rate limit headers
      this.parseRateLimitHeaders(response);

      // Map HTTP status to typed error
      if (!response.ok) {
        return { success: false, error: await this.mapHttpError(response) };
      }

      // Parse response — guard against non-JSON bodies
      let data: T;
      try {
        data = (await response.json()) as T;
      } catch {
        return {
          success: false,
          error: new VibeClientError(
            "Received non-JSON response from the Vibe API",
            "UNKNOWN",
            response.status,
            false
          ),
        };
      }
      return { success: true, data };
    } catch (err) {
      return { success: false, error: this.mapNetworkError(err) };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // -------------------------------------------------------------------------
  // Rate Limit Header Parsing
  // -------------------------------------------------------------------------

  private parseRateLimitHeaders(response: Response): void {
    const limit = response.headers.get("x-rate-limit");
    const remaining = response.headers.get("x-rate-limit-left");
    const resetAt = response.headers.get("x-rate-limit-reset-at");
    const retryAfter = response.headers.get("x-rate-limit-retry-after");

    if (limit !== null && remaining !== null && resetAt !== null) {
      this.rateLimitInfo = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        resetAt,
      };
      if (retryAfter !== null) {
        this.rateLimitInfo.retryAfter = parseInt(retryAfter, 10);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Error Mapping
  // -------------------------------------------------------------------------

  private async mapHttpError(response: Response): Promise<VibeClientError> {
    const status = response.status;

    // Try to extract API error message from response body
    let apiMessage: string | undefined;
    try {
      const body = (await response.json()) as Record<string, unknown>;
      const msg = body["message"] ?? body["error"];
      if (typeof msg === "string") {
        apiMessage = msg;
      }
    } catch {
      // Non-JSON error body — proceed without apiMessage
    }

    const suffix = apiMessage ? `: ${apiMessage}` : "";

    switch (status) {
      case 400:
        return new VibeClientError(
          `Bad request${suffix}`,
          "VALIDATION_ERROR",
          status,
          false,
          apiMessage
        );
      case 403:
        return new VibeClientError(
          `Invalid or missing API key${suffix}`,
          "FORBIDDEN",
          status,
          false,
          apiMessage
        );
      case 404:
        return new VibeClientError(
          `Resource not found${suffix}`,
          "NOT_FOUND",
          status,
          false,
          apiMessage
        );
      case 422:
        return new VibeClientError(
          `Validation error${suffix}`,
          "VALIDATION_ERROR",
          status,
          false,
          apiMessage
        );
      case 429:
        return new VibeClientError(
          `Rate limit exceeded. Please wait before retrying.${suffix}`,
          "RATE_LIMITED",
          status,
          true,
          apiMessage
        );
      default:
        if (status >= 400 && status < 500) {
          return new VibeClientError(
            `Client error (${status})${suffix}`,
            "VALIDATION_ERROR",
            status,
            false,
            apiMessage
          );
        }
        return new VibeClientError(
          `Server error (${status})${suffix}`,
          "SERVER_ERROR",
          status,
          true,
          apiMessage
        );
    }
  }

  private mapNetworkError(err: unknown): VibeClientError {
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        return new VibeClientError(
          "Request timed out",
          "TIMEOUT",
          undefined,
          true
        );
      }
      return new VibeClientError(
        `Network error: ${err.message}`,
        "NETWORK_ERROR",
        undefined,
        false
      );
    }
    return new VibeClientError(
      "Unknown error occurred",
      "UNKNOWN",
      undefined,
      false
    );
  }
}
