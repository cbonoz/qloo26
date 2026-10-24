import type { AnalysisReport, CampaignAssessment, ConceptIdea } from "./types";
import { createFallbackNarrative, createFallbackConceptIdeas, getBestRank } from "./analysis";
import { requestXaiJson } from "./xai";

type Narrative = ReturnType<typeof createFallbackNarrative> & {
  comparison?: [CampaignAssessment, CampaignAssessment];
  conceptIdeas?: ConceptIdea[];
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
    conceptIdeas: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          score: { type: "number", minimum: 0, maximum: 100 },
          rationale: { type: "string" },
          firstTest: { type: "string" },
        },
        required: ["name", "score", "rationale", "firstTest"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "strengths", "risks", "recommendations", "comparison", "conceptIdeas"],
  additionalProperties: false,
} as const;

const narrativeSystemPrompt = [
  "You are a cautious market-entry cultural analyst for LaunchLens. Use only the supplied Qloo evidence. Never invent affinities, demographics, local market demand, or causal claims. Frame promising connections and gaps as hypotheses to investigate, not as go/no-go conclusions.",
  "Write tight copy: the summary under 60 words, each strength, risk, and recommendation under 30 words, each rationale under 40 words, and each first test under 25 words.",
  "Give exactly three recommendations that describe research or validation steps, not campaign ideas.",
  "If two campaign options are supplied: return one comparison assessment per option, in the order supplied. Each rationale must say why that option fits the supplied Qloo evidence better or worse than the other option, and the scores must separate the options when one is genuinely stronger. Return an empty conceptIdeas list.",
  "If no campaign options are supplied: return an empty comparison list and exactly three conceptIdeas, ranked best first. Each conceptIdea is a concrete, testable campaign idea for this brand in this market, with a name, a score estimate, a rationale that cites the supplied evidence, and a firstTest describing the smallest test that would validate it.",
  "Treat cultural references as evidence, not assumed partners. If a reference is a direct competitor of the brand, do not propose a partnership, co-branding, endorsement, or competitor-led campaign. Use it only as an audience or positioning signal.",
  "If the team supplied a goal, keep every idea in service of that goal.",
  "Scores for campaign options and ideas are heuristic judgments based on the supplied evidence, not Qloo scores or market predictions.",
  "The cultural signal score is an average of the brand's position across all selected references, with a missing match counting as zero. If you mention it, state how many references matched and the best rank; never describe it as a grade of brand quality, cultural fit, demand, or campaign performance.",
].join(" ");

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const cut = value.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function parseNarrative(payload: Record<string, unknown> | null): Partial<Narrative> | null {
  if (!payload) return null;
  const strings = (field: string) => Array.isArray(payload[field])
    ? (payload[field] as unknown[]).filter((item): item is string => typeof item === "string").slice(0, 4)
    : undefined;
  const summary = typeof payload.summary === "string" ? truncate(payload.summary, 600) : undefined;
  const comparison = Array.isArray(payload.comparison)
    ? payload.comparison.slice(0, 2).flatMap((item): CampaignAssessment[] => {
        if (!item || typeof item !== "object") return [];
        const option = item as Record<string, unknown>;
        if (typeof option.name !== "string" || typeof option.rationale !== "string" || typeof option.score !== "number") return [];
        return [{
          name: truncate(option.name, 180),
          score: Math.max(0, Math.min(100, Math.round(option.score))),
          rationale: truncate(option.rationale, 400),
        }];
      })
    : [];
  const conceptIdeas = Array.isArray(payload.conceptIdeas)
    ? payload.conceptIdeas.slice(0, 3).flatMap((item): ConceptIdea[] => {
        if (!item || typeof item !== "object") return [];
        const option = item as Record<string, unknown>;
        if (typeof option.name !== "string" || typeof option.rationale !== "string") return [];
        const score = typeof option.score === "number" ? Math.max(0, Math.min(100, Math.round(option.score))) : null;
        return [{
          name: truncate(option.name, 120),
          score,
          rationale: truncate(option.rationale, 400),
          firstTest: typeof option.firstTest === "string" ? truncate(option.firstTest, 240) : "",
        }];
      })
    : [];
  return {
    summary,
    strengths: strings("strengths"),
    risks: strings("risks"),
    recommendations: strings("recommendations"),
    comparison: comparison.length === 2 ? comparison as [CampaignAssessment, CampaignAssessment] : undefined,
    conceptIdeas: conceptIdeas.length > 0 ? conceptIdeas : undefined,
  };
}

export async function createNarrative(
  report: AnalysisReport,
  campaigns?: [string, string],
): Promise<Narrative & { aiAssisted: boolean }> {
  const fallback = createFallbackNarrative(report);
  const fallbackIdeas = createFallbackConceptIdeas(report);
  const fallbackNarrative = {
    ...fallback,
    ...(campaigns ? { comparison: fallbackCampaignComparison(campaigns) } : { conceptIdeas: fallbackIdeas }),
    aiAssisted: false,
  };

  const parsed = parseNarrative(await requestXaiJson({
    system: narrativeSystemPrompt,
    user: JSON.stringify({
      brand: report.brand.name,
      targetMarket: report.market,
      qlooResolvedMarket: report.marketResolved,
      goal: report.goal ?? null,
      qlooScore: report.score,
      qlooScoreDetails: {
        directMatches: report.directHits,
        totalReferences: report.signalCount,
        bestRank: getBestRank(report.evidence),
      },
      qlooEvidence: report.evidence.map((item) => ({
        referenceName: item.name,
        targetBrandRank: item.targetRank === null ? null : item.targetRank + 1,
        relatedBrands: item.relatedBrands.map((brand) => brand.name),
      })),
      campaignOptions: campaigns ?? null,
    }),
    schema: narrativeSchema,
    schemaName: "launchlens_market_entry_report",
    maxOutputTokens: 1600,
    timeoutMs: 45_000,
    reasoningEffort: "low",
  }));

  if (!parsed?.summary || !parsed.recommendations?.length) return fallbackNarrative;

  return {
    ...fallback,
    ...parsed,
    ...(campaigns
      ? { comparison: parsed.comparison ?? fallbackCampaignComparison(campaigns) }
      : { conceptIdeas: parsed.conceptIdeas?.length ? parsed.conceptIdeas : fallbackIdeas }),
    aiAssisted: true,
  };
}

function fallbackCampaignComparison(campaigns: [string, string]): [CampaignAssessment, CampaignAssessment] {
  return campaigns.map((name) => ({
    name,
    score: 50,
    rationale: "This idea was not AI-scored. Use the Qloo evidence to shape a small test, then validate it with your audience.",
  })) as [CampaignAssessment, CampaignAssessment];
}
