import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getHttpServerConfig } from "./config.js";

describe("getHttpServerConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return default values", () => {
    delete process.env["MCP_SERVER_HOST"];
    delete process.env["MCP_SERVER_PORT"];

    const config = getHttpServerConfig();

    expect(config.host).toBe("127.0.0.1");
    expect(config.port).toBe(3000);
  });

  it("should respect custom MCP_SERVER_HOST", () => {
    process.env["MCP_SERVER_HOST"] = "0.0.0.0";

    const config = getHttpServerConfig();

    expect(config.host).toBe("0.0.0.0");
  });

  it("should respect custom MCP_SERVER_PORT", () => {
    process.env["MCP_SERVER_PORT"] = "8080";

    const config = getHttpServerConfig();

    expect(config.port).toBe(8080);
  });
});
