import { createHmac } from "node:crypto";

const WINDOW_MS = 10 * 60 * 1000;
const ATTEMPT_WINDOW_MS = 60 * 1000;
const MAX_ANALYSES_PER_WINDOW = 5;
const MAX_ANALYSES_PER_DAY = 20;
const MAX_ATTEMPTS_PER_MINUTE = 30;
const MAX_ANALYSES_PER_INSTANCE_DAY = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

type ClientBucket = {
  attempts: number[];
  analyses: number[];
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
    bucket = { attempts: [], analyses: [], day, dailyAnalyses: 0, updatedAt: now };
    clientBuckets.set(identifier, bucket);
  }
  if (bucket.day !== day) {
    bucket.day = day;
    bucket.dailyAnalyses = 0;
    bucket.analyses = [];
  }
  bucket.attempts = bucket.attempts.filter((time) => now - time < ATTEMPT_WINDOW_MS);
  bucket.analyses = bucket.analyses.filter((time) => now - time < WINDOW_MS);
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

  if (bucket.analyses.length >= MAX_ANALYSES_PER_WINDOW) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.analyses[0] + WINDOW_MS - now) / 1000));
    return { allowed: false, reason: "rate_limited", retryAfterSeconds };
  }

  bucket.analyses.push(now);
  bucket.dailyAnalyses += 1;
  instanceBucket.dailyAnalyses += 1;
  return { allowed: true };
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
  const salt = process.env.RATE_LIMIT_SALT || process.env.QLOO_API_KEY || "launchlens-local-only";
  return createHmac("sha256", salt).update(ip).digest("hex");
}

export function resetRateLimitsForTests() {
  clientBuckets.clear();
  instanceBucket = { day: "", dailyAnalyses: 0 };
  lastCleanupAt = 0;
}
