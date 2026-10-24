import { NextResponse } from "next/server";
import {
  checkAnonymousSuggestionLimit,
  checkSharedAnonymousSuggestionLimit,
  getAnonymousIdentifier,
  recordAnonymousAttempt,
} from "@/lib/abuse";
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

  const brand = cleanText(body.brand, 100);
  const market = cleanText(body.market, 100);
  const goal = cleanText(body.goal, 400);
  if (exceedsTextLimit(body.brand, 100)) return jsonError("Brand or product names must be 100 characters or fewer.", 400, "brand_too_long");
  if (exceedsTextLimit(body.market, 100)) return jsonError("Market names must be 100 characters or fewer.", 400, "market_too_long");
  if (exceedsTextLimit(body.goal, 400)) return jsonError("Your goal must be 400 characters or fewer.", 400, "goal_too_long");
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

  const bodyLimit = checkAnonymousSuggestionLimit(identifier, Date.now(), false);
  if (!bodyLimit.allowed) {
    const message = bodyLimit.reason === "daily_limit"
      ? `You’ve reached today’s limit of ${bodyLimit.limit ?? 10} AI reference suggestions. Add references manually or try again tomorrow.`
      : bodyLimit.reason === "instance_limit"
        ? "This demo has reached its daily AI reference suggestion limit. Add references manually instead."
        : "Too many requests. Please wait briefly before trying again.";
    return jsonError(message, 429, bodyLimit.reason, bodyLimit.retryAfterSeconds);
  }

  try {
    const sharedLimit = await checkSharedAnonymousSuggestionLimit(identifier);
    if (sharedLimit && !sharedLimit.allowed) {
      const message = sharedLimit.reason === "global_limit"
        ? `The shared daily limit of ${sharedLimit.limit ?? 500} AI reference suggestions has been reached. Add references manually instead.`
        : `You’ve reached today’s limit of ${sharedLimit.limit ?? 10} AI reference suggestions. Add references manually or try again tomorrow.`;
      return jsonError(message, 429, sharedLimit.reason, sharedLimit.retryAfterSeconds);
    }
  } catch {
    return jsonError(
      "AI reference suggestions are temporarily unavailable because the usage limit could not be verified. Add references manually instead.",
      503,
      "rate_limit_store_unavailable",
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
