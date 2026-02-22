import { describe, it, expect, vi } from "vitest";

vi.mock("./ping.js", () => ({ registerPingTool: vi.fn() }));
vi.mock("./advertisers.js", () => ({ registerAdvertiserTools: vi.fn() }));
vi.mock("./apps.js", () => ({ registerAppTools: vi.fn() }));
vi.mock("./campaigns.js", () => ({ registerCampaignTools: vi.fn() }));
vi.mock("./reports.js", () => ({ registerReportTools: vi.fn() }));
vi.mock("./purchases.js", () => ({ registerPurchaseTools: vi.fn() }));

import { registerTools } from "./index.js";
import { registerPingTool } from "./ping.js";
import { registerAdvertiserTools } from "./advertisers.js";
import { registerAppTools } from "./apps.js";
import { registerCampaignTools } from "./campaigns.js";
import { registerReportTools } from "./reports.js";
import { registerPurchaseTools } from "./purchases.js";

describe("registerTools", () => {
  it("should call all registration functions with the server", () => {
    const server = {} as any;
    registerTools(server);

    expect(registerPingTool).toHaveBeenCalledWith(server);
    expect(registerAdvertiserTools).toHaveBeenCalledWith(server);
    expect(registerAppTools).toHaveBeenCalledWith(server);
    expect(registerCampaignTools).toHaveBeenCalledWith(server);
    expect(registerReportTools).toHaveBeenCalledWith(server);
    expect(registerPurchaseTools).toHaveBeenCalledWith(server);
  });
});
