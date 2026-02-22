import { describe, it, expect, vi } from "vitest";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPrompts } from "./index.js";

type PromptHandler = (args: Record<string, string | undefined>) => any;

interface RegisteredPrompt {
  name: string;
  config: any;
  handler: PromptHandler;
}

function setupPrompts() {
  const prompts: RegisteredPrompt[] = [];

  const server = {
    registerPrompt: vi.fn(
      (name: string, config: any, handler: PromptHandler) => {
        prompts.push({ name, config, handler });
      }
    ),
  } as unknown as McpServer;

  registerPrompts(server);
  return { server, prompts };
}

describe("registerPrompts", () => {
  it("should register all 2 prompts", () => {
    const { server } = setupPrompts();
    expect(server.registerPrompt).toHaveBeenCalledTimes(2);
  });

  describe("campaign-report", () => {
    it("should include advertiser_id when provided", () => {
      const { prompts } = setupPrompts();
      const prompt = prompts.find((p) => p.name === "campaign-report")!;

      const result = prompt.handler({
        advertiser_id: "adv-1",
        start_date: "2025-01-01",
        end_date: "2025-01-31",
      });

      const text = result.messages[0].content.text;
      expect(text).toContain("adv-1");
      expect(text).toContain("2025-01-01");
      expect(text).toContain("2025-01-31");
      expect(text).toContain("Skip");
    });

    it("should ask for advertiser when not provided", () => {
      const { prompts } = setupPrompts();
      const prompt = prompts.find((p) => p.name === "campaign-report")!;

      const result = prompt.handler({
        advertiser_id: undefined,
        start_date: undefined,
        end_date: undefined,
      });

      const text = result.messages[0].content.text;
      expect(text).toContain("vibe.advertisers.list");
      expect(text).toContain("help me choose");
    });
  });

  describe("setup-api-key", () => {
    it("should include setup instructions", () => {
      const { prompts } = setupPrompts();
      const prompt = prompts.find((p) => p.name === "setup-api-key")!;

      const result = prompt.handler({});

      const text = result.messages[0].content.text;
      expect(text).toContain("VIBE_API_KEY");
      expect(text).toContain("Developer Tool");
      expect(text).toContain("vibe.ping");
    });
  });
});
