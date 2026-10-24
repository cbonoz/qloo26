import type { CSSProperties } from "react";
import { Icon } from "@/components/launch-lens/icon";
import { describeAlignmentScore, getBestRank } from "@/lib/analysis";
import type { AnalysisReport, ConceptIdea } from "@/lib/types";

export function MarketReport({ report }: { report: AnalysisReport }) {
  const isLive = report.mode === "live";
  const isCached = report.mode === "cached";
  const capturedDate = report.capturedAt
    ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(report.capturedAt))
    : null;
  const dataLabel = isLive ? "LIVE QLOO DATA" : isCached ? "QLOO SNAPSHOT" : "ILLUSTRATIVE DEMO DATA";
  const scoreLabel = report.score >= 75
    ? "Strong observed overlap"
    : report.score >= 45
      ? "Some observed overlap"
    : report.directHits
      ? "Limited observed overlap"
      : "No direct overlap found";
  const overlapPercent = report.signalCount ? Math.round((report.directHits / report.signalCount) * 100) : 0;
  const bestRank = getBestRank(report.evidence);
  const scoreExplanation = describeAlignmentScore(report);
  const decisionLabel = isCached ? "SNAPSHOT EXAMPLE" : report.aiAssisted ? "AI-ASSISTED" : "EVIDENCE-LED";

  return (
    <section className="report-column results-column" id="report" aria-live="polite">
      <div className="report-topline"><div><span className="report-kicker">MARKET CHECK</span><span className="report-period"> / {isLive ? "LIVE ANALYSIS" : isCached ? "EXAMPLE SNAPSHOT" : "ILLUSTRATIVE"}</span></div><span className="report-period">{report.brand.name} · {report.marketResolved || report.market}</span></div>
      <article className={`score-card ${isLive ? "live-report" : "demo-report"}`}>
        <div className="score-card-top"><span className={`data-badge ${isLive || isCached ? "live-badge" : "demo-badge"}`}><i />{dataLabel}</span><span className="sample-date">{isCached && capturedDate ? `Captured ${capturedDate}` : `Market · ${report.marketResolved || report.market}`}</span></div>
        <div className="score-content">
          <div className="score-ring" role="img" aria-label={`Cultural signal score: ${report.score} out of 100. ${report.directHits} of ${report.signalCount} references matched${bestRank ? `; best position #${bestRank}` : ""}. This measures reference overlap, not market demand.`} style={{ "--score": `${report.score * 3.6}deg` } as CSSProperties}>
            <div className="score-ring-inner"><strong>{report.score}</strong><span>/ 100</span></div>
          </div>
          <div className="score-copy"><div className="score-caption">CULTURAL SIGNAL SCORE · NOT MARKET DEMAND</div><h2>{scoreLabel}</h2><p>{report.summary}</p><p className="score-meaning"><strong>What this means:</strong> {scoreExplanation}</p></div>
        </div>
        {report.goal && <div className="brief-goal"><span>Your goal</span><p>{report.goal}</p></div>}
        <div className="score-footer"><div className="score-stat"><span className="stat-icon green"><Icon name="check" size={14} /></span><div><strong>{report.directHits} of {report.signalCount}</strong><span>references with a match</span></div></div><div className="score-footer-divider" /><div className="score-stat"><span className="stat-icon lavender"><Icon name="target" size={14} /></span><div><strong>{bestRank ? `#${bestRank}` : "—"}</strong><span>best position</span></div></div><div className="score-overlap"><div><span>References matched</span><strong>{overlapPercent}%</strong></div><span className="overlap-track"><i style={{ width: `${overlapPercent}%` }} /></span></div><div className="score-method">How this is calculated <span>ⓘ</span><div className="method-popover">The score averages where your brand appears across all selected references. A missing match counts as zero. More matches and higher positions raise the score. It is not a demand forecast.</div></div></div>
      </article>

      {isCached && <div className="demo-disclaimer"><span>ⓘ</span><p><strong>Snapshot from {capturedDate || "a prior Qloo lookup"}.</strong> Not a live check or evidence of demand.</p></div>}
      {!isLive && !isCached && <div className="demo-disclaimer"><span>ⓘ</span><p><strong>Illustrative only.</strong> Not live Qloo data or evidence of demand.</p></div>}

      {report.comparison
        ? <ComparisonDecision report={report} label={decisionLabel} />
        : report.conceptIdeas?.length
          ? <RankedIdeas report={report} ideas={report.conceptIdeas} label={decisionLabel} />
          : null}

      <article className="evidence-card">
        <div className="card-title-row"><div><span className="small-kicker">CULTURAL REFERENCES</span><h3>Where your brand appears</h3></div><span className="evidence-count">{report.evidence.length} references</span></div>
        <div className="signal-list">
          {report.evidence.map((item, index) => (
            <div className="signal-row signal-rank-row" key={`${item.entityId}-${index}`}>
              <div className={`signal-avatar signal-avatar-${index % 4}`}>{item.name.slice(0, 1).toUpperCase()}</div>
              <div className="signal-meta"><strong>{item.name}</strong><span>{item.targetRank === null ? `${report.brand.name} not in top ${item.relatedBrandCount}` : `${report.brand.name} ranks #${item.targetRank + 1} of ${item.relatedBrandCount}`}</span></div>
              <div className="signal-rank-viz" aria-label={item.targetRank === null ? `No direct match for ${report.brand.name} in the top ${item.relatedBrandCount}` : `${report.brand.name} ranks ${item.targetRank + 1} of ${item.relatedBrandCount} for ${item.name}`}>
                <span className="signal-rank-label">{item.targetRank === null ? "No match" : `#${item.targetRank + 1}`}</span>
                <span className={`signal-rank-track ${item.targetRank === null ? "no-rank" : ""}`}><i style={{ width: item.targetRank === null ? "0%" : `${((item.relatedBrandCount - item.targetRank) / Math.max(item.relatedBrandCount, 1)) * 100}%` }} /></span>
              </div>
            </div>
          ))}
        </div>
        <div className="evidence-footnote"><span>Q</span> {isLive ? `Qloo cultural signals · ${report.marketResolved || report.market}` : isCached ? `Qloo snapshot · ${report.marketResolved || report.market}` : "Illustrative connections · not retrieved from Qloo"}<span className="evidence-arrow"><Icon name="arrow" size={14} /></span></div>
      </article>

      <div className="insight-grid">
        <article className="insight-card strength-card"><div className="insight-heading"><span className="insight-icon"><Icon name="sparkle" size={16} /></span><div><span className="small-kicker">WHAT RESONATES</span><h3>Strengths</h3></div></div><ul>{report.strengths.slice(0, 3).map((item, index) => <li key={index}><span className="list-marker strength-marker">↗</span>{item}</li>)}</ul></article>
        <article className="insight-card risk-card"><div className="insight-heading"><span className="insight-icon risk-icon">!</span><div><span className="small-kicker">WHAT TO CONSIDER</span><h3>Watch-outs</h3></div></div><ul>{report.risks.slice(0, 3).map((item, index) => <li key={index}><span className="list-marker risk-marker">!</span>{item}</li>)}</ul></article>
      </div>

      <article className="recommendation-card">
        <div className="recommendation-heading"><div><span className="small-kicker">NEXT STEPS</span><h3>What to do next</h3></div><span className="ai-label"><Icon name="sparkle" size={13} />{report.aiAssisted ? "AI-ASSISTED" : "EVIDENCE-LED"}</span></div>
        <div className="recommendation-list">{report.recommendations.slice(0, 3).map((item, index) => <div className="recommendation-item" key={index}><span className="recommendation-index">0{index + 1}</span><p>{item}</p><span className="recommendation-chevron">↗</span></div>)}</div>
        <div className="recommendation-footnote">Test these hypotheses with your audience before investing.</div>
      </article>

      <div className="methodology"><span className="methodology-mark"><Icon name="sparkle" size={14} /></span><p><strong>How to read this brief</strong><br />Qloo signals describe cultural associations—not demand, causation, demographics, or performance.{report.aiAssisted && <><br /><span className="method-ai">AI interpretation uses the displayed Qloo evidence.</span></>}</p><a href="https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide" target="_blank" rel="noreferrer" aria-label="Qloo API methodology"><Icon name="external" size={14} /></a></div>
    </section>
  );
}

