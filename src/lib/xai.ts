const XAI_RESPONSES_URL = "https://api.x.ai/v1/responses";

export type XaiJsonRequest = {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  schemaName: string;
  maxOutputTokens?: number;
  timeoutMs?: number;
  reasoningEffort?: "low" | "medium" | "high";
};

export function isXaiConfigured() {
  return Boolean(process.env.XAI_API_KEY?.trim());
}

export function xaiModel() {
  return process.env.XAI_MODEL?.trim() || "grok-4.7";
}

/** xAI returns assistant text inside an `output` array; pull the plain text out. */
export function responseText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";
  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const content = (item as { content?: unknown }).content;
      return Array.isArray(content) ? content : [];
    })
    .map((item) => item && typeof item === "object" ? (item as { text?: unknown }).text : null)
    .filter((text): text is string => typeof text === "string")
    .join("\n");
}

/**
 * Calls the xAI Responses API with a strict JSON schema and returns the parsed
 * object, or null when the model is unavailable or the response is unusable.
 * Prompts and results are never stored by that API (`store: false`).
 */
export async function requestXaiJson(request: XaiJsonRequest): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.XAI_API_KEY?.trim();
  if (!apiKey) return null;

  const body = (reasoningEffort?: XaiJsonRequest["reasoningEffort"]) => JSON.stringify({
    model: xaiModel(),
    store: false,
    input: [
      { role: "system", content: request.system },
      { role: "user", content: request.user },
    ],
    text: {
      format: {
        type: "json_schema",
        name: request.schemaName,
        strict: true,
        schema: request.schema,
      },
    },
    max_output_tokens: request.maxOutputTokens ?? 900,
    ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
  });

  try {
    let response = await fetch(XAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: body(request.reasoningEffort),
      signal: AbortSignal.timeout(request.timeoutMs ?? 20_000),
      cache: "no-store",
    });
    // Older models may reject the reasoning field. Retry only when the request
    // itself was rejected as invalid; retrying a rate limit or provider outage
    // would double the cost without improving the chance of success.
    if (!response.ok && request.reasoningEffort && (response.status === 400 || response.status === 422)) {
      response = await fetch(XAI_RESPONSES_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: body(undefined),
        signal: AbortSignal.timeout(request.timeoutMs ?? 20_000),
        cache: "no-store",
      });
    }
    if (!response.ok) return null;
    const text = responseText(await response.json());
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const value = JSON.parse(text.slice(start, end + 1)) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}
