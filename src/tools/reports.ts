/**
 * Vibe Report Tools
 *
 * vibe.reports.create — Create an async report (POST, rate limited)
 * vibe.reports.status — Check report status (GET)
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getVibeClient } from "../vibe/client-factory.js";
import {
  formatAuthError,
  formatError,
  formatSuccessWithRateLimit,
  formatSuccess,
  formatValidationError,
  vibeOutputSchema,
  buildParams,
  validateDateRange,
} from "./utils.js";

export function registerReportTools(server: McpServer): void {
  server.registerTool(
    "vibe.reports.create",
    {
      title: "Create Report",
      description:
        "Create an async report for a Vibe advertiser. Returns a report_id to check status with vibe.reports.status. " +
        "Rate limited to 15 requests per hour.",
      inputSchema: z.object({
        advertiser_id: z.string().describe("The advertiser ID"),
        start_date: z.string().describe("Report start date (YYYY-MM-DD)"),
        end_date: z.string().describe("Report end date (YYYY-MM-DD)"),
        metrics: z
          .array(z.string())
          .describe("Metrics to include in the report"),
        dimensions: z
          .array(z.string())
          .optional()
          .describe("Dimensions to group by"),
        timezone: z.string().optional().describe("Timezone for the report"),
        granularity: z
          .enum(["hour", "day", "week", "month"])
          .optional()
          .describe("Time granularity"),
        attribution_window: z
          .string()
          .optional()
          .describe("Attribution window"),
        event_time_selection: z
          .enum(["impression_time", "event_time"])
          .optional()
          .describe("Event time selection mode"),
        filters: z
          .array(
            z.object({
              dimension: z.string(),
              values: z.array(z.string()),
            })
          )
          .optional()
          .describe("Filters to apply"),
        format: z
          .enum(["json", "csv"])
          .optional()
          .describe("Report output format"),
      }),
      outputSchema: vibeOutputSchema,
      annotations: {
        readOnlyHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args, extra) => {
      // Validate date range
      const dateError = validateDateRange(args.start_date, args.end_date);
      if (dateError) return formatValidationError(dateError);

      const clientResult = getVibeClient(extra);
      if (!clientResult.success) return formatAuthError(clientResult.error);

      const body = buildParams({
        advertiser_id: args.advertiser_id,
        start_date: args.start_date,
        end_date: args.end_date,
        metrics: args.metrics,
        dimensions: args.dimensions,
        timezone: args.timezone,
        granularity: args.granularity,
        attribution_window: args.attribution_window,
        event_time_selection: args.event_time_selection,
        filters: args.filters,
        format: args.format,
      });

      const result = await clientResult.client.request<unknown>({
        path: "/create_async_report",
        method: "POST",
        body,
      });

      if (!result.success) return formatError(result.error, "report");

      // Include rate limit info since this endpoint is rate limited
      const rateLimitInfo = clientResult.client.getRateLimitInfo();
      return formatSuccessWithRateLimit(result.data, rateLimitInfo);
    }
  );

  server.registerTool(
    "vibe.reports.status",
    {
      title: "Report Status",
      description:
        "Check the status of an async report. Returns status and download URL when complete.",
      inputSchema: z.object({
        report_id: z.string().describe("The report ID to check"),
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
        path: "/get_report_status",
        method: "GET",
        params: { report_id: args.report_id },
      });

      if (!result.success) return formatError(result.error, "report");
      return formatSuccess(result.data);
    }
  );
}
