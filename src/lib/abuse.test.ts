import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkAnonymousAnalysisLimit,
  checkSharedAnonymousAnalysisLimit,
  getAnonymousIdentifier,
  recordAnonymousAttempt,
  resetRateLimitsForTests,
} from "./abuse";

describe("anonymous analysis limits", () => {
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

  it("uses the configured shared counter to enforce the same daily cap", async () => {
    vi.stubEnv("KEYVALUE_APP_KEY", "test-app-key");
    let storedCount = 0;
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      if (init?.method === "POST") {
        storedCount += 1;
        return new Response("ok", { status: 200 });
      }
      return new Response(String(storedCount), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const start = Date.UTC(2026, 0, 1);
    for (let index = 0; index < 3; index += 1) {
      expect(await checkSharedAnonymousAnalysisLimit("0123456789abcdef".repeat(4), start)).toEqual({ allowed: true });
    }
    expect(await checkSharedAnonymousAnalysisLimit("0123456789abcdef".repeat(4), start)).toMatchObject({
      allowed: false,
      reason: "daily_limit",
    });
    expect(storedCount).toBe(3);
  });

  it("identifies anonymous visitors with a salted IP and User-Agent digest", () => {
    const first = new Request("https://example.test/api/analyze", {
      headers: { "x-vercel-forwarded-for": "203.0.113.10", "user-agent": "Browser A" },
    });
    const sameVisitor = new Request("https://example.test/api/analyze", {
      headers: { "x-vercel-forwarded-for": "203.0.113.10", "user-agent": "Browser A" },
    });
    const otherBrowser = new Request("https://example.test/api/analyze", {
      headers: { "x-vercel-forwarded-for": "203.0.113.10", "user-agent": "Browser B" },
    });

    expect(getAnonymousIdentifier(first)).toBe(getAnonymousIdentifier(sameVisitor));
    expect(getAnonymousIdentifier(first)).not.toBe(getAnonymousIdentifier(otherBrowser));
  });
});
