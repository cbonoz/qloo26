import { createHmac } from "node:crypto";

const ATTEMPT_WINDOW_MS = 60 * 1000;
const MAX_ANALYSES_PER_DAY = 3;
const MAX_ATTEMPTS_PER_MINUTE = 30;
const MAX_ANALYSES_PER_INSTANCE_DAY = 500;
const DAY_MS = 24 * 60 * 60 * 1000;
const KEY_VALUE_API = "https://keyvalue.immanuel.co/api/KeyVal";
const KEY_VALUE_TIMEOUT_MS = 2_500;

type ClientBucket = {
  attempts: number[];
  day: string;
  dailyAnalyses: number;
  updatedAt: number;
};

type InstanceBucket = { day: string; dailyAnalyses: number };

export type AnalysisLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "rate_limited" | "daily_limit" | "instance_limit"; retryAfterSeconds: number };

export type AttemptLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

const clientBuckets = new Map<string, ClientBucket>();
let instanceBucket: InstanceBucket = { day: "", dailyAnalyses: 0 };
let lastCleanupAt = 0;

function utcDay(now: number) {
  return new Date(now).toISOString().slice(0, 10);
}

function secondsUntilNextUtcDay(now: number) {
  const nextDay = Math.floor(now / DAY_MS) * DAY_MS + DAY_MS;
  return Math.max(1, Math.ceil((nextDay - now) / 1000));
}

function getClientBucket(identifier: string, now: number) {
  const day = utcDay(now);
  let bucket = clientBuckets.get(identifier);
  if (!bucket) {
    bucket = { attempts: [], day, dailyAnalyses: 0, updatedAt: now };
    clientBuckets.set(identifier, bucket);
  }
  if (bucket.day !== day) {
    bucket.day = day;
    bucket.dailyAnalyses = 0;
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
export function checkAnonymousAnalysisLimit(
  identifier: string,
  now = Date.now(),
  countAttempt = true,
): AnalysisLimitResult {
  cleanupBuckets(now);
  const bucket = getClientBucket(identifier, now);
  if (countAttempt) {
    if (bucket.attempts.length >= MAX_ATTEMPTS_PER_MINUTE) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.attempts[0] + ATTEMPT_WINDOW_MS - now) / 1000));
      return { allowed: false, reason: "rate_limited", retryAfterSeconds };
    }
    bucket.attempts.push(now);
  }

  if (bucket.dailyAnalyses >= MAX_ANALYSES_PER_DAY) {
    return { allowed: false, reason: "daily_limit", retryAfterSeconds: secondsUntilNextUtcDay(now) };
  }

  const day = utcDay(now);
  if (instanceBucket.day !== day) instanceBucket = { day, dailyAnalyses: 0 };
  if (instanceBucket.dailyAnalyses >= MAX_ANALYSES_PER_INSTANCE_DAY) {
    return { allowed: false, reason: "instance_limit", retryAfterSeconds: secondsUntilNextUtcDay(now) };
  }

  bucket.dailyAnalyses += 1;
  instanceBucket.dailyAnalyses += 1;
  return { allowed: true };
}

/**
 * Uses keyvalue.immanuel.co as an optional shared daily counter. Its API has
 * no documented compare-and-set or expiry, so this is abuse friction rather
 * than a strict billing quota. Returns undefined when the store is not set up.
 */
export async function checkSharedAnonymousAnalysisLimit(
  identifier: string,
  now = Date.now(),
): Promise<AnalysisLimitResult | undefined> {
  const appKey = process.env.KEYVALUE_APP_KEY?.trim();
  if (!appKey) return undefined;

  const key = `ll:v1:${utcDay(now)}:${identifier.slice(0, 32)}`;
  const encodedKey = encodeURIComponent(key);
  const encodedAppKey = encodeURIComponent(appKey);
  const retryAfterSeconds = secondsUntilNextUtcDay(now);
  const currentCount = await readSharedCounter(encodedAppKey, encodedKey);

  if (currentCount >= MAX_ANALYSES_PER_DAY) {
    return { allowed: false, reason: "daily_limit", retryAfterSeconds };
  }

  const increment = await fetch(
    `${KEY_VALUE_API}/ActOnValue/${encodedAppKey}/${encodedKey}/Increment`,
    {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(KEY_VALUE_TIMEOUT_MS),
    },
  );
  if (!increment.ok) throw new Error(`Key-value increment failed (${increment.status}).`);

  // Read after increment so a consistent store can detect concurrent overages.
  // The service does not document strong consistency, so this is not a hard quota.
  const updatedCount = await readSharedCounter(encodedAppKey, encodedKey);
  return updatedCount <= MAX_ANALYSES_PER_DAY
    ? { allowed: true }
    : { allowed: false, reason: "daily_limit", retryAfterSeconds };
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

export function getAnonymousIdentifier(request: Request) {
  const ip =
    request.headers.get("x-vercel-forwarded-for")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
    "unknown";
  const salt = process.env.RATE_LIMIT_SALT || process.env.KEYVALUE_APP_KEY || process.env.QLOO_API_KEY || "launchlens-local-only";
  const userAgent = request.headers.get("user-agent")?.trim().slice(0, 256) || "unknown";
  return createHmac("sha256", salt).update(`${ip}\n${userAgent}`).digest("hex");
}

export function resetRateLimitsForTests() {
  clientBuckets.clear();
  instanceBucket = { day: "", dailyAnalyses: 0 };
  lastCleanupAt = 0;
}
