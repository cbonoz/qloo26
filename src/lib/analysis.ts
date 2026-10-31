import type { AnalysisReport, ConceptIdea, SignalEvidence } from "@/lib/types";

export function calculateAlignmentScore(evidence: SignalEvidence[]) {
  if (evidence.length === 0) {
    return { score: 0, directHits: 0 };
  }

  const directHits = evidence.filter((item) => item.targetRank !== null).length;
  const normalizedRanks = evidence.map((item) => {
    if (item.targetRank === null) return 0;
    const resultCount = Math.max(item.relatedBrandCount, 1);
    return Math.max(0, 1 - item.targetRank / resultCount);
  });

  return {
    score: Math.round((normalizedRanks.reduce((sum, rank) => sum + rank, 0) / evidence.length) * 100),
    directHits,
  };
}

/** The brand's best (lowest-numbered) observed position across the selected references. */
export function getBestRank(evidence: SignalEvidence[]): number | null {
  return evidence.reduce<number | null>((best, item) => {
    if (item.targetRank === null) return best;
    const rank = item.targetRank + 1;
    return best === null ? rank : Math.min(best, rank);
  }, null);
}

/**
 * Plain-language interpretation of the composite score. The score is an
 * average across every selected reference, so it reflects both coverage and
 * rank; it is deliberately not presented as a grade of the brand.
 */
export function describeAlignmentScore(
  report: Pick<AnalysisReport, "brand" | "directHits" | "signalCount" | "evidence">,
): string {
  const count = report.signalCount;
  const references = `${count} reference${count === 1 ? "" : "s"}`;
  const bestRank = getBestRank(report.evidence);

  if (report.directHits === 0) {
    const referenceNames = report.evidence.map((item) => item.name);
    const referenceList = referenceNames.length > 1
      ? `${referenceNames.slice(0, -1).join(", ")} or ${referenceNames.at(-1)}`
      : referenceNames[0] || "the selected references";
    return `${report.brand.name} was not in the up-to-20 related-brand results Qloo returned for ${referenceList}. A zero describes only these specific result lists—not zero popularity or cultural relevance. If you want to test local competition, include local competitor brands as references; otherwise try references closer to the audience or experience you want to explore. This run cannot tell which alternatives would match, and a new reference is not guaranteed to produce one.`;
  }

  const coverage = report.directHits === count ? `all ${references}` : `${report.directHits} of ${references}`;
  const best = bestRank === null ? "" : ` Its best position was #${bestRank}.`;
  const explanation = report.directHits === count
    ? `The score averages position across ${references}; higher positions raise it.`
    : `The score averages position across ${references}, so gaps and low ranks pull it down.`;

  return `${report.brand.name} appeared for ${coverage}.${best} ${explanation} It measures overlap with these references, not demand or brand quality.`;
}

export function createDemoReport(): AnalysisReport {
  const brand = { name: "Aesop", entityId: "demo-brand-aesop" };
  const demoSignals = [
    {
      input: "Kinfolk",
      name: "Kinfolk",
      entityId: "demo-signal-kinfolk",
      brands: ["Muji", "Aesop", "Hay", "Le Labo", "Tekla", "Byredo", "Ferm Living", "Frama", "Studio Nicholson", "Nonfiction", "Comme des Garçons", "Acne Studios", "Artek", "L:A Bruket", "Vitra", "HAY House", "Margaret Howell", "Loewe", "Cereal", "Apartamento"],
    },
    {
      input: "Blue Bottle Coffee",
      name: "Blue Bottle Coffee",
      entityId: "demo-signal-blue-bottle",
      brands: ["Fellow", "Oatly", "Stumptown", "Aesop", "Patagonia Provisions", "Blue Bottle", "Intelligentsia", "Onyx Coffee Lab", "Kinto", "MiiR", "Trade Coffee", "Verve Coffee", "Counter Culture", "La Colombe", "Clever Dripper", "Fellow Carter", "Cometeer", "Sey Coffee", "April Coffee", "Moccamaster"],
    },
    {
      input: "The Row",
      name: "The Row",
      entityId: "demo-signal-the-row",
      brands: ["Khaite", "Lemaire", "Toteme", "Bottega Veneta", "Loro Piana", "Aesop", "Jil Sander", "The Frankie Shop", "Studio Nicholson", "COS", "Joseph", "Celine", "Brunello Cucinelli", "Gabriela Hearst", "Dries Van Noten", "Loewe", "Mansur Gavriel", "Proenza Schouler", "Khaite Home", "Lemaire Objects"],
    },
  ];
  const evidence: SignalEvidence[] = demoSignals.map((signal) => {
    const targetIndex = signal.brands.indexOf(brand.name);
    return {
      input: signal.input,
      name: signal.name,
      entityId: signal.entityId,
      relatedBrands: signal.brands.map((name, index) => ({ name, rank: index + 1 })),
      relatedBrandCount: signal.brands.length,
      targetRank: targetIndex === -1 ? null : targetIndex,
    };
  });
  const { score, directHits } = calculateAlignmentScore(evidence);

  return {
    mode: "demo",
    brand,
    market: "Tokyo, Japan",
    marketResolved: "Tokyo",
    audienceSignals: demoSignals.map((signal) => signal.name),
    score,
    directHits,
    signalCount: evidence.length,
    summary:
      "In this illustrative example, Aesop appears in location-aware related-brand results for all three cultural references in Tokyo. Treat this as a demo of the report format, not live Qloo research or evidence of market demand.",
    strengths: [
      "Design-led, considered brand associations appear across all three sample references.",
      "The sample references span independent publishing, specialty coffee, and luxury fashion.",
    ],
    risks: [
      "The sample does not represent a measured audience segment, market demand, or campaign outcome.",
      "A demo match is not evidence that a particular creative concept will convert.",
    ],
    recommendations: [
      "Build a restrained, editorial partnership concept around design and daily rituals.",
      "Test a small-format experience with a specialty coffee partner before scaling.",
      "Use the audience’s fashion reference as a creative direction, not as a claim about demographics.",
    ],
    evidence,
    aiAssisted: false,
  };
}

