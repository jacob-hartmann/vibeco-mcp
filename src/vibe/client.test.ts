import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VibeClient } from "./client.js";
import type { VibeConfig } from "./types.js";

describe("VibeClient", () => {
  const mockConfig: VibeConfig = {
    apiKey: "test-api-key",
    baseUrl: "https://clear-platform.vibe.co/rest/reporting/v1",
  };

  let client: VibeClient;

  beforeEach(() => {
    client = new VibeClient(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should strip trailing slashes from base URL", () => {
      const c = new VibeClient({
        ...mockConfig,
        baseUrl: "https://api.vibe.co/v1///",
      });
      expect(c.getRateLimitInfo()).toBeUndefined();
    });
  });

  describe("getRateLimitInfo", () => {
    it("should return undefined when no requests have been made", () => {
      expect(client.getRateLimitInfo()).toBeUndefined();
    });

    it("should return rate limit info after a response with headers", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "x-rate-limit": "15",
            "x-rate-limit-left": "14",
            "x-rate-limit-reset-at": "2025-01-01T01:00:00Z",
          },
        })
      );

      await client.request({ path: "/get_advertiser_ids" });

      const info = client.getRateLimitInfo();
      expect(info).toEqual({
        limit: 15,
        remaining: 14,
        resetAt: "2025-01-01T01:00:00Z",
      });
    });

    it("should include retryAfter when present", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "rate limited" }), {
          status: 429,
          headers: {
            "x-rate-limit": "15",
            "x-rate-limit-left": "0",
            "x-rate-limit-reset-at": "2025-01-01T01:00:00Z",
            "x-rate-limit-retry-after": "3600",
          },
        })
      );

      await client.request({ path: "/create_async_report" });

      const info = client.getRateLimitInfo();
      expect(info).toEqual({
        limit: 15,
        remaining: 0,
        resetAt: "2025-01-01T01:00:00Z",
        retryAfter: 3600,
      });
    });
  });

  describe("request", () => {
    it("should handle successful GET requests", async () => {
      const mockData = { advertisers: [{ id: "adv-1" }] };
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify(mockData), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const result = await client.request({ path: "/get_advertiser_ids" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockData);
      }

      expect(fetch).toHaveBeenCalledWith(
        "https://clear-platform.vibe.co/rest/reporting/v1/get_advertiser_ids",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "X-API-KEY": "test-api-key",
          }),
        })
      );
    });

    it("should handle 400 Bad Request", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("Bad Request", { status: 400 })
      );

      const result = await client.request({
        path: "/create_async_report",
        method: "POST",
        body: {},
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
        expect(result.error.statusCode).toBe(400);
        expect(result.error.retryable).toBe(false);
      }
    });

    it("should handle 403 Forbidden", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("Forbidden", { status: 403 })
      );

      const result = await client.request({ path: "/get_advertiser_ids" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("FORBIDDEN");
        expect(result.error.retryable).toBe(false);
      }
    });

    it("should handle 404 Not Found", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("Not Found", { status: 404 })
      );

      const result = await client.request({ path: "/get_report_status" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("should handle 422 Validation Error", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("Unprocessable", { status: 422 })
      );

      const result = await client.request({
        path: "/create_async_report",
        method: "POST",
        body: {},
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
        expect(result.error.statusCode).toBe(422);
        expect(result.error.retryable).toBe(false);
      }
    });

    it("should handle 429 Rate Limited", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("Too Many Requests", { status: 429 })
      );

      const result = await client.request({
        path: "/create_async_report",
        method: "POST",
        body: {},
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("RATE_LIMITED");
        expect(result.error.retryable).toBe(true);
      }
    });

    it("should handle 500 Server Error", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("Internal Server Error", { status: 500 })
      );

      const result = await client.request({ path: "/get_advertiser_ids" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("SERVER_ERROR");
        expect(result.error.retryable).toBe(true);
      }
    });

    it("should handle network errors", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
        new Error("DNS resolution failed")
      );

      const result = await client.request({ path: "/get_advertiser_ids" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("NETWORK_ERROR");
        expect(result.error.message).toContain("DNS resolution failed");
      }
    });

    it("should include query parameters", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({}), { status: 200 })
      );

      await client.request({
        path: "/get_app_ids",
        params: { advertiser_id: "adv-1" },
      });

      expect(fetch).toHaveBeenCalledWith(
        "https://clear-platform.vibe.co/rest/reporting/v1/get_app_ids?advertiser_id=adv-1",
        expect.any(Object)
      );
    });

    it("should send JSON body for POST requests", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ report_id: "r1" }), { status: 200 })
      );

      await client.request({
        path: "/create_async_report",
        method: "POST",
        body: { advertiser_id: "adv-1" },
      });

      expect(fetch).toHaveBeenCalledWith(
        "https://clear-platform.vibe.co/rest/reporting/v1/create_async_report",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ advertiser_id: "adv-1" }),
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should handle non-JSON response body on success", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("not json", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        })
      );

      const result = await client.request({ path: "/get_advertiser_ids" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("UNKNOWN");
        expect(result.error.message).toContain("non-JSON");
      }
    });

    it("should extract apiMessage from error JSON body", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Report not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        })
      );

      const result = await client.request({ path: "/get_report_status" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("NOT_FOUND");
        expect(result.error.apiMessage).toBe("Report not found");
        expect(result.error.message).toContain("Report not found");
      }
    });

    it("should extract apiMessage from 'error' key when 'message' is absent", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Something went wrong" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      );

      const result = await client.request({ path: "/get_advertiser_ids" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("SERVER_ERROR");
        expect(result.error.apiMessage).toBe("Something went wrong");
        expect(result.error.message).toContain("Something went wrong");
      }
    });

    it("should handle other 4xx as VALIDATION_ERROR", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response("Method Not Allowed", { status: 405 })
      );

      const result = await client.request({ path: "/get_advertiser_ids" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
        expect(result.error.statusCode).toBe(405);
        expect(result.error.retryable).toBe(false);
      }
    });

    it("should handle AbortError as TIMEOUT", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "AbortError";
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(abortError);

      const result = await client.request({ path: "/get_advertiser_ids" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("TIMEOUT");
        expect(result.error.retryable).toBe(true);
      }
    });

    it("should abort fetch when timeout fires", async () => {
      vi.useFakeTimers();
      vi.spyOn(globalThis, "fetch").mockImplementationOnce(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            (init as RequestInit).signal?.addEventListener("abort", () => {
              const err = new Error("The operation was aborted");
              err.name = "AbortError";
              reject(err);
            });
          })
      );

      const resultPromise = client.request({ path: "/get_advertiser_ids" });
      await vi.advanceTimersByTimeAsync(30_001);
      const result = await resultPromise;

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("TIMEOUT");
      }
      vi.useRealTimers();
    });

    it("should handle non-Error throw", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce("string error");

      const result = await client.request({ path: "/get_advertiser_ids" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("UNKNOWN");
        expect(result.error.message).toBe("Unknown error occurred");
      }
    });

    it("should not set rate limit info when headers are missing", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      await client.request({ path: "/get_advertiser_ids" });

      expect(client.getRateLimitInfo()).toBeUndefined();
    });
  });
});
