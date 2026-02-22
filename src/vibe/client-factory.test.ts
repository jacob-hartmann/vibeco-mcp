import { describe, it, expect, vi, beforeEach } from "vitest";

describe("client-factory", () => {
  const mockExtra = {} as any;

  let getVibeClient: typeof import("./client-factory.js").getVibeClient;
  let getVibeClientOrThrow: typeof import("./client-factory.js").getVibeClientOrThrow;
  let mockLoadVibeConfig: ReturnType<typeof vi.fn>;
  let clientInstances: any[];

  beforeEach(async () => {
    vi.resetModules();
    clientInstances = [];

    mockLoadVibeConfig = vi.fn().mockReturnValue({
      apiKey: "key",
      baseUrl: "https://clear-platform.vibe.co/rest/reporting/v1",
    });

    vi.doMock("./auth.js", () => {
      class VibeAuthError extends Error {
        code: string;
        constructor(message: string, code: string) {
          super(message);
          this.name = "VibeAuthError";
          this.code = code;
        }
      }
      return {
        loadVibeConfig: mockLoadVibeConfig,
        VibeAuthError,
      };
    });

    vi.doMock("./client.js", () => {
      return {
        VibeClient: class MockVibeClient {
          constructor(_config: any) {
            clientInstances.push(this);
          }
          getRateLimitInfo() {
            return undefined;
          }
          request = vi.fn();
        },
      };
    });

    const mod = await import("./client-factory.js");
    getVibeClient = mod.getVibeClient;
    getVibeClientOrThrow = mod.getVibeClientOrThrow;

    process.env["VIBE_API_KEY"] = "key";
    delete process.env["VIBE_API_BASE_URL"];
  });

  it("should create a client on first call (cache miss)", () => {
    const result = getVibeClient(mockExtra);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.client).toBeDefined();
    }
    expect(clientInstances).toHaveLength(1);
  });

  it("should return cached client on second call (cache hit)", () => {
    const result1 = getVibeClient(mockExtra);
    const result2 = getVibeClient(mockExtra);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    if (result1.success && result2.success) {
      expect(result1.client).toBe(result2.client);
    }
    expect(clientInstances).toHaveLength(1);
  });

  it("should invalidate cache when env vars change", () => {
    getVibeClient(mockExtra);
    expect(clientInstances).toHaveLength(1);

    process.env["VIBE_API_KEY"] = "new-key";
    getVibeClient(mockExtra);
    expect(clientInstances).toHaveLength(2);
  });

  it("should handle missing env vars in config hash (nullish coalescing)", () => {
    delete process.env["VIBE_API_KEY"];
    delete process.env["VIBE_API_BASE_URL"];

    const result = getVibeClient(mockExtra);
    expect(result.success).toBe(true);
    expect(clientInstances).toHaveLength(1);
  });

  it("should include VIBE_API_BASE_URL in config hash", () => {
    getVibeClient(mockExtra);
    expect(clientInstances).toHaveLength(1);

    process.env["VIBE_API_BASE_URL"] = "https://custom.api.com";
    getVibeClient(mockExtra);
    expect(clientInstances).toHaveLength(2);
  });

  it("should return error when VibeAuthError is thrown", async () => {
    const { VibeAuthError } = await import("./auth.js");
    mockLoadVibeConfig.mockImplementation(() => {
      throw new VibeAuthError("Missing API key", "NO_API_KEY");
    });

    const result = getVibeClient(mockExtra);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Missing API key");
    }
  });

  it("should return error when generic Error is thrown", () => {
    mockLoadVibeConfig.mockImplementation(() => {
      throw new Error("Something went wrong");
    });

    const result = getVibeClient(mockExtra);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Something went wrong");
    }
  });

  it("should return 'Unknown auth error' when non-Error is thrown", () => {
    mockLoadVibeConfig.mockImplementation(() => {
      throw "string error";
    });

    const result = getVibeClient(mockExtra);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Unknown auth error");
    }
  });

  it("should invalidate cache on error", () => {
    getVibeClient(mockExtra);
    expect(clientInstances).toHaveLength(1);

    mockLoadVibeConfig.mockImplementation(() => {
      throw new Error("fail");
    });

    process.env["VIBE_API_KEY"] = "changed";
    const result = getVibeClient(mockExtra);
    expect(result.success).toBe(false);

    mockLoadVibeConfig.mockReturnValue({
      apiKey: "changed",
      baseUrl: "https://clear-platform.vibe.co/rest/reporting/v1",
    });
    const result2 = getVibeClient(mockExtra);
    expect(result2.success).toBe(true);
    expect(clientInstances).toHaveLength(2);
  });

  it("getVibeClientOrThrow should return client on success", () => {
    const client = getVibeClientOrThrow(mockExtra);
    expect(client).toBeDefined();
  });

  it("getVibeClientOrThrow should throw on failure", () => {
    mockLoadVibeConfig.mockImplementation(() => {
      throw new Error("fail");
    });

    expect(() => getVibeClientOrThrow(mockExtra)).toThrow("fail");
  });
});
