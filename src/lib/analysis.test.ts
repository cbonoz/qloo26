import { describe, expect, it } from "vitest";
import { calculateAlignmentScore } from "./analysis";
import type { SignalEvidence } from "./types";

function evidence(targetRank: number | null, relatedCount = 20): SignalEvidence {
  return {
    kind: "audience",
    input: "sample cue",
    name: "Sample cue",
    entityId: "sample-id",
    relatedBrands: Array.from({ length: relatedCount }, (_, index) => ({
      name: `Brand ${index + 1}`,
      entityId: `brand-${index + 1}`,
      rank: index + 1,
    })),
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
});