function ComparisonDecision({ report, label }: { report: AnalysisReport; label: string }) {
  const comparison = report.comparison!;
  const [first, second] = comparison;
  const hasLeader = first.score !== second.score;
  const winner = hasLeader ? (first.score > second.score ? first : second) : null;
  const runnerUp = winner ? (winner === first ? second : first) : null;
  const margin = winner ? Math.abs(first.score - second.score) : 0;
  const scored = report.aiAssisted || report.mode === "cached";

  return (
    <article className="decision-card">
      <div className="card-title-row">
        <div><span className="small-kicker">WHICH TO TEST FIRST</span><h3>Our recommendation</h3></div>
        <span className="ai-label"><Icon name="sparkle" size={13} />{label}</span>
      </div>

      <div className={`decision-verdict ${winner ? "has-winner" : ""}`}>
        <span className="decision-kicker">{winner ? "RECOMMENDED TO TEST FIRST" : "NO CLEAR LEADER"}</span>
        <strong className="decision-name">{winner ? winner.name : "Test both ideas with a small audience"}</strong>
        {winner && <p className="decision-why"><b>Why:</b> {winner.rationale}</p>}
        {winner && <p className="decision-margin">Scored {winner.score} vs. {runnerUp?.score} for {runnerUp?.name} — a {margin}-point gap on the Qloo evidence above.</p>}
        {!winner && <p className="decision-why">No model ranking is available for this comparison{scored ? " and the two ideas scored evenly" : ""}. Use the Qloo evidence to frame a small test, then validate it with your audience.</p>}
        <p className="decision-caveat">A hypothesis to test, not a forecast. Validate with people in {report.marketResolved || report.market} before committing spend.</p>
      </div>

      <div className="comparison-grid">{comparison.map((item, index) => {
        const isWinner = Boolean(winner) && item.name === winner?.name;
        const isRunnerUp = Boolean(runnerUp) && item.name === runnerUp?.name;
        return (
          <div className={`comparison-option ${isWinner ? "recommended" : ""}`} key={`${item.name}-${index}`}>
            <div className="comparison-option-top">
              <span className="comparison-letter">{index === 0 ? "A" : "B"}</span>
              {isWinner && <span className="comparison-badge">Recommended</span>}
              {isRunnerUp && <span className="comparison-badge muted">Runner-up</span>}
            </div>
            <div>
              <strong>{item.name}</strong>
              <div className="comparison-score">{scored ? item.score : "—"}<span>{scored ? "/100 model estimate" : "not scored"}</span></div>
              <p>{item.rationale}</p>
            </div>
          </div>
        );
      })}</div>
      <div className="recommendation-footnote">Scores are model interpretations of Qloo evidence—not Qloo scores or performance forecasts.</div>
    </article>
  );
}

