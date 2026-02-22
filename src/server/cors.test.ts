import { describe, expect, it } from "vitest";
import { isCorsAllowedPath, matchesAllowedPathBoundary } from "./cors.js";

describe("isCorsAllowedPath", () => {
  it("allows the MCP endpoint", () => {
    expect(isCorsAllowedPath("/mcp")).toBe(true);
  });

  it("allows MCP subpaths", () => {
    expect(isCorsAllowedPath("/mcp/")).toBe(true);
    expect(isCorsAllowedPath("/mcp/something")).toBe(true);
  });

  it("rejects prefix-bypass paths", () => {
    expect(isCorsAllowedPath("/mcp-admin")).toBe(false);
  });

  it("rejects unrelated endpoints", () => {
    expect(isCorsAllowedPath("/")).toBe(false);
    expect(isCorsAllowedPath("/api")).toBe(false);
    expect(isCorsAllowedPath("/health")).toBe(false);
  });
});

describe("matchesAllowedPathBoundary", () => {
  it("matches exact path", () => {
    expect(matchesAllowedPathBoundary("/mcp", "/mcp")).toBe(true);
  });

  it("matches subpath", () => {
    expect(matchesAllowedPathBoundary("/mcp/foo", "/mcp")).toBe(true);
  });

  it("rejects prefix bypass", () => {
    expect(matchesAllowedPathBoundary("/mcp-admin", "/mcp")).toBe(false);
  });

  it("matches when allowed path ends with slash", () => {
    expect(matchesAllowedPathBoundary("/foo/bar", "/foo/")).toBe(true);
    expect(matchesAllowedPathBoundary("/foo/", "/foo/")).toBe(true);
  });

  it("rejects when request path does not start with slash-ending allowed path", () => {
    expect(matchesAllowedPathBoundary("/other", "/foo/")).toBe(false);
  });
});
