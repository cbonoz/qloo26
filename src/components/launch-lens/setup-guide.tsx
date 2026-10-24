import { Icon } from "@/components/launch-lens/icon";

export function SetupGuide() {
  return (
    <div className="setup-guide-card">
      <div className="setup-guide-art">
        <span className="guide-orbit"><i /><i /><i /><b>Q</b></span>
        <span className="guide-art-caption">CULTURE × MARKET</span>
      </div>
      <span className="small-kicker">WHAT YOU’LL GET</span>
      <h2>A clearer first look at a new market.</h2>
       <p>Tell us what you want to do in the new market. We suggest cultural references to check, then show you which idea to try first—and why.</p>
      <div className="guide-outcomes">
         <div><span className="guide-check"><Icon name="check" size={12} /></span><span><strong>References suggested</strong><small>Artists, films, brands, places.</small></span></div>
        <div><span className="guide-check"><Icon name="check" size={12} /></span><span><strong>Evidence</strong><small>See which references connect.</small></span></div>
        <div><span className="guide-check"><Icon name="check" size={12} /></span><span><strong>A ranked first test</strong><small>Know what to try, and why.</small></span></div>
      </div>
      <div className="guide-footnote"><span className="empty-live-dot" /> Draft inputs stay in this tab. Reports aren’t saved.</div>
    </div>
  );
}
