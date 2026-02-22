import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../vibe/client-factory.js", () => ({
  getVibeClient: vi.fn(),
}));

import { getVibeClient } from "../vibe/client-factory.js";
import { registerAppTools } from "./apps.js";
import {
  createToolTestContext,
  mockClientSuccess,
  mockClientAuthFailure,
  mockRequestSuccess,
  mockRequestError,
} from "./__test-helpers__/tool-test-utils.js";

describe("App Tools", () => {
  const ctx = createToolTestContext();
  const mock = getVibeClient as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    registerAppTools(ctx.server);
  });

  it("should register the tool", () => {
    expect(ctx.tools.has("vibe.apps.list")).toBe(true);
  });

  describe("vibe.apps.list", () => {
    it("should handle auth failure", async () => {
      mockClientAuthFailure(mock);
      const result = await ctx.callTool("vibe.apps.list", {
        advertiser_id: "adv-1",
      });
      expect(result).toHaveProperty("isError", true);
    });

    it("should handle API error", async () => {
      mockClientSuccess(mock, ctx);
      mockRequestError(ctx, "SERVER_ERROR", "fail");
      const result = await ctx.callTool("vibe.apps.list", {
        advertiser_id: "adv-1",
      });
      expect(result).toHaveProperty("isError", true);
    });

    it("should return success", async () => {
      mockClientSuccess(mock, ctx);
      mockRequestSuccess(ctx, { apps: [{ id: "app-1" }] });
      const result = await ctx.callTool("vibe.apps.list", {
        advertiser_id: "adv-1",
      });
      expect(result).not.toHaveProperty("isError");
      expect(ctx.mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/get_app_ids",
          method: "GET",
          params: { advertiser_id: "adv-1" },
        })
      );
    });
  });
});
