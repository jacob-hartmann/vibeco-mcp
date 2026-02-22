# Vibe MCP

A [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server for the [Vibe Streaming API](https://help.vibe.co/en/articles/8943325-vibe-api-reporting) — CTV/streaming advertising reporting.

## Features

- **8 MCP Tools** for full Vibe API coverage
- **3 MCP Resources** for advertiser, app, and campaign data
- **2 MCP Prompts** for guided workflows
- **Rate limit tracking** with proactive warnings
- **Dual transport** — stdio and HTTP (StreamableHTTP)

## Tools

| Tool                    | Description                                   |
| ----------------------- | --------------------------------------------- |
| `vibe.ping`             | Check server status and API key configuration |
| `vibe.advertisers.list` | List all advertiser IDs                       |
| `vibe.apps.list`        | List app IDs for an advertiser                |
| `vibe.campaigns.list`   | List campaign details for an advertiser       |
| `vibe.reports.create`   | Create an async report (rate limited: 15/hr)  |
| `vibe.reports.status`   | Check report status and get download URL      |
| `vibe.purchases.list`   | List purchase IDs for an advertiser           |

## Resources

| Resource             | URI                                            |
| -------------------- | ---------------------------------------------- |
| Advertisers          | `vibe://advertisers`                           |
| Advertiser Apps      | `vibe://advertisers/{advertiser_id}/apps`      |
| Advertiser Campaigns | `vibe://advertisers/{advertiser_id}/campaigns` |

## Setup

1. Get your API key from Vibe account > Developer Tool > API Keys
2. Set the `VIBE_API_KEY` environment variable
3. Add to your MCP client configuration

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vibe": {
      "command": "node",
      "args": ["path/to/vibeco-mcp/dist/index.js"],
      "env": {
        "VIBE_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Development

```bash
cp .env.example .env
# Edit .env with your API key
pnpm install
pnpm dev
```

## Scripts

| Script          | Description                          |
| --------------- | ------------------------------------ |
| `pnpm dev`      | Run in development mode (stdio)      |
| `pnpm dev:http` | Run in development mode (HTTP)       |
| `pnpm build`    | Build for production                 |
| `pnpm test`     | Run tests                            |
| `pnpm check`    | Run typecheck + lint + format + test |
| `pnpm inspect`  | Open MCP Inspector                   |

## License

MIT © Jacob Hartmann