export function createFallbackNarrative(report: AnalysisReport): Pick<
  AnalysisReport,
  "summary" | "strengths" | "risks" | "recommendations"
> {
  const audienceEvidence = report.evidence;
  const matched = audienceEvidence.filter((item) => item.targetRank !== null);
  const marketLabel = report.marketResolved || report.market;
  const strongest = [...matched].sort((a, b) => (a.targetRank ?? 0) - (b.targetRank ?? 0))[0];
  const sampleTopBrands = report.evidence
    .flatMap((item) => item.relatedBrands.slice(0, 3).map((brand) => brand.name))
    .filter((name) => name.toLowerCase() !== report.brand.name.toLowerCase());
  const adjacent = [...new Set(sampleTopBrands)].slice(0, 3);

  return {
    summary: strongest
      ? `${report.brand.name} appears in Qloo's location-aware related-brand results for ${matched.length} of ${audienceEvidence.length} cultural references in ${marketLabel}. Its strongest observed overlap is with ${strongest.name} (rank ${strongest.targetRank! + 1}). These are hypotheses to investigate, not evidence of market demand or campaign performance.`
      : `Qloo did not return ${report.brand.name} in the top location-aware related-brand results for these cultural references in ${marketLabel}. This is a gap to investigate, not proof the audience will reject the brand.`,
    strengths: matched.length
      ? matched.slice(0, 3).map(
          (item) => `${report.brand.name} appears among the related brands for ${item.name} (rank ${item.targetRank! + 1}).`,
        )
      : ["The selected cultural references resolved successfully and can be used to explore adjacent cultural territory."],
    risks: [
      matched.length < audienceEvidence.length
        ? `Potential gap to investigate: direct brand overlap was found for ${matched.length} of ${audienceEvidence.length} cultural references in ${marketLabel}.`
        : `This is a small set of location-aware cultural signals for ${marketLabel}; it does not measure local awareness, demand, or distribution readiness.`,
      "Affinity rankings describe cultural association, not causation, reach, or likely sales lift.",
    ],
    recommendations: [
      adjacent.length
        ? `Explore a partnership or creative adjacency with ${adjacent[0]} in ${report.market}, then validate the hypothesis with local audience research.`
        : "Test a small, low-risk creative concept with the strongest matching cultural reference.",
      strongest
        ? `Use ${strongest.name} as a starting point for a culturally grounded creative brief, without implying endorsement.`
        : "Try adding more specific artist, film, brand, or place references to uncover stronger cultural connections.",
      "Run a small audience test before committing significant campaign spend.",
    ],
  };
}

/**
 * Evidence-led first tests used when no model ranking is available. These are
 * ranked by how directly the Qloo evidence supports them, not by a model score.
 */
export function createFallbackConceptIdeas(report: AnalysisReport): ConceptIdea[] {
  const marketLabel = report.marketResolved || report.market;
  const matched = report.evidence.filter((item) => item.targetRank !== null);
  const strongest = [...matched].sort((a, b) => (a.targetRank ?? 0) - (b.targetRank ?? 0))[0];
  const adjacent = report.evidence
    .flatMap((item) => item.relatedBrands.slice(0, 3).map((brand) => brand.name))
    .find((name) => name.toLowerCase() !== report.brand.name.toLowerCase());
  const ideas: ConceptIdea[] = [];

  if (strongest) {
    ideas.push({
      name: `A first test built around ${strongest.name}`,
      score: null,
      rationale: `${report.brand.name} ranks #${strongest.targetRank! + 1} in the location-aware related-brand results for ${strongest.name} in ${marketLabel}. It is the strongest observed overlap in this brief.`,
      firstTest: `Run one low-cost concept with an audience that already engages with ${strongest.name}, and measure response before scaling spend.`,
    });
  }

  if (adjacent) {
    ideas.push({
      name: "A small test in an adjacent cultural audience",
      score: null,
      rationale: `${adjacent} appears alongside ${report.brand.name} in the related-brand results for these references in ${marketLabel}, so its audience is an adjacent cultural space to test—not a partnership assumption.`,
      firstTest: `Run one small placement or event aimed at that audience, and measure response before scaling spend.`,
    });
  }

  ideas.push({
    name: "A small audience test before any launch spend",
    score: null,
    rationale: matched.length < report.evidence.length
      ? `${report.brand.name} only appeared for ${matched.length} of ${report.evidence.length} references in ${marketLabel}. The gaps are the fastest thing to close with direct feedback.`
      : `The references returned clear signals for ${marketLabel}, but they still describe cultural association rather than purchase intent.`,
    firstTest: `Interview a handful of people in ${marketLabel} about ${report.brand.name}, and turn their answers into one testable proposition.`,
  });

  return ideas.slice(0, 3);
}
