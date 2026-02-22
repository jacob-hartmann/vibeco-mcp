/**
 * vibe.apps.list Tool
 *
 * List app IDs for a specific advertiser.
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

export function registerAppTools(server: McpServer): void {
  server.registerTool(
    "vibe.apps.list",
    {
      title: "List Apps",
      description: "List all app IDs for a specific advertiser.",
      inputSchema: z.object({
        advertiser_id: z.string().describe("The advertiser ID"),
      }),
      outputSchema: vibeOutputSchema,
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args, extra) => {
      const clientResult = getVibeClient(extra);
      if (!clientResult.success) return formatAuthError(clientResult.error);

      const result = await clientResult.client.request<unknown>({
        path: "/get_app_ids",
        method: "GET",
        params: { advertiser_id: args.advertiser_id },
      });

      if (!result.success) return formatError(result.error, "app");
      return formatSuccess(result.data);
    }
  );
}
