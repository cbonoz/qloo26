import snapshot from "./cached-example.json";
import type { AnalysisReport } from "./types";

type CachedExample = {
  capturedAt: string;
  report: AnalysisReport;
};

export const cachedExample = snapshot as CachedExample;
export const cachedExampleCampaigns = ["Small-Space Design Workshop", "Repair-and-Swap Weekend"] as const;
export const cachedExampleGoal = cachedExample.report.goal ?? "Launch a small-space furniture line for people living in compact homes in Seoul.";

export function matchesCachedExample(brief: {
  brand: string;
  market: string;
  signals: string[];
  campaignA: string;
  campaignB: string;
}) {
  const report = cachedExample.report;
  const normalize = (value: string) => value.trim().toLocaleLowerCase();

  return normalize(brief.brand) === normalize(report.brand.name)
    && normalize(brief.market) === normalize(report.market)
    && brief.signals.length === report.audienceSignals.length
    && brief.signals.every((signal, index) => normalize(signal) === normalize(report.audienceSignals[index]))
    && normalize(brief.campaignA) === normalize(cachedExampleCampaigns[0])
    && normalize(brief.campaignB) === normalize(cachedExampleCampaigns[1]);
}

export function createCachedExampleReport(): AnalysisReport {
  return {
    ...cachedExample.report,
    mode: "cached",
    capturedAt: cachedExample.capturedAt,
  };
}
