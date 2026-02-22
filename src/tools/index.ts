/**
 * MCP Tools Registration
 *
 * Registers all available tools with the MCP server.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerPingTool } from "./ping.js";
import { registerAdvertiserTools } from "./advertisers.js";
import { registerAppTools } from "./apps.js";
import { registerCampaignTools } from "./campaigns.js";
import { registerReportTools } from "./reports.js";
import { registerPurchaseTools } from "./purchases.js";

/**
 * Register all tools with the MCP server
 */
export function registerTools(server: McpServer): void {
  registerPingTool(server);
  registerAdvertiserTools(server);
  registerAppTools(server);
  registerCampaignTools(server);
  registerReportTools(server);
  registerPurchaseTools(server);
}
