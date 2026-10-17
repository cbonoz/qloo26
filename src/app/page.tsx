"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { createDemoReport } from "@/lib/analysis";
import type { AnalysisReport } from "@/lib/types";

type ApiStatus = { qlooConfigured: boolean; narrativeConfigured: boolean };

const initialSignals = "Kinfolk, Blue Bottle Coffee, The Row";
const initialMarket = "Tokyo, Japan";

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    report: <><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" /><path d="M17 3h4v4" /><path d="m10 14 11-11" /><path d="M7 10h3M7 14h2M7 18h7" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1a1.7 1.7 0 1 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.3a1.7 1.7 0 1 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9h-.3a1.7 1.7 0 1 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2v-.3a1.7 1.7 0 1 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.3a1.7 1.7 0 1 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    external: <><path d="M15 3h6v6M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.sparkle}</svg>;
}

export default function Home() {
  const [brand, setBrand] = useState("Aesop");
  const [market, setMarket] = useState(initialMarket);
  const [signalText, setSignalText] = useState(initialSignals);
  const [campaignA, setCampaignA] = useState("");
  const [campaignB, setCampaignB] = useState("");
  const [report, setReport] = useState<AnalysisReport>(() => createDemoReport());
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((value: ApiStatus) => setStatus(value))
      .catch(() => setStatus({ qlooConfigured: false, narrativeConfigured: false }));
  }, []);

  const signals = useMemo(
    () => [...new Set(signalText.split(/[\n,]/).map((item) => item.trim()).filter(Boolean))],
    [signalText],
  );

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!brand.trim()) {
      setError("Enter a brand or product to analyze.");
      return;
    }
    if (!market.trim()) {
      setError("Enter a target market, such as a city or region.");
      return;
    }
    if (signals.length < 2) {
      setError("Add at least two audience cues.");
      return;
    }
    if (signals.length > 5) {
      setError("Use no more than five audience cues in one analysis.");
      return;
    }
    if (Boolean(campaignA.trim()) !== Boolean(campaignB.trim())) {
      setError("Enter both campaign options, or leave both blank.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand,
          market,
          signals,
          campaignA: campaignA.trim() || undefined,
          campaignB: campaignB.trim() || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The analysis could not be completed.");
      setReport(result as AnalysisReport);
      setStatus((current) => current ? { ...current, qlooConfigured: true } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The analysis could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDemo() {
    setError("");
    setBrand("Aesop");
    setMarket(initialMarket);
    setSignalText(initialSignals);
    setCampaignA("");
    setCampaignB("");
    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo: true }),
      });
      if (!response.ok) throw new Error("Could not load the example report.");
      setReport((await response.json()) as AnalysisReport);
    } catch {
      setReport(createDemoReport());
    } finally {
      setLoading(false);
    }
  }

  const scoreLabel = report.score >= 75 ? "Strong observed overlap" : report.score >= 45 ? "Some observed overlap" : report.directHits ? "Limited observed overlap" : "No direct overlap found";
  const isLive = report.mode === "live";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand-lockup" href="#overview" aria-label="LaunchLens home">
          <span className="brand-mark"><span /><span /><span /><span /></span>
          <span className="brand-word">Launch<span>Lens</span></span>
        </a>

        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-link active" href="#overview"><Icon name="grid" />Overview</a>
          <a className="nav-link" href="#report"><Icon name="report" />Analyses<span className="nav-count">01</span></a>
          <a className="nav-link" href="#audience"><Icon name="users" />Audiences</a>
        </nav>

        <div className="sidebar-bottom">
          <div className="plan-card">
            <div className="plan-icon"><Icon name="sparkle" size={16} /></div>
            <div><strong>Market signals</strong><span>Powered by Qloo Taste AI</span></div>
            <div className="powered-mark">q</div>
          </div>
          <button className="nav-link settings-link" type="button"><Icon name="settings" />Settings</button>
          <div className="profile-row"><div className="avatar">LL</div><div><strong>LaunchLens Studio</strong><span>Market research workspace</span></div><span className="profile-more">···</span></div>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>Overview</strong></div>
          <div className="topbar-actions">
            <div className={`connection ${status?.qlooConfigured ? "connected" : "demo-connection"}`}>
              <span className="connection-dot" />
              {status?.qlooConfigured ? "Qloo connected" : "Demo environment"}
            </div>
            <button className="help-button" aria-label="Help" type="button">?</button>
          </div>
        </header>

        <div className="page-wrap">
          <section className="hero-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />MARKET ENTRY SANITY CHECK</div>
              <h1>Make your next move<br className="desktop-break" /> <em>with context.</em></h1>
              <p className="hero-copy">Compare a brand or product with a target audience in a new market. Surface promising cultural connections and potential gaps as hypotheses to investigate.</p>
            </div>
            <button className="demo-button" type="button" onClick={loadDemo} disabled={loading}>
              <Icon name="sparkle" size={16} /> Explore demo report <Icon name="arrow" size={15} />
            </button>
          </section>

          <div className="notice-strip">
            <span className="notice-icon"><Icon name="sparkle" size={16} /></span>
            <span><strong>Markets are more than metrics.</strong> LaunchLens uses Qloo’s taste graph to surface cultural connections worth investigating—not to pretend affinity proves demand.</span>
            <span className="notice-tag">QLOO-POWERED</span>
          </div>

          {error && <div className="error-banner" role="alert"><span><Icon name="close" size={16} /></span><div><strong>Couldn’t complete the analysis</strong><p>{error}</p>{error.includes("QLOO_API_KEY") && <small>Add your key to <code>.env.local</code> and restart the dev server. See <code>.env.example</code>.</small>}</div><button type="button" onClick={() => setError("")} aria-label="Dismiss error"><Icon name="close" size={16} /></button></div>}

          <div className="workspace-grid">
            <section className="input-card" id="audience">
              <div className="card-heading">
                <div className="section-number">01</div>
                <div><h2>Set up a market check</h2><p>Choose a product, a new market, and a few audience cues.</p></div>
              </div>
              <form onSubmit={analyze}>
                <label className="field-label" htmlFor="brand">Brand or product <span className="required">*</span></label>
                <div className="input-with-icon"><span className="input-brand-icon">✳</span><input id="brand" maxLength={100} value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="e.g. Patagonia" /></div>
                <div className="field-hint">We’ll resolve this to a Qloo brand entity.</div>

                <label className="field-label market-label" htmlFor="market">New target market <span className="required">*</span></label>
                <input id="market" maxLength={100} value={market} onChange={(event) => setMarket(event.target.value)} placeholder="e.g. Tokyo, Japan" />
                <div className="field-hint">Use a city, region, or country that Qloo can resolve as a locality.</div>

                <div className="field-label signal-label-row"><label htmlFor="signals">Audience culture cues <span className="required">*</span></label><span className="field-count">{signals.length} / 5</span></div>
                <textarea id="signals" rows={3} maxLength={500} value={signalText} onChange={(event) => setSignalText(event.target.value)} placeholder="Add artists, films, brands, places…" />
                <div className="field-hint">Enter specific names, separated by commas. Use 2–5 signals.</div>

                <details className="compare-details">
                  <summary><span className="plus-circle"><Icon name="plus" size={14} /></span><span><strong>Compare campaign concepts</strong><small>Optional · add two ideas for an AI-assisted review</small></span><span className="optional-label">OPTIONAL</span></summary>
                  <div className="campaign-fields">
                    <label className="field-label" htmlFor="campaign-a">Concept A</label>
                    <input id="campaign-a" maxLength={180} value={campaignA} onChange={(event) => setCampaignA(event.target.value)} placeholder="e.g. A design-led pop-up" />
                    <label className="field-label" htmlFor="campaign-b">Concept B</label>
                    <input id="campaign-b" maxLength={180} value={campaignB} onChange={(event) => setCampaignB(event.target.value)} placeholder="e.g. A creator-led series" />
                    <p className="field-hint">The comparison is strategic interpretation, not a Qloo score.</p>
                  </div>
                </details>

                <button className="analyze-button" type="submit" disabled={loading}>
                  {loading ? <span className="button-spinner" /> : <Icon name="sparkle" size={17} />}
                  {loading ? "Reading market signals…" : "Check market fit"}
                  {!loading && <span className="button-arrow">↗</span>}
                </button>
                <div className="secure-note"><span className="secure-lock">⌑</span> Your inputs stay private. Qloo is built without personal data.</div>
              </form>
            </section>

            <section className="report-column" id="report" aria-live="polite">
              <div className="report-topline"><div><span className="report-kicker">MARKET ENTRY SANITY CHECK</span><span className="report-period"> / {isLive ? "LIVE ANALYSIS" : "EXAMPLE"}</span></div><button className="report-menu" type="button" aria-label="Report options">···</button></div>
              <article className={`score-card ${isLive ? "live-report" : "demo-report"}`}>
                <div className="score-card-top"><span className={`data-badge ${isLive ? "live-badge" : "demo-badge"}`}><i />{isLive ? "LIVE QLOO DATA" : "ILLUSTRATIVE DEMO DATA"}</span><span className="sample-date">Market · {report.market}</span></div>
                <div className="score-content">
                  <div className="score-ring" style={{ "--score": `${report.score * 3.6}deg` } as CSSProperties}>
                    <div className="score-ring-inner"><strong>{report.score}</strong><span>/ 100</span></div>
                  </div>
                  <div className="score-copy"><div className="score-caption">OBSERVED CULTURAL CONNECTIONS · {report.market.toUpperCase()}</div><h2>{scoreLabel}</h2><p>{report.summary}</p></div>
                </div>
                <div className="score-footer"><div className="score-stat"><span className="stat-icon green"><Icon name="check" size={14} /></span><div><strong>{report.directHits} of {report.signalCount}</strong><span>direct brand matches</span></div></div><div className="score-footer-divider" /><div className="score-stat"><span className="stat-icon lavender"><Icon name="users" size={14} /></span><div><strong>{report.audienceSignals.length}</strong><span>culture cues resolved</span></div></div><div className="score-method">How it’s scored <span>ⓘ</span><div className="method-popover">Average rank-based overlap across culture cues and the resolved market locality. Each signal is scored by the brand’s position in Qloo’s top 20 related brands. No appearance is not proof of mismatch.</div></div></div>
              </article>

              {!isLive && <div className="demo-disclaimer"><span>ⓘ</span><p><strong>Example data only.</strong> This report is illustrative and is not a live Qloo API result. Add a Qloo key to run your own analysis.</p></div>}

              <article className="evidence-card">
                <div className="card-title-row"><div><span className="small-kicker">THE SIGNALS</span><h3>Culture + market at a glance</h3></div><span className="evidence-count">{report.evidence.length} signals</span></div>
                <div className="signal-list">
                  {report.evidence.map((item, index) => (
                    <div className="signal-row" key={`${item.entityId}-${index}`}>
                      <div className={`signal-avatar signal-avatar-${index % 4}`}>{item.name.slice(0, 1).toUpperCase()}</div>
                      <div className="signal-meta"><strong>{item.name}</strong><span>{item.kind === "market" ? "Target market locality" : item.targetRank === null ? "No direct brand match in top 20" : `${report.brand.name} · rank ${item.targetRank + 1}`}</span></div>
                      <div className="mini-bars" aria-label={`${item.relatedBrands.length} related brands returned`}>
                        {[0, 1, 2, 3, 4].map((bar) => <span key={bar} style={{ height: `${9 + ((index * 11 + bar * 7) % 13)}px` }} />)}
                      </div>
                      <span className={`rank-chip ${item.targetRank === null ? "rank-none" : ""}`}>{item.targetRank === null ? "—" : `#${item.targetRank + 1}`}</span>
                    </div>
                  ))}
                </div>
                <div className="evidence-footnote"><span>Q</span> {isLive ? "Affinity relationships retrieved from Qloo Taste AI" : "Illustrative affinities · not retrieved from Qloo"}<span className="evidence-arrow"><Icon name="arrow" size={14} /></span></div>
              </article>

              <div className="insight-grid">
                <article className="insight-card strength-card"><div className="insight-heading"><span className="insight-icon"><Icon name="sparkle" size={16} /></span><div><span className="small-kicker">WHAT RESONATES</span><h3>Strengths</h3></div></div><ul>{report.strengths.slice(0, 3).map((item, index) => <li key={index}><span className="list-marker strength-marker">↗</span>{item}</li>)}</ul></article>
                <article className="insight-card risk-card"><div className="insight-heading"><span className="insight-icon risk-icon">!</span><div><span className="small-kicker">WHAT TO CONSIDER</span><h3>Watch-outs</h3></div></div><ul>{report.risks.slice(0, 3).map((item, index) => <li key={index}><span className="list-marker risk-marker">!</span>{item}</li>)}</ul></article>
              </div>

              <article className="recommendation-card">
                <div className="recommendation-heading"><div><span className="small-kicker">NEXT MOVES</span><h3>Ideas worth testing</h3></div><span className="ai-label"><Icon name="sparkle" size={13} />{report.aiAssisted ? "AI-ASSISTED" : "EVIDENCE-LED"}</span></div>
                <div className="recommendation-list">{report.recommendations.slice(0, 3).map((item, index) => <div className="recommendation-item" key={index}><span className="recommendation-index">0{index + 1}</span><p>{item}</p><span className="recommendation-chevron">↗</span></div>)}</div>
                <div className="recommendation-footnote">Recommendations are strategic hypotheses. Validate with your audience before investing.</div>
              </article>

              {report.comparison && <article className="comparison-card"><div className="card-title-row"><div><span className="small-kicker">CONCEPT REVIEW</span><h3>Campaign comparison</h3></div><span className="ai-label"><Icon name="sparkle" size={13} />{report.aiAssisted ? "AI HEURISTIC" : "AWAITING AI KEY"}</span></div><div className="comparison-grid">{report.comparison.map((item, index) => <div className="comparison-option" key={`${item.name}-${index}`}><span className="comparison-letter">{index === 0 ? "A" : "B"}</span><div><strong>{item.name}</strong><div className="comparison-score">{report.aiAssisted ? item.score : "—"}<span>{report.aiAssisted ? "/100 model estimate" : "requires AI key"}</span></div><p>{item.rationale}</p></div></div>)}</div><div className="recommendation-footnote">Concept scores are model-generated interpretations of Qloo evidence, not Qloo measurements.</div></article>}

              <div className="methodology"><span className="methodology-mark"><Icon name="sparkle" size={14} /></span><p><strong>How to read this report</strong><br />Qloo provides cultural affinity signals. The score summarizes observed overlap between your brand and selected cues plus the resolved market locality; it does not establish market demand, causation, demographics, or campaign performance.{report.aiAssisted && <><br /><span className="method-ai">AI-assisted interpretation is grounded in the displayed Qloo evidence.</span></>}</p><a href="https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide" target="_blank" rel="noreferrer" aria-label="Qloo API methodology"><Icon name="external" size={14} /></a></div>
            </section>
          </div>

          <footer className="page-footer"><span>© 2026 LaunchLens</span><span>Market entry, with cultural context.</span><span className="footer-status"><i />{status?.qlooConfigured ? "Qloo API ready" : "Demo mode"}</span></footer>
        </div>
      </main>
    </div>
  );
}
