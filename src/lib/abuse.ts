import { createHmac } from "node:crypto";

const ATTEMPT_WINDOW_MS = 60 * 1000;
const MAX_ATTEMPTS_PER_MINUTE = 30;
const MAX_ANALYSES_PER_INSTANCE_DAY = 500;
const MAX_SUGGESTIONS_PER_INSTANCE_DAY = 500;
const DEFAULT_ANALYSES_PER_VISITOR = 3;
const DEFAULT_SUGGESTIONS_PER_VISITOR = 10;
const DEFAULT_ANALYSES_GLOBAL = 50;
const DEFAULT_SUGGESTIONS_GLOBAL = 50;
const DAY_MS = 24 * 60 * 60 * 1000;
const KEY_VALUE_API = "https://keyvalue.immanuel.co/api/KeyVal";
const KEY_VALUE_TIMEOUT_MS = 2_500;

export type UsageKind = "analysis" | "suggestion";

type UsageReason = "rate_limited" | "daily_limit" | "instance_limit" | "global_limit";

type ClientBucket = {
  attempts: number[];
  day: string;
  daily: Record<UsageKind, number>;
  updatedAt: number;
};

type InstanceBucket = { day: string; daily: Record<UsageKind, number> };

export type UsageLimitResult =
  | { allowed: true }
  | { allowed: false; reason: UsageReason; retryAfterSeconds: number; limit?: number };

export type AnalysisLimitResult = UsageLimitResult;
export type AttemptLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

const clientBuckets = new Map<string, ClientBucket>();
let instanceBucket: InstanceBucket = { day: "", daily: emptyDaily() };
let lastCleanupAt = 0;

function emptyDaily(): Record<UsageKind, number> {
  return { analysis: 0, suggestion: 0 };
}

function utcDay(now: number) {
  return new Date(now).toISOString().slice(0, 10);
}

function secondsUntilNextUtcDay(now: number) {
  const nextDay = Math.floor(now / DAY_MS) * DAY_MS + DAY_MS;
  return Math.max(1, Math.ceil((nextDay - now) / 1000));
}

function envLimit(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function usageLimits(kind: UsageKind) {
  const analysis = kind === "analysis";
  const global = envLimit(
    analysis ? "LAUNCHLENS_DAILY_ANALYSES_GLOBAL" : "LAUNCHLENS_DAILY_SUGGESTIONS_GLOBAL",
    analysis ? DEFAULT_ANALYSES_GLOBAL : DEFAULT_SUGGESTIONS_GLOBAL,
  );
  return {
    perVisitor: envLimit(
      analysis ? "LAUNCHLENS_DAILY_ANALYSES_PER_VISITOR" : "LAUNCHLENS_DAILY_SUGGESTIONS_PER_VISITOR",
      analysis ? DEFAULT_ANALYSES_PER_VISITOR : DEFAULT_SUGGESTIONS_PER_VISITOR,
    ),
    // Without a shared store this acts as the per-process ceiling. With a
    // shared store it is also the cross-instance ceiling.
    perInstance: Math.min(analysis ? MAX_ANALYSES_PER_INSTANCE_DAY : MAX_SUGGESTIONS_PER_INSTANCE_DAY, global),
    global,
  };
}

function getClientBucket(identifier: string, now: number) {
  const day = utcDay(now);
  let bucket = clientBuckets.get(identifier);
  if (!bucket) {
    bucket = { attempts: [], day, daily: emptyDaily(), updatedAt: now };
  } else {
    // Re-insert on access so cleanup evicts the least recently used visitors.
    clientBuckets.delete(identifier);
  }
  clientBuckets.set(identifier, bucket);
  if (bucket.day !== day) {
    bucket.day = day;
    bucket.daily = emptyDaily();
  }
  bucket.attempts = bucket.attempts.filter((time) => now - time < ATTEMPT_WINDOW_MS);
  bucket.updatedAt = now;
  return bucket;
}

function cleanupBuckets(now: number) {
  if (now - lastCleanupAt < 60_000) return;
  lastCleanupAt = now;
  for (const [identifier, bucket] of clientBuckets) {
    if (now - bucket.updatedAt > DAY_MS) clientBuckets.delete(identifier);
  }
  while (clientBuckets.size > 10_000) {
    const oldest = clientBuckets.keys().next().value;
    if (!oldest) break;
    clientBuckets.delete(oldest);
  }
}

/**
 * Best-effort, in-process limits for deployments without shared storage.
 * These reset on process restarts and are not synchronized across serverless instances.
 */
export function checkAnonymousUsageLimit(
  kind: UsageKind,
  identifier: string,
  now = Date.now(),
  countAttempt = true,
): UsageLimitResult {
  cleanupBuckets(now);
  const bucket = getClientBucket(identifier, now);
  const limits = usageLimits(kind);

  if (countAttempt) {
    if (bucket.attempts.length >= MAX_ATTEMPTS_PER_MINUTE) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.attempts[0] + ATTEMPT_WINDOW_MS - now) / 1000));
      return { allowed: false, reason: "rate_limited", retryAfterSeconds };
    }
    bucket.attempts.push(now);
  }

  if (bucket.daily[kind] >= limits.perVisitor) {
    return {
      allowed: false,
      reason: "daily_limit",
      retryAfterSeconds: secondsUntilNextUtcDay(now),
      limit: limits.perVisitor,
    };
  }

  const day = utcDay(now);
  if (instanceBucket.day !== day) instanceBucket = { day, daily: emptyDaily() };
  if (instanceBucket.daily[kind] >= limits.perInstance) {
    return {
      allowed: false,
      reason: "instance_limit",
      retryAfterSeconds: secondsUntilNextUtcDay(now),
      limit: limits.perInstance,
    };
  }

  bucket.daily[kind] += 1;
  instanceBucket.daily[kind] += 1;
  return { allowed: true };
}

