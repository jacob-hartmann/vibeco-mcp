import { describe, it, expect } from "vitest";
import {
  formatError,
  formatAuthError,
  formatValidationError,
  formatSuccess,
  formatSuccessWithRateLimit,
  formatMessage,
  buildParams,
  validateDateRange,
} from "./utils.js";

describe("Tool Utilities", () => {
  describe("formatError", () => {
    it("should format error with code and message", () => {
      const result = formatError({
        code: "SERVER_ERROR",
        message: "Internal error",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain("SERVER_ERROR");
      expect(result.content[0]?.text).toContain("Internal error");
    });

    it("should use mapped message for FORBIDDEN", () => {
      const result = formatError({ code: "FORBIDDEN", message: "raw" });
      expect(result.content[0]?.text).toContain("invalid or missing");
    });

    it("should use mapped message for RATE_LIMITED", () => {
      const result = formatError({ code: "RATE_LIMITED", message: "raw" });
      expect(result.content[0]?.text).toContain("rate limit");
    });

    it("should use custom not-found message when resourceType is given", () => {
      const result = formatError(
        { code: "NOT_FOUND", message: "raw" },
        "report"
      );
      expect(result.content[0]?.text).toContain("report was not found");
    });

    it("should use raw message for NOT_FOUND without resourceType", () => {
      const result = formatError({ code: "NOT_FOUND", message: "raw msg" });
      expect(result.content[0]?.text).toContain("raw msg");
    });
  });

  describe("formatAuthError", () => {
    it("should format authentication error", () => {
      const result = formatAuthError("Missing API key");
      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain("Authentication Error");
      expect(result.content[0]?.text).toContain("Missing API key");
    });
  });

  describe("formatValidationError", () => {
    it("should format validation error", () => {
      const result = formatValidationError("Invalid advertiser ID");
      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain("Error: Invalid advertiser ID");
    });
  });

  describe("formatSuccess", () => {
    it("should format data as JSON", () => {
      const result = formatSuccess({ name: "test" });
      expect(result.content[0]?.text).toContain('"name": "test"');
    });

    it("should include structuredContent for object data", () => {
      const data = { name: "test" };
      const result = formatSuccess(data);
      expect(result.structuredContent).toEqual(data);
    });

    it("should wrap array data in object for structuredContent", () => {
      const data = [{ id: "adv-1" }, { id: "adv-2" }];
      const result = formatSuccess(data);
      expect(result.structuredContent).toEqual({ data });
    });

    it("should not include structuredContent for non-object data", () => {
      const result = formatSuccess(null);
      expect(result.structuredContent).toBeUndefined();
    });
  });

  describe("formatSuccessWithRateLimit", () => {
    it("should append rate limit info when provided", () => {
      const result = formatSuccessWithRateLimit(
        { data: [] },
        {
          limit: 15,
          remaining: 14,
          resetAt: "2025-01-01T01:00:00Z",
        }
      );
      expect(result.content[0]?.text).toContain("14/15 requests remaining");
      expect(result.content[0]?.text).toContain("2025-01-01T01:00:00Z");
    });

    it("should format data without rate limit info", () => {
      const result = formatSuccessWithRateLimit({ data: [] });
      expect(result.content[0]?.text).not.toContain("Rate Limit");
    });

    it("should include structuredContent for object data", () => {
      const data = { data: [] };
      const result = formatSuccessWithRateLimit(data);
      expect(result.structuredContent).toEqual(data);
    });

    it("should wrap array data in object for structuredContent", () => {
      const data = ["item-1", "item-2"];
      const result = formatSuccessWithRateLimit(data);
      expect(result.structuredContent).toEqual({ data });
    });

    it("should not include structuredContent for non-object data", () => {
      const result = formatSuccessWithRateLimit(null);
      expect(result.structuredContent).toBeUndefined();
    });
  });

  describe("formatMessage", () => {
    it("should format plain message", () => {
      const result = formatMessage("Hello!");
      expect(result.content[0]?.text).toBe("Hello!");
    });
  });

  describe("buildParams", () => {
    it("should filter out undefined values", () => {
      const result = buildParams({
        advertiser_id: "adv-1",
        format: undefined,
        timezone: "UTC",
      });
      expect(result).toEqual({ advertiser_id: "adv-1", timezone: "UTC" });
    });

    it("should keep falsy but defined values", () => {
      const result = buildParams({
        name: "",
        count: 0,
        active: false,
      });
      expect(result).toEqual({ name: "", count: 0, active: false });
    });
  });

  describe("validateDateRange", () => {
    it("should return null for valid date range", () => {
      expect(validateDateRange("2025-01-01", "2025-01-30")).toBeNull();
    });

    it("should return null for exactly 45 days", () => {
      expect(validateDateRange("2025-01-01", "2025-02-15")).toBeNull();
    });

    it("should return error for range exceeding 45 days", () => {
      const result = validateDateRange("2025-01-01", "2025-03-01");
      expect(result).toContain("exceeds maximum");
      expect(result).toContain("45 days");
    });

    it("should return error for invalid start_date", () => {
      const result = validateDateRange("not-a-date", "2025-01-30");
      expect(result).toContain("Invalid start_date");
    });

    it("should return error for invalid end_date", () => {
      const result = validateDateRange("2025-01-01", "not-a-date");
      expect(result).toContain("Invalid end_date");
    });

    it("should return error when end_date is before start_date", () => {
      const result = validateDateRange("2025-01-30", "2025-01-01");
      expect(result).toContain("end_date must be after start_date");
    });
  });
});
