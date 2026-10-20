export type SignalEvidence = {
  input: string;
  name: string;
  entityId: string;
  relatedBrands: Array<{ name: string; entityId: string; rank: number }>;
  targetRank: number | null;
};

export type CampaignAssessment = {
  name: string;
  score: number;
  rationale: string;
};

export type AnalysisReport = {
  mode: "demo" | "live";
  brand: { name: string; entityId: string };
  market: string;
  marketResolved: string;
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
  aiAssisted: boolean;
};
