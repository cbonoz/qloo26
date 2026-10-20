import { afterEach, describe, expect, it, vi } from "vitest";
import { createDemoReport } from "./analysis";
import { createNarrative } from "./narrative";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("xAI narrative provider", () => {
  it("calls the xAI Responses API without storing prompts or results", async () => {
    vi.stubEnv("XAI_API_KEY", "test-xai-key");
    vi.stubEnv("XAI_MODEL", "grok-4.7");
    const generated = {
      summary: "A test summary grounded in the supplied evidence.",
      strengths: ["A test strength."],
      risks: ["A test hypothesis."],
      recommendations: ["One", "Two", "Three"],
    };
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      void _input;
      void _init;
      return new Response(JSON.stringify({
        output: [{
          type: "message",
          content: [{ type: "output_text", text: JSON.stringify(generated) }],
        }],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await createNarrative(createDemoReport());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.x.ai/v1/responses");
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("Authorization")).toBe("Bearer test-xai-key");
    const body = JSON.parse(String(request.body)) as Record<string, unknown>;
    expect(body.model).toBe("grok-4.7");
    expect(body.store).toBe(false);
    expect(body.text).toMatchObject({
      format: {
        type: "json_schema",
        name: "launchlens_market_entry_report",
        strict: true,
      },
    });
    expect(result.aiAssisted).toBe(true);
    expect(result.summary).toBe(generated.summary);
  });

  it("keeps evidence-based fallback behavior when no xAI key is configured", async () => {
    vi.stubEnv("XAI_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await createNarrative(createDemoReport());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.aiAssisted).toBe(false);
    expect(result.recommendations).toHaveLength(3);
  });
});
