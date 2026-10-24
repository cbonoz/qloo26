# LaunchLens example scenarios

These are three planning exercises where a team has two market-entry moves and wants LaunchLens to recommend which one to test first using Qloo’s cultural signals. They are illustrative hypotheses, not predictions of demand or campaign performance.

Only **Scenario 1** has a bundled snapshot and works without API credentials. Scenarios 2 and 3 run live and their evidence can change between runs. All reference names below were checked against Qloo entity search during preparation.

## At a glance

| # | Brand | Market | Decision | Demo mode |
|---|-------|--------|----------|-----------|
| 1 | IKEA | Seoul, South Korea | Design workshop vs. repair-and-swap event | Cached snapshot; no API call |
| 2 | Toys R Us | London, United Kingdom | Character-led roadshow vs. LEGO play lab | Live Qloo + AI |
| 3 | Walmart | Berlin, Germany | Physical value-grocery pilot vs. marketplace-first launch | Live Qloo + AI |

---

## 1. IKEA in Seoul — small-space living

**The decision:** Which first activity better connects IKEA’s compact-living proposition with Seoul renters?

### Inputs

- **Brand:** IKEA
- **Market:** Seoul, South Korea
- **Goal:** Launch a small-space furniture line for people living in compact homes in Seoul.
- **Cultural references:** MUJI, Parasite, Blue Bottle Coffee

### How the references are used

These are starting points for Qloo’s related-brand check, not assumptions about what people in Seoul like and not a list to validate with an audience. They stand in for the cultural territory each campaign idea would enter. For each reference, Qloo returns a set of related brands in Seoul. LaunchLens records whether IKEA appears in that list and at what rank. A missing IKEA is recorded as a gap. The lists can include competitors or adjacent brands, but the check is about cultural overlap—not counting competitors. A match is a signal to interpret, not a recommendation to partner with that brand—especially when it is a competitor.

### The two options

- **Option A:** Small-Space Design Workshop
- **Option B:** Repair-and-Swap Weekend

### What the cached demo shows

The bundled snapshot was captured on **October 21, 2026**:

- Cultural signal score: **10/100** — limited observed overlap. This is an average across all three references, not a market grade.
- IKEA appears for **1 of 3** references.
- MUJI is the only direct match: IKEA ranks **#15 of 20**.
- Parasite and Blue Bottle Coffee return **no direct IKEA match**.
- Recommendation: **Small-Space Design Workshop first** (68 vs. 58 for the repair-and-swap event).

### What to look for

The app is not saying IKEA is unpopular in Seoul. It is saying the evidence for these three references is thin: IKEA appears in one list and not the other two, and the one appearance is mid-list. The low score combines those gaps and that rank. The workshop is the stronger first test because it builds on the only direct overlap. The gaps are just as useful: they identify what the team should validate with local customers.

### Why it is a good demo

- One clear winner, but a low score — it shows the product is not just agreeing with the user.
- It makes evidence, rank, and gaps visible in one screen.
- It is cached, so the demo is fast and reliable.

> Use **Fill demo data** to reproduce this exact result. Typing the same brief manually runs a live check instead of using the snapshot.

---

## 2. Toys R Us in London — character-led vs. play-led return

**The decision:** Which first move better reintroduces Toys R Us to London families as a play-first destination, not just an online store?

### Inputs

- **Brand:** Toys R Us
- **Market:** London, United Kingdom
- **Goal:** Reintroduce Toys R Us to London families as a play-first destination, not just an online store.
- **Cultural references:** Paddington, Peppa Pig, LEGO

### The two options

- **Option A:** A Paddington and Peppa Pig story-time roadshow with London libraries
- **Option B:** A LEGO build-and-play lab in a London retail unit

### What the app is deciding

Whether Toys R Us has a stronger cultural bridge with **character-led family entertainment** or **hands-on construction play**:

- If Toys R Us appears for **Paddington** or **Peppa Pig** but not LEGO, the story-time roadshow has the clearer character bridge.
- If **LEGO** is the only or strongest direct overlap, the build-and-play lab has the clearer product and retail bridge.
- If all three are gaps, the app should say the evidence is thin — favor the cheaper, faster test and validate the gap directly.

### What to look for

- Which references return Toys R Us at all, and at what rank.
- Whether the recommendation cites a specific reference rather than generic “family fun” language.
- Whether the app distinguishes character IP from a partner brand.
- Qloo resolves the input **Toys R Us** as `Toys "R" Us` and **LEGO** as `The Lego Group`; the resolved-entity row may show those names.

### Why it is a good demo

It compares two credible revival formats — broad character IP versus a hands-on retail partner — and asks which one gives the brand a stronger first bridge to London families. It also shows that Qloo can compare different cultural territories, not just competitor brands.

> This scenario runs live. The library roadshow and LEGO lab are hypothetical campaign ideas, not announced partnerships. Treat the result as a hypothesis.

---

## 3. Walmart in Berlin — physical value grocery vs. marketplace-first re-entry

**The decision:** If Walmart re-entered Berlin, which first move better tests demand: a physical value-grocery pilot or a marketplace-first launch?

### Inputs

- **Brand:** Walmart
- **Market:** Berlin, Germany
- **Goal:** Test whether Walmart should re-enter Berlin with a physical value-grocery format or a marketplace-first launch.
- **Cultural references:** Lidl, ALDI, Zalando

### The two options

- **Option A:** A physical value-grocery pilot in a Berlin suburb
- **Option B:** A marketplace-first launch with Berlin SMEs

### What the app is deciding

Whether Walmart’s stronger observed adjacency is with **German value grocery** or **online retail**:

- If Walmart appears for **Lidl** or **ALDI**, the physical value-grocery pilot has the clearer category bridge.
- If Walmart appears for **Zalando**, the marketplace-first launch has the clearer channel bridge.
- If all three are gaps, the app should say the evidence is thin — choose the cheaper, faster test and validate local trust and assortment directly.

### What to look for

- Which references return Walmart at all, and at what rank.
- Whether the recommendation distinguishes category adjacency from channel adjacency.
- Whether the app treats Walmart’s prior German exit as context, not a verdict.

### Why it is a good demo

It is a real re-entry thought experiment with two fundamentally different strategies. Walmart exited the German market in 2006, so the scenario has a memorable strategic backstory. The comparison also shows LaunchLens weighing a physical retail entry against a marketplace entry, rather than two versions of the same campaign.

> This scenario runs live and is hypothetical. It is not a claim about Walmart’s current plans. The 2006 exit is factual context, not a prediction.

---

## What makes a good scenario

A strong LaunchLens scenario usually has:

1. **Two credible options** with a real budget or timing trade-off.
2. **Two to four specific cultural references** — artists, films, TV shows, brands, or places. Avoid demographics and generic traits.
3. **A goal that steers the recommendation**, so the AI does not optimize for a generic version of the brand.
4. **A market with location-aware Qloo coverage**, such as a major city.
5. **A decision worth making** — the result should change what the team tests next.

## Reading the result

- **The score is rank-based overlap**, not market size, demand, or launch readiness.
- **The AI comparison is an interpretation** of the Qloo evidence, not a Qloo score.
- **A low score is not a rejection.** It means no direct overlap was found in this small reference set.
- **The recommendation is a hypothesis** to validate with local audience research, not a forecast.

For a presenter walkthrough, see [NOTES.md](NOTES.md).
