import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../vibe/client-factory.js", () => ({
  getVibeClient: vi.fn(),
}));

import { getVibeClient } from "../vibe/client-factory.js";
import { registerReportTools } from "./reports.js";
import {
  createToolTestContext,
  mockClientSuccess,
  mockClientAuthFailure,
  mockRequestSuccess,
  mockRequestError,
} from "./__test-helpers__/tool-test-utils.js";

describe("Report Tools", () => {
  const ctx = createToolTestContext();
  const mock = getVibeClient as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    registerReportTools(ctx.server);
  });

  it("should register both tools", () => {
    expect(ctx.tools.has("vibe.reports.create")).toBe(true);
    expect(ctx.tools.has("vibe.reports.status")).toBe(true);
  });

  describe("vibe.reports.create", () => {
    const validArgs = {
      advertiser_id: "adv-1",
      start_date: "2025-01-01",
      end_date: "2025-01-15",
      metrics: ["impressions", "clicks"],
    };

    it("should handle auth failure", async () => {
      mockClientAuthFailure(mock);
      const result = await ctx.callTool("vibe.reports.create", validArgs);
      expect(result).toHaveProperty("isError", true);
    });

    it("should handle API error", async () => {
      mockClientSuccess(mock, ctx);
      mockRequestError(ctx, "RATE_LIMITED", "rate limited");
      const result = await ctx.callTool("vibe.reports.create", validArgs);
      expect(result).toHaveProperty("isError", true);
    });

    it("should return success with rate limit info", async () => {
      mockClientSuccess(mock, ctx);
      mockRequestSuccess(ctx, { report_id: "r-1" });
      (
        ctx.mockClient.getRateLimitInfo as ReturnType<typeof vi.fn>
      ).mockReturnValue({
        limit: 15,
        remaining: 14,
        resetAt: "2025-01-01T01:00:00Z",
      });

      const result = await ctx.callTool("vibe.reports.create", validArgs);
      expect(result).not.toHaveProperty("isError");

      const content = result as { content: { text: string }[] };
      expect(content.content[0]?.text).toContain("14/15");
    });

    it("should return success without rate limit info", async () => {
      mockClientSuccess(mock, ctx);
      mockRequestSuccess(ctx, { report_id: "r-1" });

      const result = await ctx.callTool("vibe.reports.create", validArgs);
      expect(result).not.toHaveProperty("isError");
    });

    it("should validate date range", async () => {
      const result = await ctx.callTool("vibe.reports.create", {
        ...validArgs,
        start_date: "2025-01-01",
        end_date: "2025-03-15",
      });
      expect(result).toHaveProperty("isError", true);
      const content = result as { content: { text: string }[] };
      expect(content.content[0]?.text).toContain("exceeds maximum");
    });

    it("should validate invalid dates", async () => {
      const result = await ctx.callTool("vibe.reports.create", {
        ...validArgs,
        start_date: "not-a-date",
      });
      expect(result).toHaveProperty("isError", true);
    });

    it("should send POST with body", async () => {
      mockClientSuccess(mock, ctx);
      mockRequestSuccess(ctx, { report_id: "r-1" });
      await ctx.callTool("vibe.reports.create", validArgs);
      expect(ctx.mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/create_async_report",
          method: "POST",
          body: expect.objectContaining({
            advertiser_id: "adv-1",
            start_date: "2025-01-01",
            end_date: "2025-01-15",
            metrics: ["impressions", "clicks"],
          }),
        })
      );
    });

    it("should include optional params when provided", async () => {
      mockClientSuccess(mock, ctx);
      mockRequestSuccess(ctx, { report_id: "r-1" });
      await ctx.callTool("vibe.reports.create", {
        ...validArgs,
        dimensions: ["campaign"],
        timezone: "UTC",
        granularity: "day",
        format: "csv",
      });
      expect(ctx.mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            dimensions: ["campaign"],
            timezone: "UTC",
            granularity: "day",
            format: "csv",
          }),
        })
      );
    });
  });

  describe("vibe.reports.status", () => {
    it("should handle auth failure", async () => {
      mockClientAuthFailure(mock);
      const result = await ctx.callTool("vibe.reports.status", {
        report_id: "r-1",
      });
      expect(result).toHaveProperty("isError", true);
    });

    it("should handle API error", async () => {
      mockClientSuccess(mock, ctx);
      mockRequestError(ctx, "NOT_FOUND", "not found");
      const result = await ctx.callTool("vibe.reports.status", {
        report_id: "r-1",
      });
      expect(result).toHaveProperty("isError", true);
    });

    it("should return success", async () => {
      mockClientSuccess(mock, ctx);
      mockRequestSuccess(ctx, { status: "done", download_url: "https://..." });
      const result = await ctx.callTool("vibe.reports.status", {
        report_id: "r-1",
      });
      expect(result).not.toHaveProperty("isError");
      expect(ctx.mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/get_report_status",
          method: "GET",
          params: { report_id: "r-1" },
        })
      );
    });
  });
});
