import { Icon } from "@/components/launch-lens/icon";

export function SetupGuide() {
  return (
    <div className="setup-guide-card">
      <div className="setup-guide-art"><span className="guide-orbit"><i /><i /><i /><b>Q</b></span><span className="guide-art-caption">CULTURE × MARKET</span></div>
      <span className="small-kicker">WHAT YOU’LL GET</span>
      <h2>A clearer first look at a new market.</h2>
      <p>Connect your brand to Qloo signals and the culture cues you choose.</p>
      <div className="guide-outcomes">
        <div><span className="guide-check"><Icon name="check" size={12} /></span><span><strong>Evidence</strong><small>See which cues connect.</small></span></div>
        <div><span className="guide-check"><Icon name="check" size={12} /></span><span><strong>Local context</strong><small>Review signals for your target market.</small></span></div>
        <div><span className="guide-check"><Icon name="check" size={12} /></span><span><strong>Next steps</strong><small>Get ideas to test with your audience.</small></span></div>
      </div>
      <div className="guide-footnote"><span className="empty-live-dot" /> Draft inputs stay in this tab. Reports aren’t saved.</div>
    </div>
  );
}
