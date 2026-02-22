import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPingTool } from "./ping.js";

vi.mock("../vibe/auth.js", () => ({
  isVibeConfigured: vi.fn(),
}));

import { isVibeConfigured } from "../vibe/auth.js";

describe("vibe.ping tool", () => {
  let server: McpServer;
  let registeredTools: Map<
    string,
    {
      description: string;
      handler: (params: Record<string, unknown>, extra: unknown) => unknown;
    }
  >;

  beforeEach(() => {
    vi.clearAllMocks();

    registeredTools = new Map();
    server = {
      registerTool: vi.fn(
        (
          name: string,
          config: { description: string },
          handler: (params: Record<string, unknown>, extra: unknown) => unknown
        ) => {
          registeredTools.set(name, {
            description: config.description,
            handler,
          });
        }
      ),
    } as unknown as McpServer;

    registerPingTool(server);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should register the vibe.ping tool", () => {
    expect(server.registerTool).toHaveBeenCalledTimes(1);
    expect(registeredTools.has("vibe.ping")).toBe(true);
  });

  it("should return success when credentials are configured", () => {
    vi.mocked(isVibeConfigured).mockReturnValue(true);

    const tool = registeredTools.get("vibe.ping");
    expect(tool).toBeDefined();
    if (!tool) return;

    const result = tool.handler({}, {}) as {
      isError?: boolean;
      content: { type: string; text?: string }[];
    };

    expect(result.isError).toBeUndefined();
    const text = result.content.find((c) => c.type === "text")?.text ?? "";
    expect(text).toContain("running");
    expect(text).toContain("configured");
  });

  it("should return error when credentials are not configured", () => {
    vi.mocked(isVibeConfigured).mockReturnValue(false);

    const tool = registeredTools.get("vibe.ping");
    expect(tool).toBeDefined();
    if (!tool) return;

    const result = tool.handler({}, {}) as {
      isError?: boolean;
      content: { type: string; text?: string }[];
    };

    expect(result.isError).toBe(true);
    const text = result.content.find((c) => c.type === "text")?.text ?? "";
    expect(text).toContain("not configured");
    expect(text).toContain("VIBE_API_KEY");
  });
});
