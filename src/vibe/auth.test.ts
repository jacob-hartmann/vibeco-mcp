import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadVibeConfig, isVibeConfigured, VibeAuthError } from "./auth.js";

describe("Vibe Auth", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("loadVibeConfig", () => {
    it("should throw VibeAuthError when VIBE_API_KEY is missing", () => {
      delete process.env["VIBE_API_KEY"];

      expect(() => loadVibeConfig()).toThrow(VibeAuthError);
      expect(() => loadVibeConfig()).toThrow("VIBE_API_KEY");
    });

    it("should have correct error code when VIBE_API_KEY is missing", () => {
      delete process.env["VIBE_API_KEY"];

      try {
        loadVibeConfig();
      } catch (err) {
        expect(err).toBeInstanceOf(VibeAuthError);
        expect((err as VibeAuthError).code).toBe("NO_API_KEY");
      }
    });

    it("should return config when VIBE_API_KEY is set", () => {
      process.env["VIBE_API_KEY"] = "test-key";

      const config = loadVibeConfig();

      expect(config.apiKey).toBe("test-key");
      expect(config.baseUrl).toBe(
        "https://clear-platform.vibe.co/rest/reporting/v1"
      );
    });

    it("should respect custom VIBE_API_BASE_URL", () => {
      process.env["VIBE_API_KEY"] = "test-key";
      process.env["VIBE_API_BASE_URL"] = "https://custom.api.com/v3";

      const config = loadVibeConfig();

      expect(config.baseUrl).toBe("https://custom.api.com/v3");
    });
  });

  describe("isVibeConfigured", () => {
    it("should return false when VIBE_API_KEY is missing", () => {
      delete process.env["VIBE_API_KEY"];

      expect(isVibeConfigured()).toBe(false);
    });

    it("should return true when VIBE_API_KEY is set", () => {
      process.env["VIBE_API_KEY"] = "test-key";

      expect(isVibeConfigured()).toBe(true);
    });
  });
});
