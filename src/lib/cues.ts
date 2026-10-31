import { searchEntities } from "./qloo";
import { requestXaiJson } from "./xai";

export type CulturalReference = {
  name: string;
  why: string;
};

export type ReferenceSuggestionResult = {
  references: CulturalReference[];
  unresolved: string[];
};

const referenceSchema = {
  type: "object",
  properties: {
    references: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          why: { type: "string" },
        },
        required: ["name", "why"],
        additionalProperties: false,
      },
    },
  },
  required: ["references"],
  additionalProperties: false,
} as const;

const suggestionSystemPrompt = [
  "You help brand and strategy teams choose which cultural references to check in a new market.",
  "You are given a brand, a target market, and what the team wants to do there.",
  "Propose 2 to 4 cultural references to check. Every reference must be a specific, well-known proper noun that a cultural data provider can resolve as an entity: an artist, musician, film, TV series, brand, or place.",
  "Rules: never propose a generic category, demographic, or trait (no 'young people', 'premium', 'sustainable lifestyle'); never propose the brand itself; prefer references with real cultural relevance in the target market; keep each name short, unambiguous, and spelled the way a fan would write it.",
  "If the goal is explicitly about competing with local alternatives, prioritize specific brands from the target market when you can identify them confidently; do not substitute global competitors and call them local. If the goal does not name competition, provide a useful mix of culturally relevant references rather than a competitor list. Never imply the suggestions are exhaustive market research or guaranteed to match the target brand in Qloo.",
  "For each reference, write one short sentence explaining why it is a useful reference for this team's goal in this market.",
].join(" ");

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const cut = value.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function parseReferences(payload: Record<string, unknown> | null): CulturalReference[] {
  const raw = payload?.references;
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((item): CulturalReference[] => {
      if (!item || typeof item !== "object") return [];
      const option = item as Record<string, unknown>;
      if (typeof option.name !== "string" || typeof option.why !== "string") return [];
      const name = truncate(option.name.trim(), 80);
      if (!name) return [];
      return [{ name, why: truncate(option.why.trim(), 220) }];
    })
    .slice(0, 4);
}

/**
 * Asks the model for cultural references, then keeps only the ones Qloo can
 * actually resolve so the user never carries an unusable reference into a run.
 * Returns null when the model is unavailable or returns nothing usable.
 */
export async function suggestCulturalReferences(input: {
  brand: string;
  market: string;
  goal: string;
}): Promise<ReferenceSuggestionResult | null> {
  const suggestions = parseReferences(await requestXaiJson({
    system: suggestionSystemPrompt,
    user: JSON.stringify({
      brand: input.brand,
      targetMarket: input.market,
      goal: input.goal,
    }),
    schema: referenceSchema,
    schemaName: "launchlens_cultural_references",
    maxOutputTokens: 700,
    timeoutMs: 40_000,
    reasoningEffort: "low",
  }));

  if (suggestions.length === 0) return null;

  const brandMatches = await searchEntities(input.brand, "urn:entity:brand");
  const brandName = brandMatches[0]?.name?.toLowerCase() ?? input.brand.trim().toLowerCase();

  const unique = new Map<string, CulturalReference>();
  for (const suggestion of suggestions) {
    if (unique.has(suggestion.name.toLowerCase())) continue;
    unique.set(suggestion.name.toLowerCase(), suggestion);
  }

  const resolved = await Promise.all(
    [...unique.values()].map(async (suggestion) => {
      const matches = await searchEntities(suggestion.name);
      const entity = matches[0];
      return { suggestion, entity };
    }),
  );

  const references: CulturalReference[] = [];
  const unresolved: string[] = [];
  for (const { suggestion, entity } of resolved) {
    if (!entity) {
      unresolved.push(suggestion.name);
      continue;
    }
    if (entity.name.toLowerCase() === brandName) {
      unresolved.push(suggestion.name);
      continue;
    }
    references.push({ name: entity.name, why: suggestion.why });
  }

  if (references.length === 0) return null;
  return { references: references.slice(0, 4), unresolved };
}
