import { describe, expect, it } from "vitest";
import { cachedExample, cachedExampleCampaigns, createCachedExampleReport, matchesCachedExample } from "./cached-example";

describe("cached Qloo example", () => {
  const exampleBrief = {
    brand: cachedExample.report.brand.name,
    market: cachedExample.report.market,
    signals: cachedExample.report.audienceSignals,
    campaignA: cachedExampleCampaigns[0],
    campaignB: cachedExampleCampaigns[1],
  };

  it("matches the filled example brief without campaign concepts", () => {
    expect(matchesCachedExample(exampleBrief)).toBe(true);
  });

  it("does not use the snapshot after the brief changes", () => {
    expect(matchesCachedExample({ ...exampleBrief, signals: ["Kinfolk", "Different cue", "The Row"] })).toBe(false);
    expect(matchesCachedExample({ ...exampleBrief, campaignA: "Different idea", campaignB: "A creator series" })).toBe(false);
  });

  it("marks the displayed snapshot as cached and preserves its capture time", () => {
    const report = createCachedExampleReport();
    expect(report.mode).toBe("cached");
    expect(report.capturedAt).toBe(cachedExample.capturedAt);
  });
});
