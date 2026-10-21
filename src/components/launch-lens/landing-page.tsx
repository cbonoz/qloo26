import { Icon } from "@/components/launch-lens/icon";
import { ExamplePreview } from "@/components/launch-lens/example-preview";

export function LandingPage({ onStart }: { onStart: () => void }) {
  return (
    <>
      <section className="landing-hero">
        <div className="landing-copy">
          <div className="eyebrow"><span className="eyebrow-line" />FOR MARKETERS ENTERING NEW MARKETS</div>
          <h1>Choose your next<br /><em>marketing move.</em></h1>
          <p>Too many ideas, limited budget? Use cultural connections and gaps to choose what activity to test first—and why—before investing in a new market.</p>
          <div className="landing-actions">
            <button className="landing-primary-button" type="button" onClick={onStart}>Start a market check <Icon name="arrow" size={16} /></button>
            <a className="landing-secondary-link" href="#how-it-works">How it works <span>↓</span></a>
          </div>
          <div className="landing-trust-row"><span><Icon name="check" size={13} />No account needed</span><i /><span><Icon name="check" size={13} />Draft stays in this tab</span><i /><span><Icon name="check" size={13} />Powered by Qloo</span></div>
        </div>

        <div className="landing-visual" role="img" aria-label="Illustration of cultural signals connecting a brand and a new market">
          <div className="landing-visual-top"><span><i /> A NEW WAY TO READ A MARKET</span><span className="preview-mark">Q</span></div>
          <div className="landing-orbit-scene">
            <span className="orbit-ring orbit-ring-outer" />
            <span className="orbit-ring orbit-ring-inner" />
            <span className="orbit-line orbit-line-one" />
            <span className="orbit-line orbit-line-two" />
            <span className="orbit-node orbit-brand"><Icon name="sparkle" size={17} /><b>Your brand</b></span>
            <span className="orbit-node orbit-culture"><span className="culture-dot" /><b>Culture</b></span>
            <span className="orbit-node orbit-market"><span className="market-pin">↗</span><b>New market</b></span>
            <span className="orbit-signal signal-one">Music</span>
            <span className="orbit-signal signal-two">Food</span>
            <span className="orbit-signal signal-three">Design</span>
            <span className="orbit-signal signal-four">Places</span>
          </div>
          <div className="landing-visual-bottom"><span>BRAND</span><i /><span>CULTURAL SIGNALS</span><i /><span>MARKET</span></div>
          <div className="landing-visual-note">Exploration, not a demand prediction.</div>
        </div>
      </section>

      <section className="landing-how" id="how-it-works">
        <div className="landing-section-heading">
          <div><span className="small-kicker">HOW IT WORKS</span><h2>Find a smarter<br />first test.</h2></div>
          <p>When you can’t fund every idea, use signals to choose where to start.</p>
        </div>
        <div className="landing-feature-grid">
          <article className="landing-feature-card"><span className="landing-feature-number">01</span><span className="landing-feature-icon"><Icon name="report" size={17} /></span><h3>Ground your brief</h3><p>Name a brand, a market, and what you want to do there.</p></article>
          <article className="landing-feature-card"><span className="landing-feature-number">02</span><span className="landing-feature-icon"><Icon name="users" size={17} /></span><h3>See the connections</h3><p>We suggest the cultural references to test, then explore Qloo’s location-aware signals.</p></article>
          <article className="landing-feature-card"><span className="landing-feature-number">03</span><span className="landing-feature-icon"><Icon name="sparkle" size={17} /></span><h3>Choose what to test</h3><p>Get a clear recommendation on your two ideas—or ranked first tests if you have none.</p></article>
        </div>
      </section>

      <ExamplePreview onStart={onStart} />

      <section className="landing-bottom-cta">
        <div><span className="small-kicker">YOUR NEXT MARKET</span><h2>Start with a better question.</h2></div>
        <button className="landing-primary-button" type="button" onClick={onStart}>Build your brief <Icon name="arrow" size={16} /></button>
      </section>
    </>
  );
}
