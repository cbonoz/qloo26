# LaunchLens demo script

A 5–6 minute walkthrough for the Qloo Agentic Hackathon. The goal is to land one decision, not to show every feature.

## What the demo should land

- A team entering a new market often has more ideas than budget.
- LaunchLens helps choose **which market-entry move to test first**.
- It can compare **two strategies you already have**.
- It can also generate **ranked first tests** when you have no ideas yet.
- The recommendation is grounded in Qloo’s cultural signals, with gaps shown.
- It is a hypothesis to investigate, not a demand forecast.

## The Qloo advantage — say this early

LaunchLens is not an LLM with a mood board. **Qloo is the evidence layer that makes the recommendation inspectable.**

**What Qloo adds**

- **Location-aware:** the same brand and reference can connect differently in Seoul, London, or Berlin. Qloo returns results for the selected market, not a single global average.
- **Cross-category:** it connects brands to artists, films, TV shows, brands, and places. That lets LaunchLens compare character-led, place-led, and partner-led strategies on one evidence base.
- **Ranked, not binary:** LaunchLens can show whether the brand appears at #3 or #15, or not at all. A gap becomes a question to validate, not a dead end.
- **Consistent:** every option is judged against the same Qloo results, so the comparison is not just whichever idea the AI described more persuasively.

**The unique perspective:** survey tools measure what people report; social listening measures what they post. Qloo maps cross-category cultural relationships by location. LaunchLens turns that map into a first move.

**Why that is an advantage for LaunchLens**

- It turns a subjective “which idea feels right?” debate into a structured first test.
- It can compare very different strategies — a LEGO lab versus a library roadshow, or a grocery pilot versus a marketplace — without pretending they are the same kind of campaign.
- It works when data is thin: a low score or no match is a useful finding, not a failure.
- It keeps the AI honest. Qloo supplies the observed cultural relationships; the AI explains them.

**Say it in one sentence:**

> “Qloo tells us whether — and how strongly — the cultural references connect to the brand in this market. The AI helps us read those connections and choose what to test first.”

**The contrast to use in the demo:**

- **Without Qloo:** an LLM can suggest culturally plausible ideas, but it cannot show whether they connect to the brand in this market.
- **With Qloo:** LaunchLens can show which references connect, at what rank, and where the gaps are — then compare two strategies on the same evidence.

## Before you start

1. Run the app:

   ```bash
   bun run dev
   ```

2. Confirm the integrations are available:

   ```bash
   curl -s http://localhost:3000/api/status
   ```

   Expected shape:

   ```json
   {"qlooConfigured":true,"xaiConfigured":true,"analysisEnabled":true}
   ```

3. Open `http://localhost:3000` in a fresh tab. A saved manual draft can reappear; click **New market check** if the form is prefilled.

4. Use **Fill demo data** for the reliable path. It loads the bundled IKEA/Seoul snapshot and makes **no API call** when the brief is unchanged.

5. Budget live runs. The app allows up to **3 analyses per IP per UTC day**. The cached demo does not count.

Keep [EXAMPLES.md](EXAMPLES.md) open if you want to switch to a live scenario.

---

## The 6-minute flow

### 0:00–0:30 — Frame the problem

**Say:**

> “When a team enters a new market, it usually has more ideas than budget. The hard question isn’t ‘what could we do?’ It’s ‘which move do we test first — and what evidence supports it?’”

### 0:30–1:15 — Open on the overview

**Do:** Stay on the Overview page.

**Say:**

> “LaunchLens starts with a brand, a market, and the goal. It suggests the cultural references to test, then uses Qloo’s location-aware signals to compare two options — or to propose ranked first tests if the team has none.”
>
> “Most AI tools can brainstorm ideas. Qloo is what lets LaunchLens check whether those ideas have a cultural bridge in this specific market.”

Point to the example card:

> “This is a real Qloo snapshot, captured October 21 and clearly labeled as a snapshot — not live results.”

### 1:15–1:45 — Load the brief

**Do:** Click **Start a market check**, then **Fill demo data**.

**Say:**

> “This is an IKEA Seoul brief. It’s cached: the unchanged brief opens a saved Qloo snapshot, so the demo still works if the API is slow.”

### 1:45–2:45 — Walk the inputs without breaking the cache

**Do:** Click **Back** twice to reach the goal and cultural references, then click **Continue** twice to return to the review step.

**Say:**

> “The goal is compact living. The references are MUJI, Parasite, and Blue Bottle Coffee — specific names to test, not assumptions about everyone in Seoul. The callout under the field explains why this matters: Qloo checks whether IKEA appears alongside each name in Seoul, and those matches and gaps become the evidence. The two options are a small-space design workshop and a repair-and-swap event.”

