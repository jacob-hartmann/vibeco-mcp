/**
 * Shared Tool Utilities
 *
 * Common utilities for MCP tool implementations to reduce code duplication.
 */

import { z } from "zod";
import type { VibeRateLimitInfo } from "../vibe/types.js";

// ---------------------------------------------------------------------------
// Response Types
// ---------------------------------------------------------------------------

export interface ToolTextContent {
  type: "text";
  text: string;
}

export interface ToolErrorResponse {
  [x: string]: unknown;
  isError: true;
  content: ToolTextContent[];
}

export interface ToolSuccessResponse {
  [x: string]: unknown;
  content: ToolTextContent[];
  structuredContent?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Output Schema
// ---------------------------------------------------------------------------

export const vibeOutputSchema = z.looseObject({});

// ---------------------------------------------------------------------------
// Error Formatting
// ---------------------------------------------------------------------------

const ERROR_MESSAGES: Record<string, string> = {
  FORBIDDEN:
    "Your API key is invalid or missing. Set VIBE_API_KEY with a valid key from Vibe account > Developer Tool > API Keys.",
  RATE_LIMITED:
    "You have exceeded Vibe's rate limit (15 requests/hour for report creation). Please wait before trying again.",
};

/**
 * Format an error response for MCP tools.
 */
export function formatError(
  error: { code: string; message: string },
  resourceType?: string
): ToolErrorResponse {
  let errorMessage = error.message;

  if (error.code === "NOT_FOUND" && resourceType) {
    errorMessage = `The requested ${resourceType} was not found.`;
  } else {
    const mappedMessage = ERROR_MESSAGES[error.code];
    if (mappedMessage) {
      errorMessage = mappedMessage;
    }
  }

  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: `Vibe API Error (${error.code}): ${errorMessage}`,
      },
    ],
  };
}

/**
 * Format an authentication error response.
 */
export function formatAuthError(message: string): ToolErrorResponse {
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: `Authentication Error: ${message}`,
      },
    ],
  };
}

/**
 * Format a validation error response.
 */
export function formatValidationError(message: string): ToolErrorResponse {
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: `Error: ${message}`,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Success Formatting
// ---------------------------------------------------------------------------

/**
 * Format a successful JSON response.
 */
export function formatSuccess(data: unknown): ToolSuccessResponse {
  const base: ToolSuccessResponse = {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
  if (data !== null && typeof data === "object") {
    base.structuredContent = data as Record<string, unknown>;
  }
  return base;
}

/**
 * Format a successful JSON response with rate limit info appended.
 */
export function formatSuccessWithRateLimit(
  data: unknown,
  rateLimitInfo?: VibeRateLimitInfo
): ToolSuccessResponse {
  const dataText = JSON.stringify(data, null, 2);

  let text = dataText;
  if (rateLimitInfo) {
    const rlText =
      `\n\n---\nRate Limit: ${rateLimitInfo.remaining}/${rateLimitInfo.limit} requests remaining` +
      ` (resets at ${rateLimitInfo.resetAt})`;
    text = dataText + rlText;
  }

  const base: ToolSuccessResponse = {
    content: [
      {
        type: "text" as const,
        text,
      },
    ],
  };
  if (data !== null && typeof data === "object") {
    base.structuredContent = data as Record<string, unknown>;
  }
  return base;
}

/**
 * Format a successful message response.
 */
export function formatMessage(message: string): ToolSuccessResponse {
  return {
    content: [
      {
        type: "text" as const,
        text: message,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Parameter Building
// ---------------------------------------------------------------------------

/**
 * Build a params object from input, filtering out undefined values.
 */
export function buildParams<T extends Record<string, unknown>>(
  input: T
): Partial<{ [K in keyof T]: Exclude<T[K], undefined> }> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as Partial<{ [K in keyof T]: Exclude<T[K], undefined> }>;
}

// ---------------------------------------------------------------------------
// Date Validation
// ---------------------------------------------------------------------------

/** Maximum date range in days for Vibe reports */
const MAX_DATE_RANGE_DAYS = 45;

/**
 * Validate that a date range does not exceed the maximum allowed days.
 * Returns an error message if invalid, null if valid.
 */
export function validateDateRange(
  startDate: string,
  endDate: string
): string | null {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) return `Invalid start_date: "${startDate}"`;
  if (isNaN(end.getTime())) return `Invalid end_date: "${endDate}"`;
  if (end < start) return "end_date must be after start_date";

  const diffMs = end.getTime() - start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays > MAX_DATE_RANGE_DAYS) {
    return `Date range exceeds maximum of ${MAX_DATE_RANGE_DAYS} days (got ${Math.ceil(diffDays)} days)`;
  }

  return null;
}
