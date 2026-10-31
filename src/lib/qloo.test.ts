import { describe, expect, it } from "vitest";
import { displayResolvedBrandName } from "./qloo";

describe("displayResolvedBrandName", () => {
  it("preserves submitted capitalization for a matching short acronym", () => {
    expect(displayResolvedBrandName("JBL", "Jbl")).toBe("JBL");
  });

  it("keeps Qloo's canonical name when the submitted name is not an acronym", () => {
    expect(displayResolvedBrandName("Starbucks", "Starbucks Coffee Company")).toBe("Starbucks Coffee Company");
    expect(displayResolvedBrandName("JBL", "JBL Audio Systems")).toBe("JBL Audio Systems");
  });
});
