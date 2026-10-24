import { cachedExample, cachedExampleCampaigns } from "@/lib/cached-example";

const { report } = cachedExample;
const strongestMatch = report.evidence
  .filter((item) => item.targetRank !== null)
  .sort((a, b) => (a.targetRank ?? 0) - (b.targetRank ?? 0))[0];
const recommended = report.comparison
  ? (report.comparison[0].score >= report.comparison[1].score ? report.comparison[0] : report.comparison[1])
  : null;
const capturedDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
  .format(new Date(cachedExample.capturedAt));

export function ExamplePreview({ onStart }: { onStart: () => void }) {
  return (
    <section className="landing-example" id="example">
      <div className="landing-section-heading example-section-heading">
        <div><span className="small-kicker">EXAMPLE BRIEF</span><h2>See how signals shape<br />a first marketing test.</h2></div>
        <p>Qloo snapshot from {capturedDate}. Not live results or evidence of demand.</p>
      </div>

      <article className="example-report-card">
        <div className="example-report-header">
          <div><span className="data-badge demo-badge"><i />QLOO SNAPSHOT</span><h3>{report.brand.name}<span> × </span>{report.marketResolved || report.market}</h3></div>
          <div className="example-score"><strong>{report.score}</strong><span>/ 100<br />reference overlap</span></div>
        </div>
        {report.goal && <p className="example-use-case"><span>THE GOAL</span> {report.goal}</p>}
        <p className="example-use-case"><span>THE DECISION</span> IKEA in Seoul: small-space workshop or repair-and-swap event?</p>
        <p className="example-summary">{report.directHits === 0 ? `No direct overlap across these ${report.signalCount} references. A gap to investigate—not a verdict on the idea.` : `${report.brand.name} appears for ${report.directHits} of ${report.signalCount} references${strongestMatch ? `; strongest is ${strongestMatch.name} (rank ${(strongestMatch.targetRank ?? 0) + 1}).` : "."}`}</p>
        <div className="example-cues-heading"><span>Cultural references</span><span>Rank at capture</span></div>
        <div className="example-cues-list">
          {report.evidence.map((item, index) => (
            <div className="example-cue-row" key={item.entityId}>
              <span className={`signal-avatar signal-avatar-${index % 4}`}>{item.name.slice(0, 1).toUpperCase()}</span>
              <strong>{item.name}</strong>
              <span className="example-cue-rank">{item.targetRank === null ? "No match" : `#${item.targetRank + 1}`}</span>
            </div>
          ))}
        </div>
        <div className="example-concepts">
          <span>CAMPAIGN OPTIONS</span>
          {cachedExampleCampaigns.map((campaign, index) => <div key={campaign}><b>0{index + 1}</b>{campaign}</div>)}
        </div>
        <div className="example-decision"><span>WHAT TO TEST FIRST</span><p>{recommended ? <><strong>{recommended.name}</strong> — {recommended.rationale}</> : report.recommendations[0]}</p></div>
        <div className="example-report-footer"><span>Snapshot—not a live market check.</span><button type="button" onClick={onStart}>Build your brief <span>↗</span></button></div>
      </article>
    </section>
  );
}
