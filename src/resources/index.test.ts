import { describe, it, expect, vi, beforeEach } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

vi.mock("../vibe/client-factory.js", () => ({
  getVibeClientOrThrow: vi.fn(),
}));

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  ResourceTemplate: class ResourceTemplate {
    constructor(
      public uri: string,
      public opts: any
    ) {}
  },
}));

import { registerResources } from "./index.js";
import { getVibeClientOrThrow } from "../vibe/client-factory.js";

type ResourceHandler = (...args: any[]) => Promise<any>;

interface RegisteredResource {
  name: string;
  template: any;
  metadata: any;
  handler: ResourceHandler;
}

function setupResources() {
  const resources: RegisteredResource[] = [];

  const server = {
    registerResource: vi.fn((...args: any[]) => {
      resources.push({
        name: args[0],
        template: args[1],
        metadata: args[2],
        handler: args[3],
      });
    }),
  } as unknown as McpServer;

  registerResources(server);
  return { server, resources };
}

function createMockClient(requestResult: any) {
  const client = {
    request: vi.fn().mockResolvedValue(requestResult),
  };
  (getVibeClientOrThrow as ReturnType<typeof vi.fn>).mockReturnValue(client);
  return client;
}

describe("registerResources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register all 3 resources", () => {
    const { server } = setupResources();
    expect(server.registerResource).toHaveBeenCalledTimes(3);
  });

  describe("advertisers resource", () => {
    it("should return advertisers data on success", async () => {
      const { resources } = setupResources();
      const res = resources.find((r) => r.name === "advertisers")!;

      createMockClient({ success: true, data: { advertisers: [] } });

      const result = await res.handler("vibe://advertisers", {} as any);
      expect(result.contents[0].uri).toBe("vibe://advertisers");
      expect(result.contents[0].mimeType).toBe("application/json");
    });

    it("should throw on API error", async () => {
      const { resources } = setupResources();
      const res = resources.find((r) => r.name === "advertisers")!;

      createMockClient({
        success: false,
        error: { code: "SERVER_ERROR", message: "fail" },
      });

      await expect(
        res.handler("vibe://advertisers", {} as any)
      ).rejects.toThrow("Vibe API Error");
    });
  });

  describe("advertiser-apps resource", () => {
    it("should return apps on success", async () => {
      const { resources } = setupResources();
      const res = resources.find((r) => r.name === "advertiser-apps")!;

      createMockClient({ success: true, data: { apps: [] } });

      const result = await res.handler(
        "vibe://advertisers/adv-1/apps",
        { advertiser_id: "adv-1" },
        {} as any
      );
      expect(result.contents[0].uri).toBe("vibe://advertisers/adv-1/apps");
    });

    it("should throw on API error", async () => {
      const { resources } = setupResources();
      const res = resources.find((r) => r.name === "advertiser-apps")!;

      createMockClient({
        success: false,
        error: { code: "NOT_FOUND", message: "not found" },
      });

      await expect(
        res.handler(
          "vibe://advertisers/adv-1/apps",
          { advertiser_id: "adv-1" },
          {} as any
        )
      ).rejects.toThrow("Vibe API Error");
    });

    it("should list advertisers for template", async () => {
      const { resources } = setupResources();
      const res = resources.find((r) => r.name === "advertiser-apps")!;

      createMockClient({
        success: true,
        data: { advertisers: [{ id: "adv-1", name: "Advertiser 1" }] },
      });

      const listResult = await res.template.opts.list({} as any);
      expect(listResult.resources).toEqual([
        { uri: "vibe://advertisers/adv-1/apps", name: "Advertiser 1 Apps" },
      ]);
    });

    it("should return empty list on API error in template list", async () => {
      const { resources } = setupResources();
      const res = resources.find((r) => r.name === "advertiser-apps")!;

      createMockClient({
        success: false,
        error: { code: "SERVER_ERROR", message: "fail" },
      });

      const listResult = await res.template.opts.list({} as any);
      expect(listResult.resources).toEqual([]);
    });
  });

  describe("advertiser-campaigns resource", () => {
    it("should return campaigns on success", async () => {
      const { resources } = setupResources();
      const res = resources.find((r) => r.name === "advertiser-campaigns")!;

      createMockClient({ success: true, data: { campaigns: [] } });

      const result = await res.handler(
        "vibe://advertisers/adv-1/campaigns",
        { advertiser_id: "adv-1" },
        {} as any
      );
      expect(result.contents[0].uri).toBe("vibe://advertisers/adv-1/campaigns");
    });

    it("should throw on API error", async () => {
      const { resources } = setupResources();
      const res = resources.find((r) => r.name === "advertiser-campaigns")!;

      createMockClient({
        success: false,
        error: { code: "SERVER_ERROR", message: "fail" },
      });

      await expect(
        res.handler(
          "vibe://advertisers/adv-1/campaigns",
          { advertiser_id: "adv-1" },
          {} as any
        )
      ).rejects.toThrow("Vibe API Error");
    });

    it("should list advertisers for template", async () => {
      const { resources } = setupResources();
      const res = resources.find((r) => r.name === "advertiser-campaigns")!;

      createMockClient({
        success: true,
        data: { advertisers: [{ id: "adv-1", name: "Advertiser 1" }] },
      });

      const listResult = await res.template.opts.list({} as any);
      expect(listResult.resources).toEqual([
        {
          uri: "vibe://advertisers/adv-1/campaigns",
          name: "Advertiser 1 Campaigns",
        },
      ]);
    });

    it("should return empty list on API error in template list", async () => {
      const { resources } = setupResources();
      const res = resources.find((r) => r.name === "advertiser-campaigns")!;

      createMockClient({
        success: false,
        error: { code: "SERVER_ERROR", message: "fail" },
      });

      const listResult = await res.template.opts.list({} as any);
      expect(listResult.resources).toEqual([]);
    });
  });
});
