import { NextResponse } from "next/server";
import { getAnonymousIdentifier, recordAnonymousAttempt } from "@/lib/abuse";
import { suggestCulturalReferences } from "@/lib/cues";
import { QlooApiError } from "@/lib/qloo";
import { isXaiConfigured } from "@/lib/xai";

type RequestBody = {
  brand?: unknown;
  market?: unknown;
  goal?: unknown;
  companyWebsite?: unknown;
};

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function jsonError(message: string, status: number, code?: string) {
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status });
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
    return jsonError("Too many requests. Please wait briefly before trying again.", 429, "rate_limited");
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

  const brand = cleanText(body.brand, 100);
  const market = cleanText(body.market, 100);
  const goal = cleanText(body.goal, 400);
  if (!brand) return jsonError("Enter a brand or product first.", 400, "missing_brand");
  if (!market) return jsonError("Enter a target market first.", 400, "missing_market");
  if (!goal) return jsonError("Describe what you are trying to do in this market first.", 400, "missing_goal");

  if (!process.env.QLOO_API_KEY) {
    return jsonError("Qloo API key is not configured. Add QLOO_API_KEY to .env.local.", 503, "missing_api_key");
  }

  if (!isXaiConfigured()) {
    return jsonError(
      "AI reference suggestions are not configured on this deployment. Add cultural references manually instead.",
      503,
      "ai_not_configured",
    );
  }

  try {
    const result = await suggestCulturalReferences({ brand, market, goal });
    if (!result || result.references.length === 0) {
      return jsonError(
        "No usable cultural references were found for that goal. Try naming 2–4 artists, films, brands, or places yourself.",
        422,
        "no_references_found",
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof QlooApiError) {
      return jsonError(error.message, error.status, "qloo_error");
    }
    return jsonError("Could not suggest references right now. Add them manually instead.", 500, "suggestion_failed");
  }
}
