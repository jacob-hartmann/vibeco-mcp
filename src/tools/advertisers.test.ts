import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../vibe/client-factory.js", () => ({
  getVibeClient: vi.fn(),
}));

import { getVibeClient } from "../vibe/client-factory.js";
import { registerAdvertiserTools } from "./advertisers.js";
import {
  createToolTestContext,
  mockClientSuccess,
  mockClientAuthFailure,
  mockRequestSuccess,
  mockRequestError,
} from "./__test-helpers__/tool-test-utils.js";

describe("Advertiser Tools", () => {
  const ctx = createToolTestContext();
  const mock = getVibeClient as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    registerAdvertiserTools(ctx.server);
  });

  it("should register the tool", () => {
    expect(ctx.tools.has("vibe.advertisers.list")).toBe(true);
  });

  describe("vibe.advertisers.list", () => {
    it("should handle auth failure", async () => {
      mockClientAuthFailure(mock);
      const result = await ctx.callTool("vibe.advertisers.list", {});
      expect(result).toHaveProperty("isError", true);
    });

    it("should handle API error", async () => {
      mockClientSuccess(mock, ctx);
      mockRequestError(ctx, "SERVER_ERROR", "fail");
      const result = await ctx.callTool("vibe.advertisers.list", {});
      expect(result).toHaveProperty("isError", true);
    });

    it("should return success", async () => {
      mockClientSuccess(mock, ctx);
      mockRequestSuccess(ctx, { advertisers: [{ id: "adv-1" }] });
      const result = await ctx.callTool("vibe.advertisers.list", {});
      expect(result).not.toHaveProperty("isError");
      expect(ctx.mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/get_advertiser_ids",
          method: "GET",
        })
      );
    });
  });
});
