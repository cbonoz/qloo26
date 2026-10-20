export type WizardStep = "market" | "audience" | "concepts" | "results";

export const wizardSteps: { id: WizardStep; label: string; description: string }[] = [
  { id: "market", label: "Brand & market", description: "Set your starting point" },
  { id: "audience", label: "Culture cues", description: "Choose audience signals" },
  { id: "concepts", label: "Campaign ideas", description: "Optional concept review" },
  { id: "results", label: "Your results", description: "Review your brief" },
];