**Tip:** Do not edit a field while walking back. Navigating with Back/Continue preserves the cached demo. Any edit invalidates the snapshot and switches the final button to **Run market check**.

### 2:45–3:00 — Open the report

**Do:** On **Review your brief**, point out **View example report**, then click it.

**Say:**

> “Because this is the unchanged example, no API call is made. For a new brief, the same button reads ‘Run market check.’”

### 3:00–4:15 — Read the result

Point to each item in order:

1. **QLOO SNAPSHOT** and the captured date.
2. **10/100 cultural signal score** — explicitly “not market demand.”
3. **1 of 3 direct brand matches**.
4. **MUJI:** IKEA ranks **#15 of 20**.
5. **Parasite and Blue Bottle Coffee:** no direct IKEA match.
6. **Recommendation:** Small-Space Design Workshop first.

**Say:**

> “The app is not saying IKEA is unpopular. It’s saying the evidence is thin, and the workshop is the stronger first test because it builds on the only direct overlap. The gaps matter just as much — they tell the team what to validate.”

Then point to the caveat:

> “A hypothesis to test, not a forecast. Validate with people in Seoul before committing spend.”

### 4:15–5:00 — Show that it is not hard-coded

**Do:** Click **Edit brief**, change one reference or campaign, continue to the review step, and click **Run market check**.

**Say:**

> “Any edit invalidates the snapshot and runs a live check against Qloo. Same workflow, different evidence.”

The live run usually takes 10–30 seconds. If time is short, skip this and use the cached path as the reliability story.

### 5:00–5:30 — Close

**Say:**

> “LaunchLens doesn’t replace market sizing, audience research, or social listening. It gives the team a defensible first move — and the questions to validate next.”
>
> “Qloo supplies the cultural evidence. LaunchLens turns it into a move the team can defend.”

---

## Optional: show the “no ideas yet” path

The campaign comparison step is optional. To show the second mode:

1. Start a new check.
2. Enter a brand, market, goal, and 2–4 references.
3. On **Campaign comparison**, leave both options blank.
4. Continue to the review step and run the check.

The results show **Top ideas, ranked** with a first test for each, instead of a head-to-head verdict.

**Say:**

> “When the team has no ideas, the app doesn’t force a fake comparison. It proposes ranked first tests from the same evidence.”

---

## If something breaks

| Symptom | What to do |
| --- | --- |
| Live analysis is paused | Use the cached demo and explain the snapshot. |
| Qloo key is missing | The cached demo still works; live checks will show a setup message. |
| AI suggestions are unavailable | Type 2–4 specific references manually. |
| Rate limit or 429 | Switch to the cached demo. Do not retry in a loop. |
| Live run is slow | Narrate the evidence and the caveats; use the cached path if needed. |
| Wrong or stale draft appears | Click **New market check** or open a fresh tab. |

---

## Alternate live scenarios

Use [EXAMPLES.md](EXAMPLES.md) for the full inputs.

- **Toys R Us in London** — a character-led library roadshow vs. a LEGO build-and-play lab. Good for a character-IP-versus-partner-experience decision.
- **Walmart in Berlin** — a physical value-grocery pilot vs. a marketplace-first launch. Good for a category-versus-channel decision.

Both are live, hypothetical scenarios. Qloo resolves **Toys R Us** as `Toys "R" Us` and **LEGO** as `The Lego Group`, so the resolved-entity row may show those names.

Budget at most one alternate live run during a demo. The cached IKEA path is the reliable spine.

---

## Q&A

**“Is this just an LLM guessing?”**
No. Qloo supplies the observed brand ranks; the AI interprets them. The UI keeps the two distinct with labels like **LIVE QLOO DATA** and **AI-ASSISTED**.

**“Why is the score only 10/100?”**
IKEA appears at rank 15 of 20 for MUJI, and the other two references have no direct match. The score is the mean rank-based overlap across all three references — not a market-size score.

**“Does a low score mean don’t launch?”**
No. It means no direct overlap was found in this small reference set. That is a gap to investigate, not a verdict.

**“Why these cultural references?”**
They are the lenses Qloo uses to look for a brand’s connections in the market. The goal steers the AI’s suggestions, the user can edit the list, and different references can change the recommendation.

**“Does it save my data?”**
There are no accounts or report databases. Drafts stay in the tab; the demo snapshot is bundled with the app.

**“What would this be without Qloo?”**
An LLM with an opinion. Qloo adds location-aware, cross-category evidence: which references connect to the brand, at what rank, and where the gaps are. The AI explains that evidence; it doesn’t invent it.

**“What does Qloo actually do here?”**
It resolves the brand, market locality, and cultural references, then returns location-aware related-brand results. LaunchLens scores the target brand’s rank in those results and shows the evidence.
