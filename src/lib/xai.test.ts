import { afterEach, describe, expect, it, vi } from "vitest";
import { requestXaiJson } from "./xai";

const request = {
  system: "Use the evidence.",
  user: "Return a JSON object.",
  schema: { type: "object", properties: {}, additionalProperties: false },
  schemaName: "test_response",
  reasoningEffort: "low" as const,
};

function xaiResponse(value: unknown) {
  return new Response(JSON.stringify({
    output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(value) }] }],
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("requestXaiJson", () => {
  it("does not retry a rate-limited request", async () => {
    vi.stubEnv("XAI_API_KEY", "test-key");
    const fetchMock = vi.fn(async () => new Response("rate limited", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestXaiJson(request)).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries without reasoning only when the model rejects the request shape", async () => {
    vi.stubEnv("XAI_API_KEY", "test-key");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("unsupported reasoning", { status: 400 }))
      .mockResolvedValueOnce(xaiResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestXaiJson(request)).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
