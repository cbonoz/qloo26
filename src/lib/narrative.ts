import type { AnalysisReport, CampaignAssessment } from "./types";
import { createFallbackNarrative } from "./analysis";

type Narrative = ReturnType<typeof createFallbackNarrative> & {
  comparison?: [CampaignAssessment, CampaignAssessment];
};

const narrativeSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    recommendations: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 3,
    },
    comparison: {
      type: "array",
      maxItems: 2,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          score: { type: "number", minimum: 0, maximum: 100 },
          rationale: { type: "string" },
        },
        required: ["name", "score", "rationale"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "strengths", "risks", "recommendations", "comparison"],
  additionalProperties: false,
} as const;

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
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return {
      ...fallback,
      ...(campaigns ? { comparison: fallbackCampaignComparison(campaigns) } : {}),
      aiAssisted: false,
    };
  }

  try {
    const response = await fetch("https://api.x.ai/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || "grok-4.7",
        store: false,
        input: [
          {
            role: "system",
            content:
              "You are a cautious market-entry cultural analyst for LaunchLens. Use only the supplied Qloo evidence. Never invent affinities, demographics, local market demand, or causal claims. Frame promising connections and gaps as hypotheses to investigate, not as go/no-go conclusions. Give exactly three recommendations. If campaign options are present, return one comparison assessment per option; otherwise return an empty comparison list. Scores for campaign options are heuristic judgments based on the supplied evidence, not Qloo scores or market predictions.",
          },
          {
            role: "user",
            content: JSON.stringify({
              brand: report.brand.name,
              targetMarket: report.market,
              qlooResolvedMarket: report.marketResolved,
              audienceSignals: report.audienceSignals,
              qlooScore: report.score,
              directHits: `${report.directHits}/${report.signalCount}`,
              qlooEvidence: report.evidence.map((item) => ({
                signalName: item.name,
                targetBrandRank: item.targetRank === null ? null : item.targetRank + 1,
                relatedBrands: item.relatedBrands.slice(0, 8).map((brand) => brand.name),
              })),
              campaignOptions: campaigns,
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "launchlens_market_entry_report",
            strict: true,
            schema: narrativeSchema,
          },
        },
        max_output_tokens: 900,
      }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`xAI returned ${response.status}`);
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
    rationale: "Add XAI_API_KEY to generate an AI-assisted comparison grounded in the live Qloo evidence. This neutral placeholder is not a Qloo score.",
  })) as [CampaignAssessment, CampaignAssessment];
}
