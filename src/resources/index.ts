/**
 * MCP Resources Registration
 *
 * Registers all available resources with the MCP server.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getVibeClientOrThrow } from "../vibe/client-factory.js";

/**
 * Register all resources with the MCP server
 */
export function registerResources(server: McpServer): void {
  server.registerResource(
    "advertisers",
    "vibe://advertisers",
    {
      title: "Vibe Advertisers",
      description: "List all advertisers available to your Vibe API key",
    },
    async (_uri, extra) => {
      const client = getVibeClientOrThrow(extra);
      const result = await client.request<unknown>({
        path: "/get_advertiser_ids",
        method: "GET",
      });

      if (!result.success) {
        throw new Error(
          `Vibe API Error (${result.error.code}): ${result.error.message}`
        );
      }

      return {
        contents: [
          {
            uri: "vibe://advertisers",
            mimeType: "application/json",
            text: JSON.stringify(result.data, null, 2),
          },
        ],
      };
    }
  );

  server.registerResource(
    "advertiser-apps",
    new ResourceTemplate("vibe://advertisers/{advertiser_id}/apps", {
      list: async (extra) => {
        const client = getVibeClientOrThrow(extra);
        const result = await client.request<{
          advertisers: { id: string; name: string }[];
        }>({
          path: "/get_advertiser_ids",
          method: "GET",
        });

        if (!result.success) return { resources: [] };

        return {
          resources: result.data.advertisers.map((adv) => ({
            uri: `vibe://advertisers/${adv.id}/apps`,
            name: `${adv.name} Apps`,
          })),
        };
      },
    }),
    {
      title: "Advertiser Apps",
      description: "List apps for a specific Vibe advertiser",
    },
    async (_uri, variables, extra) => {
      const client = getVibeClientOrThrow(extra);
      const advertiserId = String(variables["advertiser_id"]);
      const result = await client.request<unknown>({
        path: "/get_app_ids",
        method: "GET",
        params: { advertiser_id: advertiserId },
      });

      if (!result.success) {
        throw new Error(
          `Vibe API Error (${result.error.code}): ${result.error.message}`
        );
      }

      return {
        contents: [
          {
            uri: `vibe://advertisers/${advertiserId}/apps`,
            mimeType: "application/json",
            text: JSON.stringify(result.data, null, 2),
          },
        ],
      };
    }
  );

  server.registerResource(
    "advertiser-campaigns",
    new ResourceTemplate("vibe://advertisers/{advertiser_id}/campaigns", {
      list: async (extra) => {
        const client = getVibeClientOrThrow(extra);
        const result = await client.request<{
          advertisers: { id: string; name: string }[];
        }>({
          path: "/get_advertiser_ids",
          method: "GET",
        });

        if (!result.success) return { resources: [] };

        return {
          resources: result.data.advertisers.map((adv) => ({
            uri: `vibe://advertisers/${adv.id}/campaigns`,
            name: `${adv.name} Campaigns`,
          })),
        };
      },
    }),
    {
      title: "Advertiser Campaigns",
      description: "List campaigns for a specific Vibe advertiser",
    },
    async (_uri, variables, extra) => {
      const client = getVibeClientOrThrow(extra);
      const advertiserId = String(variables["advertiser_id"]);
      const result = await client.request<unknown>({
        path: "/get_campaign_details",
        method: "GET",
        params: { advertiser_id: advertiserId },
      });

      if (!result.success) {
        throw new Error(
          `Vibe API Error (${result.error.code}): ${result.error.message}`
        );
      }

      return {
        contents: [
          {
            uri: `vibe://advertisers/${advertiserId}/campaigns`,
            mimeType: "application/json",
            text: JSON.stringify(result.data, null, 2),
          },
        ],
      };
    }
  );
}
