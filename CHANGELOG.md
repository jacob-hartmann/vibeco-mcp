# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-11-26

First stable release. The tool, prompt and resource surface is unchanged from
`0.1.0-rc.1`. `0.1.0-rc.2` was tagged but never published to npm.

### Added

- Initial release of the Vibe.co MCP server
- MCP tools for CTV/streaming advertising reporting via the Vibe API
- MCP resources for campaign and performance data
- Stdio and HTTP transport support
- Comprehensive test suite with coverage

### Changed

- Updated runtime dependencies: `@modelcontextprotocol/sdk` 1.32.2, `zod` 4.6.7,
  `express` 5.3, `express-rate-limit` 8.7, `helmet` 8.3, `dotenv` 17.4
- Tool input-validation errors (MCP error -32602) now come from the updated
  SDK as a readable message, for example
  `Invalid input: expected string, received undefined at advertiser_id`,
  instead of a JSON dump of the validation issues
- HTTP transport: the rate limiter uses express-rate-limit's `limit` option
  (renamed from `max`); the limit is unchanged at 100 requests per minute

### Security

- Resolved all known advisories in production dependencies (`pnpm audit --prod`
  is clean), including issues in `@modelcontextprotocol/sdk`, `zod`, `hono`,
  `@hono/node-server`, `fast-uri`, `path-to-regexp`, `body-parser` and
  `proxy-addr` that affected `0.1.0-rc.1`
