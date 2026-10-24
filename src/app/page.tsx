"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { SiteFooter } from "@/components/site-footer";
import { Icon } from "@/components/launch-lens/icon";
import { LandingPage } from "@/components/launch-lens/landing-page";
import { MarketCheckForm } from "@/components/launch-lens/market-check-form";
import { MarketReport } from "@/components/launch-lens/market-report";
import { SetupGuide } from "@/components/launch-lens/setup-guide";
import { WizardProgress } from "@/components/launch-lens/wizard-progress";
import { wizardSteps, type ReferenceDraft, type WizardStep } from "@/components/launch-lens/wizard-types";
import { cachedExample, cachedExampleCampaigns, cachedExampleGoal, createCachedExampleReport, matchesCachedExample } from "@/lib/cached-example";
import type { AnalysisReport } from "@/lib/types";

type ApiStatus = {
  qlooConfigured: boolean;
  xaiConfigured: boolean;
  analysisEnabled: boolean;
};

type BriefDraft = {
  brand: string;
  market: string;
  goal: string;
  references: ReferenceDraft[];
  campaignA: string;
  campaignB: string;
  demoData?: boolean;
};

const draftStorageKey = "launchlens-brief-draft";
const stepGuidance: Record<WizardStep, { title: string; description: string }> = {
  market: {
    title: "Start with a brand and market.",
    description: "This is an early cultural scan—not a demand forecast.",
  },
  audience: {
    title: "Say what you want to do in this market.",
    description: "We suggest cultural references to check, and you can edit them before running the analysis.",
  },
  concepts: {
    title: "Compare two campaign ideas—or let us suggest them.",
    description: "Treat fit as a hypothesis, not a performance prediction.",
  },
  preview: {
    title: "Review your brief before you run it.",
    description: "Check your inputs; nothing is sent for analysis until you continue.",
  },
  results: {
    title: "Review the signals behind your brief.",
    description: "Use connections as hypotheses to investigate, not a verdict on demand.",
  },
};

