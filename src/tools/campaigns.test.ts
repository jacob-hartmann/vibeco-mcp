import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../vibe/client-factory.js", () => ({
  getVibeClient: vi.fn(),
}));

import { getVibeClient } from "../vibe/client-factory.js";
import { registerCampaignTools } from "./campaigns.js";
import {
  createToolTestContext,
  mockClientSuccess,
  mockClientAuthFailure,
  mockRequestSuccess,
  mockRequestError,
} from "./__test-helpers__/tool-test-utils.js";

describe("Campaign Tools", () => {
  const ctx = createToolTestContext();
  const mock = getVibeClient as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    registerCampaignTools(ctx.server);
  });

  it("should register the tool", () => {
    expect(ctx.tools.has("vibe.campaigns.list")).toBe(true);
  });

  describe("vibe.campaigns.list", () => {
    it("should handle auth failure", async () => {
      mockClientAuthFailure(mock);
      const result = await ctx.callTool("vibe.campaigns.list", {
        advertiser_id: "adv-1",
      });
      expect(result).toHaveProperty("isError", true);
    });

    it("should handle API error", async () => {
      mockClientSuccess(mock, ctx);
      mockRequestError(ctx, "SERVER_ERROR", "fail");
      const result = await ctx.callTool("vibe.campaigns.list", {
        advertiser_id: "adv-1",
      });
      expect(result).toHaveProperty("isError", true);
    });

    it("should return success", async () => {
      mockClientSuccess(mock, ctx);
      mockRequestSuccess(ctx, { campaigns: [{ id: "c-1" }] });
      const result = await ctx.callTool("vibe.campaigns.list", {
        advertiser_id: "adv-1",
      });
      expect(result).not.toHaveProperty("isError");
      expect(ctx.mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/get_campaign_details",
          method: "GET",
          params: { advertiser_id: "adv-1" },
        })
      );
    });
  });
});
