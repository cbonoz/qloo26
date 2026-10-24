import { afterEach, describe, expect, it, vi } from "vitest";
import { createDemoReport } from "./analysis";
import { createNarrative } from "./narrative";

function xaiResponse(value: unknown) {
  return new Response(JSON.stringify({
    output: [{
      type: "message",
      content: [{ type: "output_text", text: JSON.stringify(value) }],
    }],
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

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
      comparison: [],
      conceptIdeas: [],
    };
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      void _input;
      void _init;
      return xaiResponse(generated);
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
    const input = body.input as Array<{ content: string }>;
    expect(JSON.parse(input[1].content)).toMatchObject({
      qlooScoreDetails: { directMatches: 3, totalReferences: 3, bestRank: 2 },
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
    expect(result.conceptIdeas?.length).toBeGreaterThan(0);
  });

  it("returns ranked first tests when the user supplies no campaign ideas", async () => {
    vi.stubEnv("XAI_API_KEY", "test-xai-key");
    const generated = {
      summary: "A test summary.",
      strengths: ["A test strength."],
      risks: ["A test risk."],
      recommendations: ["One", "Two", "Three"],
      comparison: [],
      conceptIdeas: [
        { name: "First idea", score: 72, rationale: "Matches the strongest reference.", firstTest: "Run one workshop." },
        { name: "Second idea", score: 55, rationale: "Weaker overlap.", firstTest: "Run one pop-up." },
      ],
    };
    vi.stubGlobal("fetch", vi.fn(async () => xaiResponse(generated)));

    const result = await createNarrative(createDemoReport());

    expect(result.conceptIdeas?.map((idea) => idea.name)).toEqual(["First idea", "Second idea"]);
    expect(result.conceptIdeas?.[0].firstTest).toBe("Run one workshop.");
    expect(result.comparison).toBeUndefined();
  });

  it("returns the model comparison when the user supplies two campaign ideas", async () => {
    vi.stubEnv("XAI_API_KEY", "test-xai-key");
    const generated = {
      summary: "A test summary.",
      strengths: ["A test strength."],
      risks: ["A test risk."],
      recommendations: ["One", "Two", "Three"],
      comparison: [
        { name: "Concept A", score: 70, rationale: "Beats B because it matches the strongest reference." },
        { name: "Concept B", score: 48, rationale: "Ranks behind A because no reference returned the brand." },
      ],
      conceptIdeas: [],
    };
    vi.stubGlobal("fetch", vi.fn(async () => xaiResponse(generated)));

    const result = await createNarrative(createDemoReport(), ["Concept A", "Concept B"]);

    expect(result.comparison?.map((item) => item.name)).toEqual(["Concept A", "Concept B"]);
    expect(result.conceptIdeas).toBeUndefined();
  });
});
