import { afterEach, describe, expect, it, vi } from "vitest";
import { suggestCulturalReferences } from "./cues";

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
}

function xaiResponse(value: unknown) {
  return jsonResponse({ output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(value) }] }] });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("suggestCulturalReferences", () => {
  it("keeps only the suggestions Qloo can resolve and drops the brand itself", async () => {
    vi.stubEnv("XAI_API_KEY", "test-xai-key");
    vi.stubEnv("QLOO_API_KEY", "test-qloo-key");
    let xaiRequestBody = "";
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.host.includes("x.ai")) {
        xaiRequestBody = String(init?.body);
        return xaiResponse({
          references: [
            { name: "Muji", why: "Small-space design reference for the goal." },
            { name: "Unresolvable Thing", why: "Nobody knows this one." },
            { name: "IKEA", why: "The brand itself." },
          ],
        });
      }
      if (url.searchParams.get("types") === "urn:entity:brand") {
        return jsonResponse({ results: { entities: [{ entity_id: "ikea-id", name: "IKEA" }] } });
      }
      if (url.searchParams.get("query") === "Muji") {
        return jsonResponse({ results: { entities: [{ entity_id: "muji-id", name: "Muji" }] } });
      }
      return jsonResponse({ results: { entities: [] } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await suggestCulturalReferences({
      brand: "IKEA",
      market: "Seoul, South Korea",
      goal: "Launch a small-space furniture line in Seoul.",
    });

    expect(xaiRequestBody).toContain("prioritize specific brands from the target market");
    expect(result?.references.map((item) => item.name)).toEqual(["Muji"]);
    expect(result?.references[0].why).toContain("Small-space design");
    expect(result?.unresolved).toEqual(["Unresolvable Thing", "IKEA"]);
  });

  it("returns null when the model is not configured", async () => {
    vi.stubEnv("XAI_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await suggestCulturalReferences({ brand: "IKEA", market: "Seoul", goal: "Sell furniture." });

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null when the model returns nothing usable", async () => {
    vi.stubEnv("XAI_API_KEY", "test-xai-key");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.host.includes("x.ai")) return xaiResponse({ references: [] });
      return jsonResponse({ results: { entities: [] } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await suggestCulturalReferences({ brand: "IKEA", market: "Seoul", goal: "Sell furniture." });

    expect(result).toBeNull();
  });
});