/** Backwards-compatible wrapper for the analysis route. */
export function checkAnonymousAnalysisLimit(
  identifier: string,
  now = Date.now(),
  countAttempt = true,
): UsageLimitResult {
  return checkAnonymousUsageLimit("analysis", identifier, now, countAttempt);
}

/** Backwards-compatible wrapper for the reference-suggestion route. */
export function checkAnonymousSuggestionLimit(
  identifier: string,
  now = Date.now(),
  countAttempt = true,
): UsageLimitResult {
  return checkAnonymousUsageLimit("suggestion", identifier, now, countAttempt);
}

/**
 * Uses keyvalue.immanuel.co as an optional shared counter. Its API has no
 * documented compare-and-set or expiry, so this is abuse friction rather than
 * a strict billing quota. Returns undefined when the store is not configured.
 */
export async function checkSharedAnonymousUsageLimit(
  kind: UsageKind,
  identifier: string,
  now = Date.now(),
): Promise<UsageLimitResult | undefined> {
  const appKey = process.env.KEYVALUE_APP_KEY?.trim();
  if (!appKey) return undefined;

  const limits = usageLimits(kind);
  const day = utcDay(now);
  const prefix = kind === "analysis" ? "ll-v2-analysis" : "ll-v2-suggestion";
  // Keep the path key URL-safe: the counter service rejects encoded colons in URL paths.
  const visitorKey = encodeURIComponent(`${prefix}-${day}-v-${identifier.slice(0, 32)}`);
  const globalKey = encodeURIComponent(`${prefix}-${day}-g`);
  const encodedAppKey = encodeURIComponent(appKey);
  const retryAfterSeconds = secondsUntilNextUtcDay(now);

  // Increment the visitor first. If that is already over the per-visitor cap,
  // deny without spending a slot from the shared global budget.
  const updatedVisitorCount = await incrementSharedCounter(encodedAppKey, visitorKey);
  if (updatedVisitorCount > limits.perVisitor) {
    return { allowed: false, reason: "daily_limit", retryAfterSeconds, limit: limits.perVisitor };
  }

  const updatedGlobalCount = await incrementSharedCounter(encodedAppKey, globalKey);
  if (updatedGlobalCount > limits.global) {
    return { allowed: false, reason: "global_limit", retryAfterSeconds, limit: limits.global };
  }
  return { allowed: true };
}