function RankedIdeas({ report, ideas, label }: { report: AnalysisReport; ideas: ConceptIdea[]; label: string }) {
  const scored = report.aiAssisted || report.mode === "cached";

  return (
    <article className="decision-card">
      <div className="card-title-row">
        <div><span className="small-kicker">WHAT TO TEST FIRST</span><h3>Top ideas, ranked</h3></div>
        <span className="ai-label"><Icon name="sparkle" size={13} />{label}</span>
      </div>
      <p className="decision-intro">You didn’t enter campaign ideas, so these are the first tests we’d run for {report.brand.name} in {report.marketResolved || report.market} — ranked by how well the Qloo signals support them.</p>
      <ol className="idea-list">{ideas.map((idea, index) => (
        <li className="idea-row" key={`${idea.name}-${index}`}>
          <span className="idea-rank">{index + 1}</span>
          <div className="idea-body">
            <div className="idea-title"><strong>{idea.name}</strong>{scored && idea.score !== null && <span className="idea-score">{idea.score}<i>/100</i></span>}</div>
            <p className="idea-rationale">{idea.rationale}</p>
            {idea.firstTest && <p className="idea-test"><span>First test</span>{idea.firstTest}</p>}
          </div>
        </li>
      ))}</ol>
      <div className="recommendation-footnote">Ranked hypotheses from the Qloo evidence above—not predictions of campaign performance.</div>
    </article>
  );
}
