import type { CSSProperties } from "react";
import { Icon } from "@/components/launch-lens/icon";
import type { AnalysisReport } from "@/lib/types";

export function MarketReport({ report }: { report: AnalysisReport }) {
  const isLive = report.mode === "live";
  const scoreLabel = report.score >= 75
    ? "Strong observed overlap"
    : report.score >= 45
      ? "Some observed overlap"
      : report.directHits
        ? "Limited observed overlap"
        : "No direct overlap found";

  return (
    <section className="report-column results-column" id="report" aria-live="polite">
      <div className="report-topline"><div><span className="report-kicker">MARKET ENTRY SANITY CHECK</span><span className="report-period"> / {isLive ? "LIVE ANALYSIS" : "EXAMPLE"}</span></div><span className="report-period">{report.brand.name} · {report.marketResolved || report.market}</span></div>
      <article className={`score-card ${isLive ? "live-report" : "demo-report"}`}>
        <div className="score-card-top"><span className={`data-badge ${isLive ? "live-badge" : "demo-badge"}`}><i />{isLive ? "LIVE QLOO DATA" : "ILLUSTRATIVE DEMO DATA"}</span><span className="sample-date">Market · {report.marketResolved || report.market}</span></div>
        <div className="score-content">
          <div className="score-ring" style={{ "--score": `${report.score * 3.6}deg` } as CSSProperties}>
            <div className="score-ring-inner"><strong>{report.score}</strong><span>/ 100</span></div>
          </div>
          <div className="score-copy"><div className="score-caption">OBSERVED CULTURAL CONNECTIONS · {report.market.toUpperCase()}</div><h2>{scoreLabel}</h2><p>{report.summary}</p></div>
        </div>
        <div className="score-footer"><div className="score-stat"><span className="stat-icon green"><Icon name="check" size={14} /></span><div><strong>{report.directHits} of {report.signalCount}</strong><span>direct brand matches</span></div></div><div className="score-footer-divider" /><div className="score-stat"><span className="stat-icon lavender"><Icon name="users" size={14} /></span><div><strong>{report.audienceSignals.length}</strong><span>culture cues resolved</span></div></div><div className="score-method">How it’s scored <span>ⓘ</span><div className="method-popover">Average rank overlap across your cues in this market. No match doesn’t prove mismatch.</div></div></div>
      </article>

      {!isLive && <div className="demo-disclaimer"><span>ⓘ</span><p><strong>Illustrative only.</strong> Not live Qloo data or evidence of demand.</p></div>}

      <article className="evidence-card">
        <div className="card-title-row"><div><span className="small-kicker">THE SIGNALS</span><h3>Culture + market at a glance</h3></div><span className="evidence-count">{report.evidence.length} signals</span></div>
        <div className="signal-list">
          {report.evidence.map((item, index) => (
            <div className="signal-row" key={`${item.entityId}-${index}`}>
              <div className={`signal-avatar signal-avatar-${index % 4}`}>{item.name.slice(0, 1).toUpperCase()}</div>
              <div className="signal-meta"><strong>{item.name}</strong><span>{item.targetRank === null ? "No direct brand match in top 20" : `${report.brand.name} · rank ${item.targetRank + 1}`}</span></div>
              <div className="mini-bars" aria-label={`${item.relatedBrands.length} related brands returned`}>
                {[0, 1, 2, 3, 4].map((bar) => <span key={bar} style={{ height: `${9 + ((index * 11 + bar * 7) % 13)}px` }} />)}
              </div>
              <span className={`rank-chip ${item.targetRank === null ? "rank-none" : ""}`}>{item.targetRank === null ? "—" : `#${item.targetRank + 1}`}</span>
            </div>
          ))}
        </div>
        <div className="evidence-footnote"><span>Q</span> {isLive ? `Qloo affinities scoped to ${report.marketResolved || report.market}` : "Illustrative affinities · not retrieved from Qloo"}<span className="evidence-arrow"><Icon name="arrow" size={14} /></span></div>
      </article>

      <div className="insight-grid">
        <article className="insight-card strength-card"><div className="insight-heading"><span className="insight-icon"><Icon name="sparkle" size={16} /></span><div><span className="small-kicker">WHAT RESONATES</span><h3>Strengths</h3></div></div><ul>{report.strengths.slice(0, 3).map((item, index) => <li key={index}><span className="list-marker strength-marker">↗</span>{item}</li>)}</ul></article>
        <article className="insight-card risk-card"><div className="insight-heading"><span className="insight-icon risk-icon">!</span><div><span className="small-kicker">WHAT TO CONSIDER</span><h3>Watch-outs</h3></div></div><ul>{report.risks.slice(0, 3).map((item, index) => <li key={index}><span className="list-marker risk-marker">!</span>{item}</li>)}</ul></article>
      </div>

      <article className="recommendation-card">
        <div className="recommendation-heading"><div><span className="small-kicker">NEXT MOVES</span><h3>Ideas worth testing</h3></div><span className="ai-label"><Icon name="sparkle" size={13} />{report.aiAssisted ? "AI-ASSISTED" : "EVIDENCE-LED"}</span></div>
        <div className="recommendation-list">{report.recommendations.slice(0, 3).map((item, index) => <div className="recommendation-item" key={index}><span className="recommendation-index">0{index + 1}</span><p>{item}</p><span className="recommendation-chevron">↗</span></div>)}</div>
        <div className="recommendation-footnote">Test these hypotheses with your audience before investing.</div>
      </article>

      {report.comparison && <article className="comparison-card"><div className="card-title-row"><div><span className="small-kicker">CONCEPT REVIEW</span><h3>Campaign comparison</h3></div><span className="ai-label"><Icon name="sparkle" size={13} />{report.aiAssisted ? "AI HEURISTIC" : "AWAITING AI KEY"}</span></div><div className="comparison-grid">{report.comparison.map((item, index) => <div className="comparison-option" key={`${item.name}-${index}`}><span className="comparison-letter">{index === 0 ? "A" : "B"}</span><div><strong>{item.name}</strong><div className="comparison-score">{report.aiAssisted ? item.score : "—"}<span>{report.aiAssisted ? "/100 model estimate" : "requires AI key"}</span></div><p>{item.rationale}</p></div></div>)}</div><div className="recommendation-footnote">Model interpretation—not a Qloo score.</div></article>}

      <div className="methodology"><span className="methodology-mark"><Icon name="sparkle" size={14} /></span><p><strong>How to read this report</strong><br />Qloo affinity signals show cultural association—not demand, causation, demographics, or performance.{report.aiAssisted && <><br /><span className="method-ai">AI interpretation uses the displayed Qloo evidence.</span></>}</p><a href="https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide" target="_blank" rel="noreferrer" aria-label="Qloo API methodology"><Icon name="external" size={14} /></a></div>
    </section>
  );
}
