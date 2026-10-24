import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkAnonymousAnalysisLimit,
  checkAnonymousSuggestionLimit,
  checkSharedAnonymousAnalysisLimit,
  checkSharedAnonymousUsageLimit,
  getAnonymousIdentifier,
  recordAnonymousAttempt,
  resetRateLimitsForTests,
} from "./abuse";

function mockSharedStore() {
  const store = new Map<string, number>();
  const requestedUrls: string[] = [];
  const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    requestedUrls.push(String(input));
    const parts = url.pathname.split("/").filter(Boolean);
    const action = parts.at(-1) ?? "";
    if (init?.method === "POST" && action === "Increment") {
      const key = decodeURIComponent(parts.at(-2) ?? "");
      // Match the real service: incrementing a missing key is a no-op.
      if (store.has(key)) store.set(key, (store.get(key) ?? 0) + 1);
      return new Response("Increment Successful", { status: 200 });
    }
    if (init?.method === "POST" && parts.includes("UpdateValue")) {
      const key = decodeURIComponent(parts.at(-2) ?? "");
      const value = Number(parts.at(-1));
      store.set(key, value);
      return new Response("true", { status: 200 });
    }
    const key = decodeURIComponent(parts.at(-1) ?? "");
    return new Response(store.has(key) ? String(store.get(key)) : '""', { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { store, requestedUrls, fetchMock };
}

describe("anonymous usage limits", () => {
  beforeEach(() => resetRateLimitsForTests());
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("allows three analyses per visitor per UTC day", () => {
    const start = Date.UTC(2026, 0, 1);
    for (let index = 0; index < 3; index += 1) {
      expect(checkAnonymousAnalysisLimit("visitor-a", start + index * 1000).allowed).toBe(true);
    }
    expect(checkAnonymousAnalysisLimit("visitor-a", start + 6000)).toMatchObject({
      allowed: false,
      reason: "daily_limit",
      limit: 3,
    });
  });

  it("allows ten reference suggestions per visitor per UTC day", () => {
    const start = Date.UTC(2026, 0, 1);
    for (let index = 0; index < 10; index += 1) {
      expect(checkAnonymousSuggestionLimit("visitor-a", start + index * 1000).allowed).toBe(true);
    }
    expect(checkAnonymousSuggestionLimit("visitor-a", start + 11_000)).toMatchObject({
      allowed: false,
      reason: "daily_limit",
      limit: 10,
    });
  });

  it("does not spend the analysis budget when suggesting references", () => {
    const start = Date.UTC(2026, 0, 1);
    expect(checkAnonymousSuggestionLimit("visitor-a", start).allowed).toBe(true);
    for (let index = 0; index < 3; index += 1) {
      expect(checkAnonymousAnalysisLimit("visitor-a", start + index * 1000 + 1).allowed).toBe(true);
    }
    expect(checkAnonymousAnalysisLimit("visitor-a", start + 5000)).toMatchObject({
      allowed: false,
      reason: "daily_limit",
    });
  });

  it("resets the per-visitor daily cap on the next UTC day", () => {
    const start = Date.UTC(2026, 0, 1);
    for (let index = 0; index < 3; index += 1) {
      const result = checkAnonymousAnalysisLimit("visitor-a", start + index * 1000);
      expect(result.allowed).toBe(true);
    }
    expect(checkAnonymousAnalysisLimit("visitor-a", start + 24 * 60 * 60 * 1000).allowed).toBe(true);
  });

  it("limits malformed and repeated attempts too", () => {
    const start = Date.UTC(2026, 0, 1);
    for (let index = 0; index < 30; index += 1) {
      expect(recordAnonymousAttempt("visitor-a", start + index).allowed).toBe(true);
    }
    expect(recordAnonymousAttempt("visitor-a", start + 31)).toMatchObject({ allowed: false });
  });

  it("uses the shared counter to enforce the visitor and global daily caps", async () => {
    vi.stubEnv("KEYVALUE_APP_KEY", "test-app-key");
    const { store, requestedUrls } = mockSharedStore();

    const start = Date.UTC(2026, 0, 1);
    for (let index = 0; index < 3; index += 1) {
      expect(await checkSharedAnonymousAnalysisLimit("0123456789abcdef".repeat(4), start)).toEqual({ allowed: true });
    }
    expect(await checkSharedAnonymousAnalysisLimit("0123456789abcdef".repeat(4), start)).toMatchObject({
      allowed: false,
      reason: "daily_limit",
      limit: 3,
    });

    const keys = [...store.keys()];
    expect(keys.some((key) => key.endsWith("-v-0123456789abcdef0123456789abcdef"))).toBe(true);
    expect(keys.some((key) => key.endsWith("-g"))).toBe(true);
    expect(keys.every((key) => !key.includes(":"))).toBe(true);
    expect(requestedUrls.every((url) => !url.includes("%3A"))).toBe(true);
  });

  it("sends a zero-length body to shared-counter POSTs", async () => {
    vi.stubEnv("KEYVALUE_APP_KEY", "test-app-key");
    const { fetchMock } = mockSharedStore();

    await checkSharedAnonymousAnalysisLimit("0123456789abcdef".repeat(4), Date.UTC(2026, 0, 1));

    const postCalls = fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(postCalls.length).toBeGreaterThan(0);
    for (const [, init] of postCalls) expect(init?.body).toBe("");
  });

  it("enforces the shared global cap across different visitors", async () => {
    vi.stubEnv("KEYVALUE_APP_KEY", "test-app-key");
    vi.stubEnv("LAUNCHLENS_DAILY_ANALYSES_GLOBAL", "2");
    mockSharedStore();

    const start = Date.UTC(2026, 0, 1);
    expect(await checkSharedAnonymousUsageLimit("analysis", "a".repeat(64), start)).toEqual({ allowed: true });
    expect(await checkSharedAnonymousUsageLimit("analysis", "a".repeat(64), start + 1000)).toEqual({ allowed: true });
    expect(await checkSharedAnonymousUsageLimit("analysis", "b".repeat(64), start + 2000)).toMatchObject({
      allowed: false,
      reason: "global_limit",
      limit: 2,
    });
  });

  it("identifies anonymous visitors by IP, not by a caller-controlled User-Agent", () => {
    const first = new Request("https://example.test/api/analyze", {
      headers: { "x-real-ip": "203.0.113.10", "user-agent": "Browser A" },
    });
    const sameVisitor = new Request("https://example.test/api/analyze", {
      headers: { "x-real-ip": "203.0.113.10", "user-agent": "Browser A" },
    });
    const sameIpNewBrowser = new Request("https://example.test/api/analyze", {
      headers: { "x-real-ip": "203.0.113.10", "user-agent": "Browser B" },
    });
    const otherVisitor = new Request("https://example.test/api/analyze", {
      headers: { "x-real-ip": "203.0.113.11", "user-agent": "Browser A" },
    });

    expect(getAnonymousIdentifier(first)).toBe(getAnonymousIdentifier(sameVisitor));
    expect(getAnonymousIdentifier(first)).toBe(getAnonymousIdentifier(sameIpNewBrowser));
    expect(getAnonymousIdentifier(first)).not.toBe(getAnonymousIdentifier(otherVisitor));
  });

  it("uses Vercel's trusted client IP header on Vercel", () => {
    vi.stubEnv("VERCEL", "1");
    const first = new Request("https://example.test/api/analyze", {
      headers: { "x-vercel-forwarded-for": "203.0.113.10, 70.0.0.1", "x-forwarded-for": "203.0.113.10" },
    });
    const same = new Request("https://example.test/api/analyze", {
      headers: { "x-vercel-forwarded-for": "203.0.113.10" },
    });
    const other = new Request("https://example.test/api/analyze", {
      headers: { "x-vercel-forwarded-for": "203.0.113.11" },
    });

    expect(getAnonymousIdentifier(first)).toBe(getAnonymousIdentifier(same));
    expect(getAnonymousIdentifier(first)).not.toBe(getAnonymousIdentifier(other));
  });
});
