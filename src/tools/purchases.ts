/**
 * vibe.purchases.list Tool
 *
 * List purchase IDs for a specific advertiser.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getVibeClient } from "../vibe/client-factory.js";
import {
  formatAuthError,
  formatError,
  formatSuccess,
  vibeOutputSchema,
  buildParams,
} from "./utils.js";

export function registerPurchaseTools(server: McpServer): void {
  server.registerTool(
    "vibe.purchases.list",
    {
      title: "List Purchases",
      description: "List purchase IDs for a specific advertiser.",
      inputSchema: z.object({
        advertiser_id: z.string().describe("The advertiser ID"),
        start_date: z
          .string()
          .optional()
          .describe("Filter start date (YYYY-MM-DD)"),
        end_date: z
          .string()
          .optional()
          .describe("Filter end date (YYYY-MM-DD)"),
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

      const body = buildParams({
        advertiser_id: args.advertiser_id,
        start_date: args.start_date,
        end_date: args.end_date,
      });

      const result = await clientResult.client.request<unknown>({
        path: "/get_purchase_ids",
        method: "POST",
        body,
      });

      if (!result.success) return formatError(result.error, "purchase");
      return formatSuccess(result.data);
    }
  );
}
