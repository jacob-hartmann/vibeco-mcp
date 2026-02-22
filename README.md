# Vibe.co MCP Server

[![CI](https://github.com/jacob-hartmann/vibeco-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/jacob-hartmann/vibeco-mcp/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/jacob-hartmann/vibeco-mcp/badge.svg?branch=main)](https://coveralls.io/github/jacob-hartmann/vibeco-mcp?branch=main)
[![CodeQL](https://github.com/jacob-hartmann/vibeco-mcp/actions/workflows/codeql.yml/badge.svg)](https://github.com/jacob-hartmann/vibeco-mcp/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/jacob-hartmann/vibeco-mcp/badge)](https://securityscorecards.dev/viewer/?uri=github.com/jacob-hartmann/vibeco-mcp)
[![npm version](https://img.shields.io/npm/v/vibeco-mcp)](https://www.npmjs.com/package/vibeco-mcp)
[![npm downloads](https://img.shields.io/npm/dm/vibeco-mcp)](https://www.npmjs.com/package/vibeco-mcp)
[![License](https://img.shields.io/github/license/jacob-hartmann/vibeco-mcp)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for the [Vibe](https://vibe.co/) CTV/streaming advertising platform.

This server allows AI assistants (like Claude) to interact with your Vibe advertising data securely via the [Vibe Streaming API](https://help.vibe.co/en/articles/8943325-vibe-api-reporting).

## Quick Start

### Prerequisites

- Node.js v22 or higher
- A Vibe account with API access
- A Vibe API key (see [Step 1](#step-1-get-a-vibe-api-key))

### Step 1: Get a Vibe API Key

1. Log in to your [Vibe](https://vibe.co/) account
2. Navigate to **Developer Tool > API Keys**
3. Create or copy your API key

### Step 2: Configure Your MCP Client

Choose the setup that matches your MCP client:

#### Claude Desktop (Recommended)

Add to your `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "vibe": {
      "command": "npx",
      "args": ["-y", "vibeco-mcp"],
      "env": {
        "VIBE_API_KEY": "your-api-key"
      }
    }
  }
}
```

#### Claude Code (CLI)

Add to your Claude Code MCP settings (`~/.claude/mcp.json` or project-level):

```json
{
  "mcpServers": {
    "vibe": {
      "command": "npx",
      "args": ["-y", "vibeco-mcp"],
      "env": {
        "VIBE_API_KEY": "your-api-key"
      }
    }
  }
}
```

#### Cursor

In Cursor settings, add an MCP server:

```json
{
  "mcpServers": {
    "vibe": {
      "command": "npx",
      "args": ["-y", "vibeco-mcp"],
      "env": {
        "VIBE_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Configuration Reference

### Environment Variables

| Variable            | Required | Default                                                  | Description                            |
| ------------------- | -------- | -------------------------------------------------------- | -------------------------------------- |
| `VIBE_API_KEY`      | Yes      | -                                                        | Vibe API key                           |
| `VIBE_API_BASE_URL` | No       | `https://clear-platform.vibe.co/rest/reporting/v1`       | API base URL (override for testing)    |
| `MCP_TRANSPORT`     | No       | `stdio`                                                  | Transport mode: `stdio` or `http`      |
| `MCP_SERVER_HOST`   | No       | `127.0.0.1`                                              | Host to bind the HTTP server to        |
| `MCP_SERVER_PORT`   | No       | `3000`                                                   | Port for the HTTP server               |

## Features

### Tools

The server provides **8 tools** for full Vibe API coverage:

#### Connectivity

| Tool        | Description                                   |
| ----------- | --------------------------------------------- |
| `vibe.ping` | Check server status and API key configuration |

#### Advertisers

| Tool                    | Description                             |
| ----------------------- | --------------------------------------- |
| `vibe.advertisers.list` | List all advertiser IDs                 |

#### Apps

| Tool             | Description                        |
| ---------------- | ---------------------------------- |
| `vibe.apps.list` | List app IDs for an advertiser     |

#### Campaigns

| Tool                   | Description                              |
| ---------------------- | ---------------------------------------- |
| `vibe.campaigns.list`  | List campaign details for an advertiser  |

#### Reports

| Tool                   | Description                                  |
| ---------------------- | -------------------------------------------- |
| `vibe.reports.create`  | Create an async report (rate limited: 15/hr) |
| `vibe.reports.status`  | Check report status and get download URL     |

#### Purchases

| Tool                    | Description                            |
| ----------------------- | -------------------------------------- |
| `vibe.purchases.list`   | List purchase IDs for an advertiser    |

### Resources

The server exposes data as MCP resources:

#### Static Resources

| Resource URI           | Description              |
| ---------------------- | ------------------------ |
| `vibe://advertisers`   | List all advertiser IDs  |

#### Resource Templates

| Resource URI                                   | Description                              |
| ---------------------------------------------- | ---------------------------------------- |
| `vibe://advertisers/{advertiser_id}/apps`      | App IDs for a specific advertiser        |
| `vibe://advertisers/{advertiser_id}/campaigns` | Campaign details for a specific advertiser |

### Prompts

The server provides guided prompts for common workflows:

| Prompt            | Description                                                    |
| ----------------- | -------------------------------------------------------------- |
| `campaign-report` | Guided workflow for creating a campaign performance report      |
| `setup-api-key`   | Instructions for configuring the Vibe API key                  |

## Development

### Setup

```bash
# Clone the repo
git clone https://github.com/jacob-hartmann/vibeco-mcp.git
cd vibeco-mcp

# Use the Node.js version from .nvmrc
# (macOS/Linux nvm): nvm install && nvm use
# (Windows nvm-windows): nvm install 22 && nvm use 22
nvm install
nvm use

# Install dependencies
pnpm install

# Copy .env.example and configure
cp .env.example .env
# Edit .env with your API key
```

### Running Locally

```bash
# Development mode (auto-reload)
pnpm dev

# Production build
pnpm build

# Production run
pnpm start
```

### Debugging

You can use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) to debug the server:

```bash
# Run from source
pnpm inspect

# Run from built output
pnpm inspect:dist
```

`pnpm inspect` loads `.env` automatically via `dotenv` (see `.env.example`).

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to contribute to this project.

## Security

See [SECURITY.md](./SECURITY.md) for security policy and reporting vulnerabilities.

## Support

This is a community project provided "as is" with **no guaranteed support**. See [SUPPORT.md](./SUPPORT.md) for details.

## License

MIT © Jacob Hartmann
