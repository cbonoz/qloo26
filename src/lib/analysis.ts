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
      kind: "audience" as const,
      input: "Kinfolk",
      name: "Kinfolk",
      entityId: "demo-signal-kinfolk",
      brands: ["Muji", "Aesop", "Hay", "Le Labo", "Tekla", "Byredo", "Ferm Living", "Frama", "Studio Nicholson", "Nonfiction", "Comme des Garçons", "Acne Studios", "Artek", "L:A Bruket", "Vitra", "HAY House", "Margaret Howell", "Loewe", "Cereal", "Apartamento"],
    },
    {
      kind: "audience" as const,
      input: "Blue Bottle Coffee",
      name: "Blue Bottle Coffee",
      entityId: "demo-signal-blue-bottle",
      brands: ["Fellow", "Oatly", "Stumptown", "Aesop", "Patagonia Provisions", "Blue Bottle", "Intelligentsia", "Onyx Coffee Lab", "Kinto", "MiiR", "Trade Coffee", "Verve Coffee", "Counter Culture", "La Colombe", "Clever Dripper", "Fellow Carter", "Cometeer", "Sey Coffee", "April Coffee", "Moccamaster"],
    },
    {
      kind: "audience" as const,
      input: "The Row",
      name: "The Row",
      entityId: "demo-signal-the-row",
      brands: ["Khaite", "Lemaire", "Toteme", "Bottega Veneta", "Loro Piana", "Aesop", "Jil Sander", "The Frankie Shop", "Studio Nicholson", "COS", "Joseph", "Celine", "Brunello Cucinelli", "Gabriela Hearst", "Dries Van Noten", "Loewe", "Mansur Gavriel", "Proenza Schouler", "Khaite Home", "Lemaire Objects"],
    },
    {
      kind: "market" as const,
      input: "Tokyo, Japan",
      name: "Tokyo, Japan",
      entityId: "demo-market-tokyo",
      brands: ["Shiseido", "Comme des Garçons", "Aesop", "Uniqlo", "Issey Miyake", "Muji", "Onitsuka Tiger", "Snow Peak", "Porter-Yoshida", "Beams", "Blue Bottle Coffee", "Niko and...", "Kapital", "Visvim", "Mizuno", "Asics", "Dover Street Market", "Kinto", "Tadao Ando", "Hender Scheme"],
    },
  ];
  const evidence: SignalEvidence[] = demoSignals.map((signal) => {
    const targetIndex = signal.brands.indexOf(brand.name);
    return {
      kind: signal.kind,
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
    audienceSignals: demoSignals.filter((signal) => signal.kind === "audience").map((signal) => signal.name),
    score,
    directHits,
    signalCount: evidence.length,
    summary:
      "In this illustrative example, Aesop appears in related-brand lists for all three audience cues and for the Tokyo market signal. Treat this as a demo of the report format, not live Qloo research or evidence of market demand.",
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
  const audienceEvidence = report.evidence.filter((item) => item.kind === "audience");
  const marketEvidence = report.evidence.find((item) => item.kind === "market");
  const matched = audienceEvidence.filter((item) => item.targetRank !== null);
  const marketMatched = marketEvidence?.targetRank !== null && marketEvidence?.targetRank !== undefined;
  const strongest = [...matched].sort((a, b) => (a.targetRank ?? 0) - (b.targetRank ?? 0))[0];
  const sampleTopBrands = report.evidence
    .flatMap((item) => item.relatedBrands.slice(0, 3).map((brand) => brand.name))
    .filter((name) => name.toLowerCase() !== report.brand.name.toLowerCase());
  const adjacent = [...new Set(sampleTopBrands)].slice(0, 3);

  return {
    summary: strongest
      ? `${report.brand.name} appears in Qloo's related-brand results for ${matched.length} of ${audienceEvidence.length} audience cues${marketEvidence ? ` and ${marketMatched ? "also appears" : "does not appear"} in the ${report.market} market signal` : ""}. Its strongest audience overlap is with ${strongest.name} (rank ${strongest.targetRank! + 1}). These are cultural hypotheses to investigate, not evidence of market demand or campaign performance.`
      : `Qloo did not return ${report.brand.name} in the top related-brand results for these audience cues${marketEvidence ? ` or as a direct match for the ${report.market} market signal` : ""}. This is a gap to investigate, not proof the audience will reject the brand.`,
    strengths: matched.length
      ? matched.slice(0, 3).map(
          (item) => `${report.brand.name} appears among the related brands for ${item.name} (rank ${item.targetRank! + 1}).`,
        )
      : ["The selected audience cues resolved successfully and can be used to explore adjacent cultural territory."],
    risks: [
      matched.length < audienceEvidence.length || (marketEvidence && !marketMatched)
        ? `Potential gap to investigate: direct brand overlap was found for ${matched.length} of ${audienceEvidence.length} culture cues${marketEvidence ? ` and ${marketMatched ? "a direct match was present" : `no direct match was found for ${report.market}`}` : ""}.`
        : `This is a small set of cultural signals for ${report.market}; it does not measure local awareness, demand, or distribution readiness.`,
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
