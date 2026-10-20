import type { AnalysisReport, SignalEvidence } from "@/lib/types";

export function calculateAlignmentScore(evidence: SignalEvidence[]) {
  if (evidence.length === 0) {
    return { score: 0, directHits: 0 };
  }

  const directHits = evidence.filter((item) => item.targetRank !== null).length;
  const normalizedRanks = evidence.map((item) => {
    if (item.targetRank === null) return 0;
    const resultCount = Math.max(item.relatedBrands.length, 1);
    return Math.max(0, 1 - item.targetRank / resultCount);
  });

  return {
    score: Math.round((normalizedRanks.reduce((sum, rank) => sum + rank, 0) / evidence.length) * 100),
    directHits,
  };
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
      relatedBrands: signal.brands.map((name, index) => ({
        name,
        entityId: `demo-${name.toLowerCase().replaceAll(" ", "-")}`,
        rank: index + 1,
      })),
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
      "In this illustrative example, Aesop appears in location-aware related-brand results for all three culture cues in Tokyo. Treat this as a demo of the report format, not live Qloo research or evidence of market demand.",
    strengths: [
      "Design-led, considered brand associations appear across all three sample cues.",
      "The sample audience signals span independent publishing, specialty coffee, and luxury fashion.",
    ],
    risks: [
      "The sample does not represent a measured audience segment, market demand, or campaign outcome.",
      "A demo match is not evidence that a particular creative concept will convert.",
    ],
    recommendations: [
      "Build a restrained, editorial partnership concept around design and daily rituals.",
      "Test a small-format experience with a specialty coffee partner before scaling.",
      "Use the audience’s fashion cue as a creative direction, not as a claim about demographics.",
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
      ? `${report.brand.name} appears in Qloo's location-aware related-brand results for ${matched.length} of ${audienceEvidence.length} culture cues in ${marketLabel}. Its strongest observed overlap is with ${strongest.name} (rank ${strongest.targetRank! + 1}). These are hypotheses to investigate, not evidence of market demand or campaign performance.`
      : `Qloo did not return ${report.brand.name} in the top location-aware related-brand results for these culture cues in ${marketLabel}. This is a gap to investigate, not proof the audience will reject the brand.`,
    strengths: matched.length
      ? matched.slice(0, 3).map(
          (item) => `${report.brand.name} appears among the related brands for ${item.name} (rank ${item.targetRank! + 1}).`,
        )
      : ["The selected audience cues resolved successfully and can be used to explore adjacent cultural territory."],
    risks: [
      matched.length < audienceEvidence.length
        ? `Potential gap to investigate: direct brand overlap was found for ${matched.length} of ${audienceEvidence.length} culture cues in ${marketLabel}.`
        : `This is a small set of location-aware cultural signals for ${marketLabel}; it does not measure local awareness, demand, or distribution readiness.`,
      "Affinity rankings describe cultural association, not causation, reach, or likely sales lift.",
    ],
    recommendations: [
      adjacent.length
        ? `Explore a partnership or creative adjacency with ${adjacent[0]} in ${report.market}, then validate the hypothesis with local audience research.`
        : "Test a small, low-risk creative concept with the strongest matching audience cue.",
      strongest
        ? `Use ${strongest.name} as a starting point for a culturally grounded creative brief, without implying endorsement.`
        : "Try adding more specific artist, film, brand, or place cues to uncover stronger cultural connections.",
      "Run a small audience test before committing significant campaign spend.",
    ],
  };
}