export default function Home() {
  const [brand, setBrand] = useState("");
  const [market, setMarket] = useState("");
  const [goal, setGoal] = useState("");
  const [references, setReferences] = useState<ReferenceDraft[]>([]);
  const [campaignA, setCampaignA] = useState("");
  const [campaignB, setCampaignB] = useState("");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [isDemoDraft, setIsDemoDraft] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep | "landing">("landing");
  const [highestStep, setHighestStep] = useState(0);
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const analyzeInFlight = useRef(false);
  const suggestionsInFlight = useRef(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const savedDraft = sessionStorage.getItem(draftStorageKey);
        if (savedDraft) {
          const draft = JSON.parse(savedDraft) as Partial<BriefDraft> & { signalText?: string };
          const restoredReferences = Array.isArray(draft.references)
            ? draft.references.filter((item): item is ReferenceDraft => typeof item?.name === "string" && item.name.trim().length > 0)
            : (typeof draft.signalText === "string"
              ? draft.signalText.split(/[\n,]/).map((item) => item.trim()).filter(Boolean).map((name) => ({ name, why: "" }))
              : []);
          const normalizedSignals = restoredReferences.map((item) => item.name).join(",").replace(/\s/g, "").toLowerCase();
          const isLegacyAesopExample = draft.brand === "Aesop"
            && draft.market === "Tokyo, Japan"
            && normalizedSignals === "kinfolk,bluebottlecoffee,therow"
            && !draft.campaignA
            && !draft.campaignB;
          const isLegacyPatagoniaExample = draft.brand === "Patagonia"
            && draft.market === "Tokyo, Japan"
            && normalizedSignals === "snowpeak,kinfolk,bluebottlecoffee"
            && (!draft.campaignA || draft.campaignA === "Worn Wear Repair Bar")
            && (!draft.campaignB || draft.campaignB === "City-to-Trail Field Club");
          const isLegacyExample = isLegacyAesopExample || isLegacyPatagoniaExample;
          if (isLegacyExample || draft.demoData === true) {
            sessionStorage.removeItem(draftStorageKey);
          } else {
            if (typeof draft.brand === "string") setBrand(draft.brand);
            if (typeof draft.market === "string") setMarket(draft.market);
            if (typeof draft.goal === "string") setGoal(draft.goal);
            if (restoredReferences.length > 0) setReferences(restoredReferences);
            if (typeof draft.campaignA === "string") setCampaignA(draft.campaignA);
            if (typeof draft.campaignB === "string") setCampaignB(draft.campaignB);
            setIsDemoDraft(false);
          }
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

    if (isDemoDraft) {
      try {
        sessionStorage.removeItem(draftStorageKey);
      } catch {
        // Ignore unavailable storage.
      }
      return;
    }

    const draft: BriefDraft = { brand, market, goal, references, campaignA, campaignB, demoData: isDemoDraft };
    try {
      sessionStorage.setItem(draftStorageKey, JSON.stringify(draft));
    } catch {
      // Draft persistence is best-effort and should not block the form.
    }
  }, [brand, market, goal, references, campaignA, campaignB, isDemoDraft, draftRestored]);

  useEffect(() => {
    fetch("/api/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((value: ApiStatus) => setStatus(value))
      .catch(() => setStatus({ qlooConfigured: false, xaiConfigured: false, analysisEnabled: true }));
  }, []);

  const signals = useMemo(() => references.map((item) => item.name), [references]);

  function moveToStep(step: WizardStep) {
    setCurrentStep(step);
    setHighestStep((highest) => Math.max(highest, wizardSteps.findIndex((item) => item.id === step)));
    setError("");
  }

  async function suggestReferences() {
    if (suggestionsInFlight.current || analyzeInFlight.current) return;
    if (!brand.trim() || !market.trim()) {
      setError("Enter a brand and a target market first.");
      return;
    }
    if (!goal.trim()) {
      setError("Describe what you are trying to do in this market first.");
      return;
    }
    suggestionsInFlight.current = true;
    setSuggesting(true);
    setError("");
    try {
      const response = await fetch("/api/cues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, market, goal, companyWebsite }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not suggest cultural references.");
      const suggestions = (result.references ?? []) as ReferenceDraft[];
      if (suggestions.length === 0) throw new Error("No usable cultural references were found. Add them manually instead.");
      setReferences(suggestions);
      setReport(null);
      setIsDemoDraft(false);
      const skipped = Array.isArray(result.unresolved) ? result.unresolved as string[] : [];
      if (skipped.length > 0) {
        setError(`We skipped ${skipped.join(", ")} because Qloo could not match ${skipped.length === 1 ? "it" : "them"}. Add another reference if you want a fourth.`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not suggest cultural references.");
    } finally {
      suggestionsInFlight.current = false;
      setSuggesting(false);
    }
  }

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (analyzeInFlight.current || suggestionsInFlight.current) return;
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
      if (!goal.trim()) {
        setError("Describe what you are trying to do in this market.");
        return;
      }
      if (signals.length < 2) {
        setError("Add at least two cultural references — ask the AI to suggest them, or add them yourself.");
        return;
      }
      if (signals.length > 4) {
        setError("Use no more than four cultural references in one analysis.");
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
    if (!goal.trim()) {
      moveToStep("audience");
      setError("Describe what you are trying to do in this market.");
      return;
    }
    if (signals.length < 2 || signals.length > 4) {
      moveToStep("audience");
      setError("Use 2–4 cultural references before running the market check.");
      return;
    }
    if (Boolean(campaignA.trim()) !== Boolean(campaignB.trim())) {
      setError("Enter both campaign options, or leave both blank.");
      return;
    }
    if (currentStep === "concepts") {
      moveToStep("preview");
      return;
    }
    if (currentStep !== "preview") return;

    if (isDemoDraft && matchesCachedExample({ brand, market, signals, campaignA, campaignB })) {
      setReport(createCachedExampleReport());
      moveToStep("results");
      return;
    }

    setLoading(true);
    analyzeInFlight.current = true;
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand,
          market,
          goal,
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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The analysis could not be completed.");
    } finally {
      analyzeInFlight.current = false;
      setLoading(false);
    }
  }

  function startNewCheck() {
    setBrand("");
    setMarket("");
    setGoal("");
    setReferences([]);
    setCampaignA("");
    setCampaignB("");
    setIsDemoDraft(false);
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
    const example = cachedExample.report;
    setBrand(example.brand.name);
    setMarket(example.market);
    setGoal(cachedExampleGoal);
    setReferences(example.audienceSignals.map((name) => ({ name, why: "" })));
    setCampaignA(cachedExampleCampaigns[0]);
    setCampaignB(cachedExampleCampaigns[1]);
    setIsDemoDraft(true);
    setReport(null);
    setError("");
    moveToStep("preview");
  }

  const activeStepIndex = wizardSteps.findIndex((step) => step.id === currentStep);
  const isLandingPage = currentStep === "landing";
  const isResultsStep = currentStep === "results" && report !== null;
  const guidanceStep = isResultsStep ? "results" : currentStep === "landing" ? "market" : currentStep;
  const guidance = stepGuidance[guidanceStep];

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
            <div><strong>Market signals</strong><span>Culture + market context</span></div>
          </div>
          <div className="no-account-card"><span className="no-account-check"><Icon name="check" size={12} /></span><div><strong>No account needed</strong><span>Briefs stay in this session.</span></div></div>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{isLandingPage ? "Overview" : wizardSteps[activeStepIndex]?.label || "Overview"}</strong></div>
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
            <span><strong>{guidance.title}</strong> {guidance.description}</span>
          </div>

          {!isResultsStep && <WizardProgress activeStepIndex={activeStepIndex} highestStep={highestStep} hasReport={Boolean(report)} onSelect={moveToStep} />}

          {error && <div className="error-banner" role="alert"><span><Icon name="alert" size={16} /></span><div><strong>Couldn’t complete the analysis</strong><p>{error}</p>{error.includes("QLOO_API_KEY") && <small>Add your key to <code>.env.local</code> and restart the dev server. See <code>.env.example</code>.</small>}</div><button type="button" onClick={() => setError("")} aria-label="Dismiss error" title="Dismiss error"><Icon name="close" size={16} /></button></div>}

          <div className={`workspace-grid ${isResultsStep ? "results-view" : "setup-view"}`}>
            {isResultsStep && report ? <MarketReport report={report} /> : <>
              <MarketCheckForm
                step={currentStep === "results" ? "market" : currentStep}
                brand={brand}
                market={market}
                goal={goal}
                references={references}
                campaignA={campaignA}
                campaignB={campaignB}
                companyWebsite={companyWebsite}
                loading={loading}
                suggesting={suggesting}
                analysisEnabled={status?.analysisEnabled}
                xaiConfigured={status?.xaiConfigured}
                isCachedExample={isDemoDraft && matchesCachedExample({ brand, market, signals, campaignA, campaignB })}
                onSubmit={analyze}
                onBack={() => moveToStep(currentStep === "preview" ? "concepts" : currentStep === "concepts" ? "audience" : "market")}
                onFillDemo={fillDemoData}
                onDraftChange={() => { setReport(null); setIsDemoDraft(false); }}
                onBrandChange={setBrand}
                onMarketChange={setMarket}
                onGoalChange={setGoal}
                onReferencesChange={setReferences}
                onSuggestReferences={suggestReferences}
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
