import type { Metadata } from "next";
import Link from "next/link";
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
          <p>A user provides a brand or product, a target market, and a few audience cues—such as artists, films, publications, brands, or places. LaunchLens uses Qloo to resolve those inputs and retrieve location-aware brand affinities. The result is a concise brief showing observed connections, possible gaps, and ideas worth testing.</p>
          <p>This is deliberately a sanity check, not a market-entry recommendation. Cultural affinity can help a team form a sharper hypothesis, but it does not establish local awareness, demand, distribution readiness, or likely sales.</p>
        </section>

        <section className="about-section" id="methodology">
          <div className="about-section-heading">
            <span className="small-kicker">HOW THE PROTOTYPE WORKS</span>
            <h2>From cultural cues to a market brief.</h2>
            <p className="about-section-lede">Each step keeps the retrieved data separate from the interpretation built on top of it.</p>
          </div>
          <div className="about-steps">
            <article className="about-step"><span className="about-step-number">01</span><h3>Resolve the inputs</h3><p>Qloo Search resolves the brand and each audience cue to Qloo entities. LaunchLens shows which entities were selected.</p></article>
            <article className="about-step"><span className="about-step-number">02</span><h3>Apply market context</h3><p>Each Qloo Insights request uses the audience cue together with the target market’s location query to retrieve local-context brand results.</p></article>
            <article className="about-step"><span className="about-step-number">03</span><h3>Calculate overlap</h3><p>The score summarizes where the target brand appears in the related-brand lists. The report keeps the per-cue rankings visible.</p></article>
            <article className="about-step"><span className="about-step-number">04</span><h3>Frame what to test</h3><p>When configured, xAI turns the supplied evidence into a summary and testable hypotheses. It does not supply Qloo data or score the affinity itself.</p></article>
          </div>
          <div className="method-formula"><div><span className="small-kicker">THE SCORE</span><strong>Mean rank-based overlap</strong></div><p>For each culture cue, a rank-1 match in a 20-result list contributes 100; a rank-20 match contributes 5; and no direct match contributes 0. A missing match is not evidence that an audience dislikes the brand.</p></div>
        </section>

        <section className="about-section about-limits" id="privacy">
          <div className="about-section-heading">
            <span className="small-kicker">DATA, PRIVACY &amp; LIMITS</span>
            <h2>What LaunchLens does—and doesn’t—claim.</h2>
          </div>
          <div className="about-prose-section about-prose-inset">
            <p>The brand, market, and culture cues are sent to Qloo for entity resolution and insights. If xAI is configured, LaunchLens also sends the report context and Qloo results to xAI to generate narrative guidance. Those requests set <code>store: false</code>. LaunchLens does not create user accounts or save reports; results stay in the current page session. Do not enter personal or confidential information.</p>
            <p>Qloo may resolve an ambiguous name or location to a result that is not the one you intended, so check the resolved entities in the report. The score is based on a small set of user-provided cues and a limited result list; it is not a statistically representative audience sample, market-wide census, or forecast.</p>
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
