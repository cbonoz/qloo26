export type SignalEvidence = {
  input: string;
  name: string;
  entityId: string;
  /** Related brand names and ranks only — entity IDs are never needed downstream. */
  relatedBrands: Array<{ name: string; rank: number }>;
  /** How many related brands Qloo returned for this reference, used to normalize ranks. */
  relatedBrandCount: number;
  targetRank: number | null;
};

export type CampaignAssessment = {
  name: string;
  score: number;
  rationale: string;
};

/** A ranked first test the user can act on. `score` is null when no model estimate exists. */
export type ConceptIdea = {
  name: string;
  score: number | null;
  rationale: string;
  firstTest: string;
};

export type AnalysisReport = {
  mode: "demo" | "cached" | "live";
  capturedAt?: string;
  brand: { name: string; entityId: string };
  market: string;
  marketResolved: string;
  goal?: string;
  audienceSignals: string[];
  score: number;
  directHits: number;
  signalCount: number;
  summary: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  evidence: SignalEvidence[];
  comparison?: [CampaignAssessment, CampaignAssessment];
  conceptIdeas?: ConceptIdea[];
  aiAssisted: boolean;
};