export function checkSharedAnonymousAnalysisLimit(
  identifier: string,
  now = Date.now(),
): Promise<UsageLimitResult | undefined> {
  return checkSharedAnonymousUsageLimit("analysis", identifier, now);
}

export function checkSharedAnonymousSuggestionLimit(
  identifier: string,
  now = Date.now(),
): Promise<UsageLimitResult | undefined> {
  return checkSharedAnonymousUsageLimit("suggestion", identifier, now);
}

async function incrementSharedCounter(appKey: string, key: string): Promise<number> {
  const incrementResponse = await fetch(
    `${KEY_VALUE_API}/ActOnValue/${appKey}/${key}/Increment`,
    {
      method: "POST",
      // The key-value service returns 411 unless the POST declares a length.
      body: "",
      cache: "no-store",
      signal: AbortSignal.timeout(KEY_VALUE_TIMEOUT_MS),
    },
  );
  if (!incrementResponse.ok) throw new Error(`Key-value increment failed (${incrementResponse.status}).`);

  const updated = await readSharedCounter(appKey, key);
  if (updated > 0) return updated;

  // ActOnValue reports success for a missing key but does not create it.
  // Initialize the counter so the next request increments from one.
  const updateResponse = await fetch(
    `${KEY_VALUE_API}/UpdateValue/${appKey}/${key}/1`,
    {
      method: "POST",
      body: "",
      cache: "no-store",
      signal: AbortSignal.timeout(KEY_VALUE_TIMEOUT_MS),
    },
  );
  if (!updateResponse.ok) throw new Error(`Key-value initialization failed (${updateResponse.status}).`);
  return 1;
}

async function readSharedCounter(appKey: string, key: string) {
  const response = await fetch(`${KEY_VALUE_API}/GetValue/${appKey}/${key}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(KEY_VALUE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Key-value read failed (${response.status}).`);

  const raw = (await response.text()).trim();
  if (!raw || raw === "null") return 0;

  let value: unknown = raw;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    // The API documents the stored value as plain text as well as JSON.
  }
  if (value === null || value === "") return 0;

  const count = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isSafeInteger(count) || count < 0) throw new Error("Key-value store returned an invalid counter.");
  return count;
}

export function recordAnonymousAttempt(identifier: string, now = Date.now()): AttemptLimitResult {
  cleanupBuckets(now);
  const bucket = getClientBucket(identifier, now);
  if (bucket.attempts.length >= MAX_ATTEMPTS_PER_MINUTE) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.attempts[0] + ATTEMPT_WINDOW_MS - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }
  bucket.attempts.push(now);
  return { allowed: true };
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || "";
}

function lastHeaderValue(value: string | null) {
  return value?.split(",").at(-1)?.trim() || "";
}

function clientIp(request: Request) {
  if (process.env.VERCEL === "1") {
    return firstHeaderValue(request.headers.get("x-vercel-forwarded-for")) ||
      firstHeaderValue(request.headers.get("x-forwarded-for")) ||
      request.headers.get("x-real-ip")?.trim() ||
      "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() ||
    lastHeaderValue(request.headers.get("x-forwarded-for")) ||
    "unknown";
}

/**
 * The identifier is deliberately IP-only. Including the User-Agent made the
 * limit trivial to bypass by rotating a header the caller controls.
 */
export function getAnonymousIdentifier(request: Request) {
  const salt = process.env.RATE_LIMIT_SALT || process.env.KEYVALUE_APP_KEY || process.env.QLOO_API_KEY || "launchlens-local-only";
  return createHmac("sha256", salt).update(clientIp(request)).digest("hex");
}

export function resetRateLimitsForTests() {
  clientBuckets.clear();
  instanceBucket = { day: "", daily: emptyDaily() };
  lastCleanupAt = 0;
}
