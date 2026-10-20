"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { SiteFooter } from "@/components/site-footer";
import { Icon } from "@/components/launch-lens/icon";
import { LandingPage } from "@/components/launch-lens/landing-page";
import { MarketCheckForm } from "@/components/launch-lens/market-check-form";
import { MarketReport } from "@/components/launch-lens/market-report";
import { SetupGuide } from "@/components/launch-lens/setup-guide";
import { WizardProgress } from "@/components/launch-lens/wizard-progress";
import { wizardSteps, type WizardStep } from "@/components/launch-lens/wizard-types";
import { createDemoReport } from "@/lib/analysis";
import type { AnalysisReport } from "@/lib/types";

type ApiStatus = {
  qlooConfigured: boolean;
  xaiConfigured: boolean;
  analysisEnabled: boolean;
};

type BriefDraft = {
  brand: string;
  market: string;
  signalText: string;
  campaignA: string;
  campaignB: string;
};

const draftStorageKey = "launchlens-brief-draft";

export default function Home() {
  const [brand, setBrand] = useState("");
  const [market, setMarket] = useState("");
  const [signalText, setSignalText] = useState("");
  const [campaignA, setCampaignA] = useState("");
  const [campaignB, setCampaignB] = useState("");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [currentStep, setCurrentStep] = useState<WizardStep | "landing">("landing");
  const [highestStep, setHighestStep] = useState(0);
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const savedDraft = sessionStorage.getItem(draftStorageKey);
        if (savedDraft) {
          const draft = JSON.parse(savedDraft) as Partial<BriefDraft>;
          if (typeof draft.brand === "string") setBrand(draft.brand);
          if (typeof draft.market === "string") setMarket(draft.market);
          if (typeof draft.signalText === "string") setSignalText(draft.signalText);
          if (typeof draft.campaignA === "string") setCampaignA(draft.campaignA);
          if (typeof draft.campaignB === "string") setCampaignB(draft.campaignB);
        }
      } catch {
        // Ignore unavailable storage or an invalid saved draft.
      } finally {
        setDraftRestored(true);
      }
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!draftRestored) return;

    const draft: BriefDraft = { brand, market, signalText, campaignA, campaignB };
    try {
      sessionStorage.setItem(draftStorageKey, JSON.stringify(draft));
    } catch {
      // Draft persistence is best-effort and should not block the form.
    }
  }, [brand, market, signalText, campaignA, campaignB, draftRestored]);

  useEffect(() => {
    fetch("/api/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((value: ApiStatus) => setStatus(value))
      .catch(() => setStatus({ qlooConfigured: false, xaiConfigured: false, analysisEnabled: true }));
  }, []);

  const signals = useMemo(
    () => [...new Set(signalText.split(/[\n,]/).map((item) => item.trim()).filter(Boolean))],
    [signalText],
  );

  function moveToStep(step: WizardStep) {
    setCurrentStep(step);
    setHighestStep((highest) => Math.max(highest, wizardSteps.findIndex((item) => item.id === step)));
    setError("");
  }

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (currentStep === "market") {
      if (!brand.trim()) {
        setError("Enter a brand or product to continue.");
        return;
      }
      if (!market.trim()) {
        setError("Enter a target market, such as a city or region.");
        return;
      }
      moveToStep("audience");
      return;
    }
    if (currentStep === "audience") {
      if (signals.length < 2) {
        setError("Add at least two audience cues to continue.");
        return;
      }
      if (signals.length > 4) {
        setError("Use no more than four audience cues in one analysis.");
        return;
      }
      moveToStep("concepts");
      return;
    }
    if (!brand.trim()) {
      moveToStep("market");
      setError("Enter a brand or product before running the market check.");
      return;
    }
    if (!market.trim()) {
      moveToStep("market");
      setError("Enter a target market before running the market check.");
      return;
    }
    if (signals.length < 2 || signals.length > 4) {
      moveToStep("audience");
      setError("Use 2–4 audience cues before running the market check.");
      return;
    }
    if (Boolean(campaignA.trim()) !== Boolean(campaignB.trim())) {
      setError("Enter both campaign options, or leave both blank.");
      return;
    }
    if (currentStep !== "concepts") return;

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
          companyWebsite,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The analysis could not be completed.");
      setReport(result as AnalysisReport);
      moveToStep("results");
      setStatus((current) => current ? { ...current, qlooConfigured: true } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The analysis could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  function startNewCheck() {
    setBrand("");
    setMarket("");
    setSignalText("");
    setCampaignA("");
    setCampaignB("");
    setReport(null);
    setHighestStep(0);
    moveToStep("market");
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function beginMarketCheck() {
    moveToStep("market");
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function fillDemoData() {
    const example = createDemoReport();
    setBrand(example.brand.name);
    setMarket(example.market);
    setSignalText(example.audienceSignals.join(", "));
    setCampaignA("A design-led pop-up");
    setCampaignB("A creator-led series");
    setReport(null);
    setError("");
  }

  const activeStepIndex = wizardSteps.findIndex((step) => step.id === currentStep);
  const isLandingPage = currentStep === "landing";
  const isResultsStep = currentStep === "results" && report !== null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
          <a className="brand-lockup" href="#overview" aria-label="LaunchLens home" onClick={() => setCurrentStep("landing")}>
          <span className="brand-mark"><span /><span /><span /><span /></span>
          <span className="brand-word">Launch<span>Lens</span></span>
        </a>

        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button className={`nav-link ${isLandingPage ? "active" : ""}`} type="button" onClick={() => setCurrentStep("landing")} aria-current={isLandingPage ? "page" : undefined}><Icon name="grid" />Overview</button>
          <button className={`nav-link ${!isLandingPage && !isResultsStep ? "active" : ""}`} type="button" onClick={startNewCheck} aria-current={!isLandingPage && !isResultsStep ? "page" : undefined}><Icon name="report" />New market check</button>
          <button className={`nav-link ${isResultsStep ? "active" : ""}`} type="button" onClick={() => report && moveToStep("results")} disabled={!report} aria-current={isResultsStep ? "page" : undefined}><Icon name="users" />Your brief</button>
        </nav>

        <div className="sidebar-bottom">
          <div className="plan-card">
            <div className="plan-icon"><Icon name="sparkle" size={16} /></div>
            <div><strong>Market signals</strong><span>Powered by Qloo Taste AI</span></div>
            <div className="powered-mark">q</div>
          </div>
          <div className="no-account-card"><span className="no-account-check"><Icon name="check" size={12} /></span><div><strong>No account needed</strong><span>Briefs stay in this session.</span></div></div>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{isLandingPage ? "Overview" : wizardSteps[activeStepIndex]?.label || "Overview"}</strong></div>
          <div className="topbar-actions">
            <div className={`connection ${status?.qlooConfigured ? "connected" : "demo-connection"}`}>
              <span className="connection-dot" />
              {status?.qlooConfigured ? "Qloo connected" : status ? "Qloo setup needed" : "Checking Qloo…"}
            </div>
            <button className="help-button" aria-label="Help" type="button">?</button>
          </div>
        </header>

        <div className="page-wrap">
          {isLandingPage ? <LandingPage onStart={beginMarketCheck} /> : <>
          {isResultsStep && <section className="hero-row results-hero">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />YOUR MARKET BRIEF</div>
              <h1>Your market,<br className="desktop-break" /> <em>in context.</em></h1>
              <p className="hero-copy">{report?.brand.name} · {report?.marketResolved || report?.market}. Review the signals and ideas below.</p>
            </div>
            <button className="demo-button" type="button" onClick={() => moveToStep("market")}><Icon name="report" size={16} /> Edit brief</button>
          </section>}

          <div className="notice-strip">
            <span className="notice-icon"><Icon name="sparkle" size={16} /></span>
            <span><strong>Culture is context, not proof of demand.</strong> Explore connections from Qloo’s taste graph.</span>
            <span className="notice-tag">QLOO-POWERED</span>
          </div>

          <WizardProgress activeStepIndex={activeStepIndex} highestStep={highestStep} hasReport={Boolean(report)} onSelect={moveToStep} />

          {error && <div className="error-banner" role="alert"><span><Icon name="close" size={16} /></span><div><strong>Couldn’t complete the analysis</strong><p>{error}</p>{error.includes("QLOO_API_KEY") && <small>Add your key to <code>.env.local</code> and restart the dev server. See <code>.env.example</code>.</small>}</div><button type="button" onClick={() => setError("")} aria-label="Dismiss error"><Icon name="close" size={16} /></button></div>}

          <div className={`workspace-grid ${isResultsStep ? "results-view" : "setup-view"}`}>
            {isResultsStep && report ? <MarketReport report={report} /> : <>
              <MarketCheckForm
                step={currentStep === "results" ? "market" : currentStep}
                brand={brand}
                market={market}
                signalText={signalText}
                signalsCount={signals.length}
                campaignA={campaignA}
                campaignB={campaignB}
                companyWebsite={companyWebsite}
                loading={loading}
                analysisEnabled={status?.analysisEnabled}
                onSubmit={analyze}
                onBack={() => moveToStep(currentStep === "concepts" ? "audience" : "market")}
                onFillDemo={fillDemoData}
                onDraftChange={() => setReport(null)}
                onBrandChange={setBrand}
                onMarketChange={setMarket}
                onSignalTextChange={setSignalText}
                onCampaignAChange={setCampaignA}
                onCampaignBChange={setCampaignB}
                onCompanyWebsiteChange={setCompanyWebsite}
              />
              <SetupGuide />
            </>}
          </div>
          </>}
          <SiteFooter />
        </div>
      </main>
    </div>
  );
}
