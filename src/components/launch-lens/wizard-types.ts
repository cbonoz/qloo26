export type WizardStep = "market" | "audience" | "concepts" | "preview" | "results";

export type ReferenceDraft = {
  name: string;
  why: string;
};

export const wizardSteps: { id: WizardStep; label: string; description: string }[] = [
  { id: "market", label: "Brand & market", description: "Set your starting point" },
  { id: "audience", label: "Goal & references", description: "Say what you want to do" },
  { id: "concepts", label: "Campaign ideas", description: "Optional concept review" },
  { id: "preview", label: "Review your brief", description: "Check before you run it" },
  { id: "results", label: "Your results", description: "Review your findings" },
];
