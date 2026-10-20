type UnknownRecord = Record<string, unknown>;

export type QlooEntity = {
  name: string;
  entityId: string;
};

export type RelatedBrandsResult = {
  brands: Array<QlooEntity & { popularity: number | null }>;
  locality: QlooEntity | null;
};

export class QlooApiError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "QlooApiError";
  }
}

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" ? (value as UnknownRecord) : null;
}

function responseEntities(payload: unknown): UnknownRecord[] {
  const root = asRecord(payload);
  const results = asRecord(root?.results);
  const candidates = [results?.entities, root?.entities, root?.results, payload];
  const array = candidates.find(Array.isArray);
  return Array.isArray(array)
    ? array.map(asRecord).filter((item): item is UnknownRecord => item !== null)
    : [];
}

function responseLocality(payload: unknown): QlooEntity | null {
  const root = asRecord(payload);
  const query = asRecord(root?.query);
  const localities = asRecord(query?.localities ?? query?.locality);
  const signal = asRecord(localities?.signal);
  return signal ? normalizeQlooEntity(signal) : null;
}

export function normalizeQlooEntity(value: UnknownRecord): QlooEntity | null {
  const entityId = value.entity_id ?? value.id ?? value.entityId;
  const name = value.name;
  if (typeof entityId !== "string" || typeof name !== "string") return null;
  return { name, entityId };
}

function getApiKey() {
  const key = process.env.QLOO_API_KEY;
  if (!key) {
    throw new QlooApiError("Qloo API key is not configured. Add QLOO_API_KEY to .env.local.", 503);
  }
  return key;
}

async function requestQloo(path: string, params: URLSearchParams) {
  const url = new URL(path, process.env.QLOO_BASE_URL || "https://hackathon.api.qloo.com");
  url.search = params.toString();

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "X-Api-Key": getApiKey(), Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof QlooApiError) throw error;
    throw new QlooApiError("Could not reach Qloo. Check your connection and try again.", 502);
  }

  if (!response.ok) {
    const detail = response.status === 401
      ? "Qloo rejected the API key. Confirm it is a hackathon key for hackathon.api.qloo.com."
      : response.status === 429
        ? "Qloo rate limit reached. Wait a moment and retry."
        : `Qloo returned an error (${response.status}). Verify the query parameters and try again.`;
    throw new QlooApiError(detail, response.status === 401 ? 401 : response.status === 429 ? 429 : 502);
  }

  return response.json() as Promise<unknown>;
}

export async function searchEntities(query: string, type?: string) {
  const params = new URLSearchParams({ query, take: "5" });
  if (type) params.set("types", type);
  const payload = await requestQloo("/search", params);
  return responseEntities(payload)
    .map(normalizeQlooEntity)
    .filter((entity): entity is QlooEntity => entity !== null);
}

export async function getRelatedBrands(entityId: string, take = 20, locationQuery?: string): Promise<RelatedBrandsResult> {
  const params = new URLSearchParams({
    "filter.type": "urn:entity:brand",
    "signal.interests.entities": entityId,
    take: String(take),
  });
  if (locationQuery) params.set("signal.location.query", locationQuery);
  const payload = await requestQloo("/v2/insights", params);
  const brands = responseEntities(payload)
    .map((entity) => {
      const normalized = normalizeQlooEntity(entity);
      return normalized ? { ...normalized, popularity: typeof entity.popularity === "number" ? entity.popularity : null } : null;
    })
    .filter((entity): entity is QlooEntity & { popularity: number | null } => entity !== null);
  return { brands, locality: locationQuery ? responseLocality(payload) : null };
}
