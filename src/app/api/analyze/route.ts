import { NextResponse } from "next/server";
import { calculateAlignmentScore } from "@/lib/analysis";
import { checkAnonymousAnalysisLimit, getAnonymousIdentifier, recordAnonymousAttempt } from "@/lib/abuse";
import { createNarrative } from "@/lib/narrative";
import { getRelatedBrands, QlooApiError, searchEntities } from "@/lib/qloo";
import { isTurnstileConfigured, verifyTurnstileToken } from "@/lib/turnstile";
import type { AnalysisReport, SignalEvidence } from "@/lib/types";

type RequestBody = {
  brand?: unknown;
  market?: unknown;
  signals?: unknown;
  campaignA?: unknown;
  campaignB?: unknown;
  companyWebsite?: unknown;
  turnstileToken?: unknown;
};

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function exceedsTextLimit(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim().length > maxLength;
}

function jsonError(message: string, status: number, code?: string, retryAfterSeconds?: number) {
  return NextResponse.json(
    { error: message, ...(code ? { code } : {}) },
    {
      status,
      headers: retryAfterSeconds ? { "Retry-After": String(retryAfterSeconds) } : undefined,
    },
  );
}

export async function POST(request: Request) {
  if (process.env.LAUNCHLENS_ANALYSIS_ENABLED === "false") {
    return jsonError("Live analysis is temporarily paused. Please try again later.", 503, "analysis_disabled");
  }

  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return jsonError("Send this request as JSON.", 415, "unsupported_content_type");
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) {
        return jsonError("Cross-origin requests are not accepted.", 403, "origin_not_allowed");
      }
    } catch {
      return jsonError("Invalid request origin.", 403, "origin_not_allowed");
    }
  }

  const identifier = getAnonymousIdentifier(request);
  const attemptLimit = recordAnonymousAttempt(identifier);
  if (!attemptLimit.allowed) {
    return jsonError("Too many requests. Please wait briefly before trying again.", 429, "rate_limited", attemptLimit.retryAfterSeconds);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 8_192) return jsonError("The request is too large. Shorten the inputs and try again.", 413, "request_too_large");

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return jsonError("Send a valid JSON request.", 400, "invalid_json");
  }
  if (new TextEncoder().encode(rawBody).byteLength > 8_192) {
    return jsonError("The request is too large. Shorten the inputs and try again.", 413, "request_too_large");
  }

  let body: RequestBody;
  try {
    body = JSON.parse(rawBody) as RequestBody;
  } catch {
    return jsonError("Send a valid JSON request.", 400, "invalid_json");
  }

  if (typeof body.companyWebsite === "string" && body.companyWebsite.trim()) {
    return jsonError("The request could not be processed.", 400, "invalid_request");
  }

  const brandQuery = cleanText(body.brand, 100);
  const marketQuery = cleanText(body.market, 100);
  const rawSignals = Array.isArray(body.signals) ? body.signals : [];
  if (exceedsTextLimit(body.brand, 100)) return jsonError("Brand or product names must be 100 characters or fewer.", 400, "brand_too_long");
  if (exceedsTextLimit(body.market, 100)) return jsonError("Market names must be 100 characters or fewer.", 400, "market_too_long");
  if (rawSignals.length > 4) return jsonError("Use no more than four audience cues in one analysis.", 400, "too_many_signals");
  if (rawSignals.some((signal) => exceedsTextLimit(signal, 80))) return jsonError("Each audience cue must be 80 characters or fewer.", 400, "signal_too_long");
  const signals = Array.isArray(body.signals)
    ? [...new Set(body.signals.map((item) => cleanText(item, 80)).filter(Boolean))]
    : [];
  if (exceedsTextLimit(body.campaignA, 180) || exceedsTextLimit(body.campaignB, 180)) {
    return jsonError("Campaign concepts must be 180 characters or fewer.", 400, "campaign_too_long");
  }
  const campaignA = cleanText(body.campaignA, 180);
  const campaignB = cleanText(body.campaignB, 180);

  if (!brandQuery) return jsonError("Enter a brand or product to analyze.", 400, "missing_brand");
  if (!marketQuery) return jsonError("Enter a target market, such as a city or region.", 400, "missing_market");
  if (signals.length < 2) return jsonError("Add at least two audience cues so Qloo can compare cultural signals.", 400, "too_few_signals");
  if (Boolean(campaignA) !== Boolean(campaignB)) {
    return jsonError("Enter both campaign options, or leave both blank.", 400, "incomplete_comparison");
  }

  if (!process.env.QLOO_API_KEY) {
    return jsonError("Qloo API key is not configured. Add QLOO_API_KEY to .env.local.", 503, "missing_api_key");
  }

  const bodyLimit = checkAnonymousAnalysisLimit(identifier, false, Date.now(), false);
  if (!bodyLimit.allowed && bodyLimit.reason !== "challenge_required") {
    const message = bodyLimit.reason === "daily_limit" || bodyLimit.reason === "instance_limit"
      ? "The anonymous analysis limit has been reached. Please try again tomorrow."
      : "Too many requests. Please wait briefly before trying again.";
    return jsonError(message, 429, bodyLimit.reason, bodyLimit.retryAfterSeconds);
  }

  if (!bodyLimit.allowed && bodyLimit.reason === "challenge_required") {
    const token = typeof body.turnstileToken === "string" ? body.turnstileToken : "";
    if (!token && isTurnstileConfigured()) {
      return jsonError("Complete the quick check before continuing.", 428, "challenge_required", bodyLimit.retryAfterSeconds);
    }
    if (!isTurnstileConfigured()) {
      return jsonError("Too many analyses from this connection. Please wait before trying again.", 429, "rate_limited", bodyLimit.retryAfterSeconds);
    }
    const hostname = new URL(request.url).hostname;
    if (!(await verifyTurnstileToken(token, hostname))) {
      return jsonError("Verification did not complete. Please try again.", 403, "challenge_failed");
    }
    const challengedLimit = checkAnonymousAnalysisLimit(identifier, true, Date.now(), false);
    if (!challengedLimit.allowed) {
      const message = challengedLimit.reason === "daily_limit" || challengedLimit.reason === "instance_limit"
        ? "The anonymous analysis limit has been reached. Please try again tomorrow."
        : "Too many requests. Please wait briefly before trying again.";
      return jsonError(message, 429, challengedLimit.reason, challengedLimit.retryAfterSeconds);
    }
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
