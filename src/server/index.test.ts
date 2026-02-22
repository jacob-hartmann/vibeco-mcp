import { describe, it, expect } from "vitest";
import * as serverModule from "./index.js";

describe("Server Module Exports", () => {
  it("should export getHttpServerConfig", () => {
    expect(serverModule.getHttpServerConfig).toBeDefined();
    expect(typeof serverModule.getHttpServerConfig).toBe("function");
  });

  it("should export startHttpServer", () => {
    expect(serverModule.startHttpServer).toBeDefined();
    expect(typeof serverModule.startHttpServer).toBe("function");
  });
});
