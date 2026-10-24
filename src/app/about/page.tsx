import type { Metadata } from "next";
import Link from "next/link";
import styles from "./about.module.css";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "About LaunchLens — Market Entry Sanity Check",
  description: "About LaunchLens, a Qloo Agentic Hackathon prototype for exploring cultural connections in new markets.",
};

export default function AboutPage() {
  return (
    <div className="about-page">
      <header className="about-header">
        <Link className="brand-lockup" href="/" aria-label="LaunchLens home">
          <span className="brand-mark"><span /><span /><span /><span /></span>
          <span className="brand-word">Launch<span>Lens</span></span>
        </Link>
        <Link className="about-back-link" href="/">Back to market check <span>↗</span></Link>
      </header>

      <main className="about-main">
        <div className="eyebrow"><span className="eyebrow-line" />ABOUT LAUNCHLENS</div>
        <h1>Market entry deserves<br /><em>more than a hunch.</em></h1>
        <p className="about-lede">LaunchLens is a prototype built for the <a href="https://qloo.devpost.com/" target="_blank" rel="noreferrer">Qloo Agentic Hackathon</a>. It explores how cultural intelligence can help teams ask better questions before entering a new market.</p>

        <section className="about-prose-section">
          <h2>A cultural first check for new markets</h2>
          <p>When a brand considers entering a new city or country, teams need to understand more than the size of a category. They also want to know whether the brand’s cultural associations may connect with the people and places they hope to reach. LaunchLens is designed to make that question easier to explore.</p>
          <p>A user provides a brand or product, a target market, and what they are trying to do there. LaunchLens suggests cultural references to check—artists, films, brands, or places the audience may know—and the user can edit that list. Qloo then finds location-aware associations, and LaunchLens explains the connections and gaps.</p>
          <p>From there, teams can compare two campaign ideas they provide and get a clear recommendation with the reasoning behind it, or leave them blank and receive ranked first tests built from the cultural signals. The recommendation and the rankings come from the AI provider, not from Qloo. The goal is to help choose what to test first—and understand why.</p>
          <p>This is deliberately a sanity check, not a market-entry recommendation. Cultural associations can help a team form a sharper hypothesis, but they do not establish local awareness, demand, distribution readiness, or likely sales.</p>
        </section>

        <section className="about-section" id="methodology">
          <div className="about-section-heading">
            <span className="small-kicker">HOW THE PROTOTYPE WORKS</span>
            <h2>From cultural references to a market brief.</h2>
            <p className="about-section-lede">Each step keeps the retrieved data separate from the interpretation built on top of it.</p>
          </div>
          <div className="about-steps">
            <article className="about-step"><span className="about-step-number">01</span><h3>Resolve the inputs</h3><p>LaunchLens can suggest cultural references from your goal, and you can edit the list before the check runs. Qloo Search then resolves the brand and each cultural reference to Qloo entities, and the brief shows which entities were resolved.</p></article>
            <article className="about-step"><span className="about-step-number">02</span><h3>Apply market context</h3><p>Each Qloo Insights request uses the cultural reference together with the target market’s location query to retrieve local-context brand results.</p></article>
            <article className="about-step"><span className="about-step-number">03</span><h3>Calculate overlap</h3><p>The score averages where the brand appears across all selected references. A missing reference counts as zero, so a low score can mean a gap or a low rank—not a weak brand. The per-reference rows stay visible so the number can be checked.</p></article>
            <article className="about-step"><span className="about-step-number">04</span><h3>Choose what to test</h3><p>Compare two user-provided campaign ideas and get a recommendation with the reasoning behind it, or get ranked first tests when you leave them blank. The comparison needs the AI provider to be configured. AI interpretation does not predict performance.</p></article>
          </div>
          <div className="method-formula"><div><span className="small-kicker">THE CULTURAL SIGNAL SCORE</span><strong>Mean position across references</strong></div><p>Each reference contributes the brand’s position in its related-brand list; no match contributes 0. The score averages across all references, so it reflects both coverage and rank. One rank-1 match with two gaps scores about 33; three mid-list matches can score around 50. A low score is a prompt to inspect the rows, not a verdict on the brand or market.</p></div>
        </section>

        <section className="about-section" id="qloo-evidence">
          <div className="about-section-heading">
            <span className="small-kicker">THE EVIDENCE LAYER</span>
            <h2>What Qloo returns—and why it changes the conversation.</h2>
            <p className="about-section-lede">A trimmed, illustrative snippet from the Qloo Insights call behind the IKEA Seoul example. Entity IDs are shortened, and this is not a live response.</p>
          </div>
          <div className={styles.evidenceGrid}>
            <div className={styles.codeCard}>
              <div className={styles.codeHeader}><span>QLOO INSIGHTS · ILLUSTRATIVE</span><span>JSON</span></div>
              <div className={styles.codeRequest}>GET /v2/insights · MUJI × Seoul</div>
              <pre className={styles.codeBlock}><code>{`{
  "query": {
    "localities": {
      "signal": {
        "name": "Seoul",
        "entity_id": "loc_8f2a…"
      }
    }
  },
  "results": {
    "entities": [
      { "name": "Beams", "entity_id": "brand_01…" },
      { "name": "Niko And...", "entity_id": "brand_02…" },
      { "name": "Urban Research", "entity_id": "brand_03…" }
    ]
  }
}`}</code></pre>
              <p className={styles.codeNote}>Trimmed to the first three related brands. IKEA appears at <strong>#15 of 20</strong> for MUJI, outside this snippet. Not a live response.</p>
            </div>
            <div className={styles.evidenceBreakdown}>
              <article className={styles.valueCard}><span>01</span><div><h3>Location-aware</h3><p>The <code>query.localities.signal</code> resolves to Seoul. Every related-brand list is scoped to that market—not a global average.</p></div></article>
              <article className={styles.valueCard}><span>02</span><div><h3>Cross-category</h3><p><code>signal.interests.entities</code> can be a brand, film, artist, or place. The same response shape works whether the reference is MUJI, Parasite, or Seoul Forest.</p></div></article>
              <article className={styles.valueCard}><span>03</span><div><h3>Ranked, not binary</h3><p>LaunchLens looks for the target brand in <code>results.entities</code> and records its position. #15 is a weak signal; <code>null</code> is a gap to investigate—not a rejection.</p></div></article>
              <p className={styles.evidenceNote}>Qloo retrieves the evidence. LaunchLens and the AI provider interpret it; the recommendation is not a Qloo score.</p>
            </div>
          </div>
        </section>

        <section className="about-section" id="where-it-fits">
          <div className="about-section-heading">
            <span className="small-kicker">THE LANDSCAPE</span>
            <h2>Different tools answer different questions.</h2>
            <p className="about-section-lede">LaunchLens is a cultural-context layer for early exploration—not a replacement for audience research, market sizing, or social listening.</p>
          </div>
          <div className={styles.competitorGrid}>
            <article className={styles.competitorCard}>
              <span className={styles.competitorCategory}>AUDIENCE RESEARCH</span>
              <h3><a href="https://www.gwi.com/platform" target="_blank" rel="noreferrer">GWI ↗</a></h3>
              <p>GWI describes a survey-based platform for profiling and comparing audiences. That is useful when a team needs reported behaviors, attitudes, and segment detail. LaunchLens adds a fast Qloo-based view of how selected cultural references connect with a brand in a chosen locality; it does not replace representative survey research.</p>
            </article>
            <article className={styles.competitorCard}>
              <span className={styles.competitorCategory}>DIGITAL MARKET INTELLIGENCE</span>
              <h3><a href="https://www.similarweb.com/corp/web/market-intelligence/" target="_blank" rel="noreferrer">Similarweb ↗</a></h3>
              <p>Similarweb focuses on digital market size, demand, competition, geography, and online audience behavior. LaunchLens does not estimate traffic or market opportunity. It adds a different question: which cultural connections in a target market are worth testing alongside those business metrics?</p>
            </article>
            <article className={styles.competitorCard}>
              <span className={styles.competitorCategory}>SOCIAL LISTENING</span>
              <h3><a href="https://www.brandwatch.com/products/listen/" target="_blank" rel="noreferrer">Brandwatch ↗</a></h3>
              <p>Brandwatch Listen monitors public online conversations, trends, and sentiment. LaunchLens is not a listening tool and does not measure what people are saying. It uses Qloo’s cross-category cultural relationships to explore how a brand may connect with chosen cultural references and a location.</p>
            </article>
          </div>
          <div className={styles.launchlensDifference}>
            <span className="small-kicker">THE LAUNCHLENS LENS</span>
            <p>Start with a brand, a goal, and a market. Qloo supplies location-aware cultural connections; LaunchLens makes the evidence visible and turns it into a ranked first test to investigate. Use it alongside established research and market data—not instead of them.</p>
            <a href="https://www.qloo.com/capabilities" target="_blank" rel="noreferrer">How Qloo describes its cultural intelligence capabilities ↗</a>
          </div>
        </section>

        <section className="about-section about-limits" id="privacy">
          <div className="about-section-heading">
            <span className="small-kicker">DATA, PRIVACY &amp; LIMITS</span>
            <h2>What LaunchLens does—and doesn’t—claim.</h2>
          </div>
          <div className="about-prose-section about-prose-inset">
            <p>The brand, market, goal, and cultural references are sent to Qloo for entity resolution and insights. If xAI is configured, LaunchLens also sends the goal and report context with Qloo results to xAI to suggest references and generate narrative guidance. Those requests set <code>store: false</code>. LaunchLens does not create user accounts or save reports; results stay in the current page session. Do not enter personal or confidential information.</p>
            <p>Qloo may resolve an ambiguous name or location to a result that is not the one you intended, so check the resolved entities in the brief. The score is based on a small set of cultural references and a limited result list; it is not a statistically representative audience sample, market-wide census, or forecast.</p>
            <p>Promising connections and gaps are starting points for research, not claims of endorsement or compatibility. Validate them with local audience research and real-world outcomes before making launch or campaign decisions.</p>
          </div>
          <p className="about-source-note">Built for the Qloo Agentic Hackathon. Read the <a href="https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide" target="_blank" rel="noreferrer">Qloo API guide</a> for details about the provider data.</p>
        </section>

        <section className="about-cta">
          <div><span className="small-kicker">READY TO EXPLORE?</span><h2>Start with a market you’re considering.</h2></div>
          <Link className="about-cta-button" href="/">Open LaunchLens <span>↗</span></Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
