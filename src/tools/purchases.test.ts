import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../vibe/client-factory.js", () => ({
  getVibeClient: vi.fn(),
}));

import { getVibeClient } from "../vibe/client-factory.js";
import { registerPurchaseTools } from "./purchases.js";
import {
  createToolTestContext,
  mockClientSuccess,
  mockClientAuthFailure,
  mockRequestSuccess,
  mockRequestError,
} from "./__test-helpers__/tool-test-utils.js";

describe("Purchase Tools", () => {
  const ctx = createToolTestContext();
  const mock = getVibeClient as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    registerPurchaseTools(ctx.server);
  });

  it("should register the tool", () => {
    expect(ctx.tools.has("vibe.purchases.list")).toBe(true);
  });

  describe("vibe.purchases.list", () => {
    it("should handle auth failure", async () => {
      mockClientAuthFailure(mock);
      const result = await ctx.callTool("vibe.purchases.list", {
        advertiser_id: "adv-1",
      });
      expect(result).toHaveProperty("isError", true);
    });

    it("should handle API error", async () => {
      mockClientSuccess(mock, ctx);
      mockRequestError(ctx, "SERVER_ERROR", "fail");
      const result = await ctx.callTool("vibe.purchases.list", {
        advertiser_id: "adv-1",
      });
      expect(result).toHaveProperty("isError", true);
    });

    it("should return success with required params only", async () => {
      mockClientSuccess(mock, ctx);
      mockRequestSuccess(ctx, { purchases: [{ id: "p-1" }] });
      const result = await ctx.callTool("vibe.purchases.list", {
        advertiser_id: "adv-1",
      });
      expect(result).not.toHaveProperty("isError");
      expect(ctx.mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/get_purchase_ids",
          method: "POST",
          body: { advertiser_id: "adv-1" },
        })
      );
    });

    it("should include optional date params when provided", async () => {
      mockClientSuccess(mock, ctx);
      mockRequestSuccess(ctx, { purchases: [] });
      await ctx.callTool("vibe.purchases.list", {
        advertiser_id: "adv-1",
        start_date: "2025-01-01",
        end_date: "2025-01-31",
      });
      expect(ctx.mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            advertiser_id: "adv-1",
            start_date: "2025-01-01",
            end_date: "2025-01-31",
          }),
        })
      );
    });
  });
});
