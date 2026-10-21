import { describe, expect, it } from "vitest";
import { calculateAlignmentScore, createFallbackConceptIdeas } from "./analysis";
import type { SignalEvidence } from "./types";

function evidence(targetRank: number | null, relatedCount = 20): SignalEvidence {
  return {
    input: "sample reference",
    name: "Sample reference",
    entityId: "sample-id",
    relatedBrands: Array.from({ length: relatedCount }, (_, index) => ({
      name: `Brand ${index + 1}`,
      rank: index + 1,
    })),
    relatedBrandCount: relatedCount,
    targetRank,
  };
}

describe("calculateAlignmentScore", () => {
  it("scores direct matches by their rank in the returned list", () => {
    expect(calculateAlignmentScore([evidence(0, 10)])).toEqual({ score: 100, directHits: 1 });
    expect(calculateAlignmentScore([evidence(9, 10)])).toEqual({ score: 10, directHits: 1 });
  });

  it("counts absent matches as no observed overlap, not as missing input", () => {
    expect(calculateAlignmentScore([evidence(0, 10), evidence(null, 10)])).toEqual({ score: 50, directHits: 1 });
  });

  it("returns a zero score for empty evidence", () => {
    expect(calculateAlignmentScore([])).toEqual({ score: 0, directHits: 0 });
  });

  it("normalizes against the full result count, not the trimmed list", () => {
    const trimmed = { ...evidence(14, 20), relatedBrands: evidence(14, 20).relatedBrands.slice(0, 8) };
    expect(calculateAlignmentScore([trimmed])).toEqual(calculateAlignmentScore([evidence(14, 20)]));
  });
});

describe("createFallbackConceptIdeas", () => {
  it("ranks evidence-led first tests without inventing model scores", () => {
    const report = {
      brand: { name: "IKEA", entityId: "ikea" },
      market: "Seoul, South Korea",
      marketResolved: "Seoul",
      audienceSignals: ["Muji"],
      score: 10,
      directHits: 1,
      signalCount: 1,
      summary: "",
      strengths: [],
      risks: [],
      recommendations: [],
      evidence: [evidence(14, 20)],
      aiAssisted: false,
      mode: "live" as const,
    };

    const ideas = createFallbackConceptIdeas(report);

    expect(ideas).toHaveLength(3);
    expect(ideas[0].name).toContain("Sample reference");
    expect(ideas[0].score).toBeNull();
    expect(ideas[0].firstTest.length).toBeGreaterThan(0);
  });
});
