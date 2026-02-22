/**
 * vibe.ping Tool
 *
 * A lightweight smoke test tool that confirms the MCP server is running
 * and that Vibe API credentials are configured.
 *
 * This tool does NOT make any API calls to Vibe.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { isVibeConfigured } from "../vibe/auth.js";
import { formatMessage } from "./utils.js";

/**
 * Register the vibe.ping tool
 */
export function registerPingTool(server: McpServer): void {
  server.registerTool(
    "vibe.ping",
    {
      title: "Ping",
      description:
        "Check that the Vibe MCP server is running and that API credentials " +
        "are configured. Does not make any API calls to Vibe.",
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (_args, _extra) => {
      const configured = isVibeConfigured();

      if (!configured) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text:
                "Vibe MCP server is running, but API credentials are not configured.\n\n" +
                "Please set the following environment variable:\n" +
                "  - VIBE_API_KEY: Your Vibe API key (from Vibe account > Developer Tool > API Keys)",
            },
          ],
        };
      }

      return formatMessage(
        "Vibe MCP server is running and API credentials are configured."
      );
    }
  );
}
