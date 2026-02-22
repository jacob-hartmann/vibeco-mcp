/**
 * MCP Prompts Registration
 *
 * Registers all available prompts with the MCP server.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Register all prompts with the MCP server
 */
export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    "campaign-report",
    {
      title: "Campaign Report",
      description: "Guided workflow for creating a campaign performance report",
      argsSchema: {
        advertiser_id: z
          .string()
          .optional()
          .describe("Advertiser ID (will list available if omitted)"),
        start_date: z
          .string()
          .optional()
          .describe("Report start date YYYY-MM-DD (will ask if omitted)"),
        end_date: z
          .string()
          .optional()
          .describe("Report end date YYYY-MM-DD (will ask if omitted)"),
      },
    },
    (args) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text:
              `Help me create a campaign performance report on Vibe.\n\n` +
              (args.advertiser_id
                ? `Advertiser ID: ${args.advertiser_id}\n`
                : "") +
              (args.start_date ? `Start date: ${args.start_date}\n` : "") +
              `${args.end_date ? `End date: ${args.end_date}\n` : ""}\n` +
              `Steps:\n` +
              `1. ${args.advertiser_id ? "Skip" : "Use vibe.advertisers.list to list available advertisers and help me choose"}\n` +
              `2. Use vibe.campaigns.list to show campaigns for the selected advertiser\n` +
              `3. ${args.start_date && args.end_date ? "Skip" : "Help me choose a date range (max 45 days)"}\n` +
              `4. Use vibe.reports.create to create the report with appropriate metrics\n` +
              `5. Use vibe.reports.status to poll until the report is ready\n` +
              `6. Share the download URL when complete`,
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "setup-api-key",
    {
      title: "Set Up API Key",
      description: "Instructions for configuring the Vibe API key",
      argsSchema: {},
    },
    (_args) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text:
              `Help me set up my Vibe API key for the MCP server.\n\n` +
              `Steps:\n` +
              `1. Log in to your Vibe account at https://vibe.co\n` +
              `2. Navigate to Developer Tool > API Keys\n` +
              `3. Create or copy your API key\n` +
              `4. Set the VIBE_API_KEY environment variable:\n` +
              `   - For Claude Desktop: Add to your MCP server config in claude_desktop_config.json\n` +
              `   - For development: Create a .env file with VIBE_API_KEY=your_key_here\n` +
              `5. Restart the MCP server\n` +
              `6. Use vibe.ping to verify the connection`,
          },
        },
      ],
    })
  );
}
