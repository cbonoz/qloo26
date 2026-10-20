import { createDemoReport } from "@/lib/analysis";

const example = createDemoReport();

export function ExamplePreview({ onStart }: { onStart: () => void }) {
  return (
    <section className="landing-example" id="example">
      <div className="landing-section-heading example-section-heading">
        <div><span className="small-kicker">EXAMPLE BRIEF</span><h2>See the signals behind a brief.</h2></div>
        <p>Illustrative only—not live Qloo data or evidence of demand.</p>
      </div>

      <article className="example-report-card">
        <div className="example-report-header">
          <div><span className="data-badge demo-badge"><i />ILLUSTRATIVE EXAMPLE</span><h3>{example.brand.name}<span> × </span>{example.marketResolved || example.market}</h3></div>
          <div className="example-score"><strong>{example.score}</strong><span>/ 100<br />sample overlap</span></div>
        </div>
        <p className="example-summary">In this sample, Aesop appears in related-brand results for all three cues in Tokyo.</p>
        <div className="example-cues-heading"><span>Culture cues</span><span>Sample brand rank</span></div>
        <div className="example-cues-list">
          {example.evidence.map((item, index) => (
            <div className="example-cue-row" key={item.entityId}>
              <span className={`signal-avatar signal-avatar-${index % 4}`}>{item.name.slice(0, 1).toUpperCase()}</span>
              <strong>{item.name}</strong>
              <span className="example-cue-rank">{item.targetRank === null ? "No direct match" : `#${item.targetRank + 1} in sample`}</span>
            </div>
          ))}
        </div>
        <div className="example-report-footer"><span>Example only. Your results use your inputs.</span><button type="button" onClick={onStart}>Build your brief <span>↗</span></button></div>
      </article>
    </section>
  );
}
