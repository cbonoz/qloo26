import { beforeEach, describe, expect, it } from "vitest";
import { checkAnonymousAnalysisLimit, recordAnonymousAttempt, resetRateLimitsForTests } from "./abuse";

describe("anonymous analysis limits", () => {
  beforeEach(() => resetRateLimitsForTests());

  it("allows five analyses and then asks for a challenge", () => {
    for (let index = 0; index < 5; index += 1) {
      expect(checkAnonymousAnalysisLimit("visitor-a", false, index * 1000).allowed).toBe(true);
    }
    expect(checkAnonymousAnalysisLimit("visitor-a", false, 6000)).toMatchObject({
      allowed: false,
      reason: "challenge_required",
    });
  });

  it("accepts a challenge-verified request above the burst limit", () => {
    for (let index = 0; index < 5; index += 1) checkAnonymousAnalysisLimit("visitor-a", false, index * 1000);
    expect(checkAnonymousAnalysisLimit("visitor-a", true, 6000)).toEqual({ allowed: true });
  });

  it("enforces a per-visitor daily cap", () => {
    const start = Date.UTC(2026, 0, 1);
    for (let index = 0; index < 20; index += 1) {
      const result = checkAnonymousAnalysisLimit("visitor-a", true, start + index * 1000);
      expect(result.allowed).toBe(true);
    }
    expect(checkAnonymousAnalysisLimit("visitor-a", true, start + 21_000)).toMatchObject({
      allowed: false,
      reason: "daily_limit",
    });
  });

  it("limits malformed and repeated attempts too", () => {
    const start = Date.UTC(2026, 0, 1);
    for (let index = 0; index < 30; index += 1) {
      expect(recordAnonymousAttempt("visitor-a", start + index).allowed).toBe(true);
    }
    expect(recordAnonymousAttempt("visitor-a", start + 31)).toMatchObject({ allowed: false });
  });
});
