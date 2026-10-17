import type { AnalysisReport, CampaignAssessment } from "@/lib/types";
import { createFallbackNarrative } from "@/lib/analysis";

type Narrative = ReturnType<typeof createFallbackNarrative> & {
  comparison?: [CampaignAssessment, CampaignAssessment];
};

function responseText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";
  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as { content?: unknown }).content;
      return Array.isArray(content) ? content : [];
    })
    .map((item) => item && typeof item === "object" ? (item as { text?: unknown }).text : null)
    .filter((text): text is string => typeof text === "string")
    .join("\n");
}

function parseNarrative(text: string): Partial<Narrative> | null {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const value = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const strings = (field: string) => Array.isArray(value[field])
      ? value[field].filter((item): item is string => typeof item === "string").slice(0, 4)
      : undefined;
    const summary = typeof value.summary === "string" ? value.summary.slice(0, 500) : undefined;
    const comparison = Array.isArray(value.comparison)
      ? value.comparison.slice(0, 2).flatMap((item): CampaignAssessment[] => {
          if (!item || typeof item !== "object") return [];
          const option = item as Record<string, unknown>;
          if (typeof option.name !== "string" || typeof option.rationale !== "string" || typeof option.score !== "number") return [];
          return [{
            name: option.name.slice(0, 180),
            score: Math.max(0, Math.min(100, Math.round(option.score))),
            rationale: option.rationale.slice(0, 400),
          }];
        })
      : [];
    return {
      summary,
      strengths: strings("strengths"),
      risks: strings("risks"),
      recommendations: strings("recommendations"),
      comparison: comparison.length === 2 ? comparison as [CampaignAssessment, CampaignAssessment] : undefined,
    };
  } catch {
    return null;
  }
}

export async function createNarrative(
  report: AnalysisReport,
  campaigns?: [string, string],
): Promise<Narrative & { aiAssisted: boolean }> {
  const fallback = createFallbackNarrative(report);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ...fallback,
      ...(campaigns ? { comparison: fallbackCampaignComparison(campaigns) } : {}),
      aiAssisted: false,
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-6-astra",
        instructions:
          "You are a cautious market-entry cultural analyst for LaunchLens. Use only the supplied Qloo evidence. Never invent affinities, demographics, local market demand, or causal claims. Frame promising connections and gaps as hypotheses to investigate, not as go/no-go conclusions. Return one JSON object with keys summary (string), strengths (string array), risks (string array), recommendations (string array of exactly 3), and comparison (array of two objects with name, score from 0 to 100, rationale; omit or use [] if no options were supplied). Scores for campaign options are heuristic judgments based on the supplied evidence, not Qloo scores or market predictions.",
        input: JSON.stringify({
          brand: report.brand.name,
          targetMarket: report.market,
          audienceSignals: report.audienceSignals,
          qlooScore: report.score,
          directHits: `${report.directHits}/${report.signalCount}`,
          qlooEvidence: report.evidence.map((item) => ({
            signalType: item.kind,
            signalName: item.name,
            targetBrandRank: item.targetRank === null ? null : item.targetRank + 1,
            relatedBrands: item.relatedBrands.slice(0, 8).map((brand) => brand.name),
          })),
          campaignOptions: campaigns,
        }),
        max_output_tokens: 650,
      }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`OpenAI returned ${response.status}`);
    const parsed = parseNarrative(responseText(await response.json()));
    if (!parsed?.summary || !parsed.recommendations?.length) throw new Error("Narrative response was incomplete");
    return {
      ...fallback,
      ...parsed,
      ...(campaigns ? { comparison: parsed.comparison ?? fallbackCampaignComparison(campaigns) } : {}),
      aiAssisted: true,
    };
  } catch {
    return {
      ...fallback,
      ...(campaigns ? { comparison: fallbackCampaignComparison(campaigns) } : {}),
      aiAssisted: false,
    };
  }
}

function fallbackCampaignComparison(campaigns: [string, string]): [CampaignAssessment, CampaignAssessment] {
  return campaigns.map((name) => ({
    name,
    score: 50,
    rationale: "Add OPENAI_API_KEY to generate an AI-assisted comparison grounded in the live Qloo evidence. This neutral placeholder is not a Qloo score.",
  })) as [CampaignAssessment, CampaignAssessment];
}
