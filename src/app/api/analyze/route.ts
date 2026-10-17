import { NextResponse } from "next/server";
import { calculateAlignmentScore, createDemoReport } from "@/lib/analysis";
import { createNarrative } from "@/lib/narrative";
import { getRelatedBrands, QlooApiError, searchEntities } from "@/lib/qloo";
import type { AnalysisReport, SignalEvidence } from "@/lib/types";

type RequestBody = {
  brand?: unknown;
  market?: unknown;
  signals?: unknown;
  campaignA?: unknown;
  campaignB?: unknown;
  demo?: unknown;
};

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function jsonError(message: string, status: number, code?: string) {
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status });
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return jsonError("Send a valid JSON request.", 400, "invalid_json");
  }

  if (body.demo === true) {
    return NextResponse.json(createDemoReport());
  }

  const brandQuery = cleanText(body.brand, 100);
  const marketQuery = cleanText(body.market, 100);
  const signals = Array.isArray(body.signals)
    ? [...new Set(body.signals.map((item) => cleanText(item, 80)).filter(Boolean))].slice(0, 5)
    : [];
  const campaignA = cleanText(body.campaignA, 180);
  const campaignB = cleanText(body.campaignB, 180);

  if (!brandQuery) return jsonError("Enter a brand or product to analyze.", 400, "missing_brand");
  if (!marketQuery) return jsonError("Enter a target market, such as a city or region.", 400, "missing_market");
  if (signals.length < 2) return jsonError("Add at least two audience cues so Qloo can compare cultural signals.", 400, "too_few_signals");
  if (Boolean(campaignA) !== Boolean(campaignB)) {
    return jsonError("Enter both campaign options, or leave both blank.", 400, "incomplete_comparison");
  }

  try {
    const [brandMatches, marketMatches, seedMatches] = await Promise.all([
      searchEntities(brandQuery, "urn:entity:brand"),
      searchEntities(marketQuery, "urn:entity:locality"),
      Promise.all(signals.map(async (input) => ({ input, matches: await searchEntities(input) }))),
    ]);

    const brand = brandMatches[0];
    if (!brand) return jsonError(`Qloo could not resolve “${brandQuery}” as a brand. Try a more specific name.`, 422, "brand_not_found");
    const market = marketMatches[0];
    if (!market) return jsonError(`Qloo could not resolve “${marketQuery}” as a market locality. Try a city, region, or country name.`, 422, "market_not_found");

    const resolvedSeeds = seedMatches.flatMap(({ input, matches }) => {
      const entity = matches[0];
      return entity ? [{ input, entity }] : [];
    });
    if (resolvedSeeds.length < 2) {
      const unresolved = seedMatches.filter((item) => item.matches.length === 0).map((item) => item.input);
      return jsonError(
        `Qloo resolved fewer than two audience cues${unresolved.length ? `; not found: ${unresolved.join(", ")}` : ""}. Try specific artist, film, brand, or place names.`,
        422,
        "signals_not_found",
      );
    }

    const evidenceResults = await Promise.all([
      ...resolvedSeeds.map(async ({ input, entity }): Promise<SignalEvidence> => {
        const related = await getRelatedBrands(entity.entityId, 20);
        const targetIndex = related.findIndex((item) =>
          item.entityId.toLowerCase() === brand.entityId.toLowerCase() ||
          item.name.toLowerCase() === brand.name.toLowerCase(),
        );
        return {
          kind: "audience",
          input,
          name: entity.name,
          entityId: entity.entityId,
          relatedBrands: related.map((item, index) => ({ name: item.name, entityId: item.entityId, rank: index + 1 })),
          targetRank: targetIndex === -1 ? null : targetIndex,
        };
      }),
      (async (): Promise<SignalEvidence> => {
        const related = await getRelatedBrands(market.entityId, 20);
        const targetIndex = related.findIndex((item) =>
          item.entityId.toLowerCase() === brand.entityId.toLowerCase() ||
          item.name.toLowerCase() === brand.name.toLowerCase(),
        );
        return {
          kind: "market",
          input: marketQuery,
          name: market.name,
          entityId: market.entityId,
          relatedBrands: related.map((item, index) => ({ name: item.name, entityId: item.entityId, rank: index + 1 })),
          targetRank: targetIndex === -1 ? null : targetIndex,
        };
      })(),
    ]);

    const { score, directHits } = calculateAlignmentScore(evidenceResults);
    const report: AnalysisReport = {
      mode: "live",
      brand,
      market: market.name,
      audienceSignals: evidenceResults.filter((item) => item.kind === "audience").map((item) => item.name),
      score,
      directHits,
      signalCount: evidenceResults.length,
      summary: "",
      strengths: [],
      risks: [],
      recommendations: [],
      evidence: evidenceResults,
      aiAssisted: false,
    };
    const campaigns = campaignA && campaignB ? [campaignA, campaignB] as [string, string] : undefined;
    const narrative = await createNarrative(report, campaigns);
    return NextResponse.json({ ...report, ...narrative });
  } catch (error) {
    if (error instanceof QlooApiError) {
      return jsonError(error.message, error.status, error.status === 503 ? "missing_api_key" : "qloo_error");
    }
    return jsonError("Analysis failed unexpectedly. Please retry in a moment.", 500, "analysis_failed");
  }
}
