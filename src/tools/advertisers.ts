/**
 * vibe.advertisers.list Tool
 *
 * List all advertiser IDs available to the API key.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getVibeClient } from "../vibe/client-factory.js";
import {
  formatAuthError,
  formatError,
  formatSuccess,
  vibeOutputSchema,
} from "./utils.js";

export function registerAdvertiserTools(server: McpServer): void {
  server.registerTool(
    "vibe.advertisers.list",
    {
      title: "List Advertisers",
      description: "List all advertiser IDs available to your Vibe API key.",
      inputSchema: z.object({}),
      outputSchema: vibeOutputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (_args, extra) => {
      const clientResult = getVibeClient(extra);
      if (!clientResult.success) return formatAuthError(clientResult.error);

      const result = await clientResult.client.request<unknown>({
        path: "/get_advertiser_ids",
        method: "GET",
      });

      if (!result.success) return formatError(result.error, "advertiser");
      return formatSuccess(result.data);
    }
  );
}
