import { useRef, useState } from "react";
import type { FormEvent, FormEventHandler, KeyboardEvent } from "react";
import { Icon } from "@/components/launch-lens/icon";
import type { ReferenceDraft, WizardStep } from "@/components/launch-lens/wizard-types";

type SetupStep = Exclude<WizardStep, "results">;

type MarketCheckFormProps = {
  step: SetupStep;
  brand: string;
  market: string;
  goal: string;
  references: ReferenceDraft[];
  campaignA: string;
  campaignB: string;
  companyWebsite: string;
  loading: boolean;
  suggesting: boolean;
  analysisEnabled: boolean | undefined;
  xaiConfigured: boolean | undefined;
  isCachedExample: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onBack: () => void;
  onFillDemo: () => void;
  onDraftChange: () => void;
  onBrandChange: (value: string) => void;
  onMarketChange: (value: string) => void;
  onGoalChange: (value: string) => void;
  onReferencesChange: (references: ReferenceDraft[]) => void;
  onSuggestReferences: () => void;
  onCampaignAChange: (value: string) => void;
  onCampaignBChange: (value: string) => void;
  onCompanyWebsiteChange: (value: string) => void;
};

const stepDetails: Record<SetupStep, { number: string; title: string; description: string }> = {
  market: { number: "01", title: "Brand & market", description: "Choose a brand and where you plan to launch." },
  audience: { number: "02", title: "Goal & cultural references", description: "Say what you want to do there. We'll suggest references to check." },
  concepts: { number: "03", title: "Campaign comparison", description: "Compare two ideas of your own—or get ranked suggestions." },
  preview: { number: "04", title: "Review your brief", description: "Check your inputs before running the market check." },
};

const exampleReferences = [
  { name: "MUJI", label: "MUJI (retail)" },
  { name: "Parasite", label: "Parasite (film)" },
  { name: "Blue Bottle Coffee", label: "Blue Bottle Coffee (food)" },
  { name: "NewJeans", label: "NewJeans (music)" },
  { name: "Gyeongbokgung", label: "Gyeongbokgung (landmark)" },
];

export function MarketCheckForm({
  step,
  brand,
  market,
  goal,
  references,
  campaignA,
  campaignB,
  companyWebsite,
  loading,
  suggesting,
  analysisEnabled,
  xaiConfigured,
  isCachedExample,
  onSubmit,
  onBack,
  onFillDemo,
  onDraftChange,
  onBrandChange,
  onMarketChange,
  onGoalChange,
  onReferencesChange,
  onSuggestReferences,
  onCampaignAChange,
  onCampaignBChange,
  onCompanyWebsiteChange,
}: MarketCheckFormProps) {
  const [referenceInput, setReferenceInput] = useState("");
  const [referenceValidationAttempted, setReferenceValidationAttempted] = useState(false);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const detail = stepDetails[step];
  const isFinalStep = step === "preview";
  const referenceCount = references.length;
  const atReferenceLimit = referenceCount >= 4;
  const needsMoreReferences = step === "audience" && referenceValidationAttempted && referenceCount < 2;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (step === "audience" && referenceCount < 2) {
      setReferenceValidationAttempted(true);
      referenceInputRef.current?.focus();
    }
    onSubmit(event);
  }

  function addReferences(raw: string) {
    const additions = raw.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
    if (additions.length === 0) return;
    const existing = new Set(references.map((item) => item.name.toLowerCase()));
    const next = [...references];
    for (const name of additions) {
      if (next.length >= 4) break;
      if (existing.has(name.toLowerCase())) continue;
      existing.add(name.toLowerCase());
      next.push({ name, why: "" });
    }
    onReferencesChange(next);
    onDraftChange();
  }

  function removeReference(name: string) {
    onReferencesChange(references.filter((item) => item.name.toLowerCase() !== name.toLowerCase()));
    onDraftChange();
  }

  function handleReferenceKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addReferences(referenceInput);
    setReferenceInput("");
  }

  return (
    <section className="input-card" id="audience">
      <div className={`card-heading ${step === "market" ? "card-heading-demo" : ""}`}>
        <div className="section-number">{detail.number}</div>
        <div><h2>{detail.title}</h2><p>{detail.description}</p></div>
      </div>
      {step === "market" && <div className="form-demo-row"><p className="form-demo-hint">Start blank, or load an example brief.</p><button className="fill-demo-button" type="button" onClick={onFillDemo} disabled={loading || suggesting}><Icon name="sparkle" size={14} />Fill demo data</button></div>}
      <form onSubmit={handleSubmit}>
        {step === "market" && <>
          <label className="field-label" htmlFor="brand">Brand or product <span className="required">*</span></label>
          <div className="input-with-icon"><span className="input-brand-icon">✳</span><input id="brand" maxLength={100} value={brand} onChange={(event) => { onBrandChange(event.target.value); onDraftChange(); }} placeholder="e.g. Patagonia" /></div>
          <div className="field-hint">We’ll find the matching Qloo brand.</div>

          <label className="field-label market-label" htmlFor="market">New target market <span className="required">*</span></label>
          <input id="market" maxLength={100} value={market} onChange={(event) => { onMarketChange(event.target.value); onDraftChange(); }} placeholder="e.g. Seoul, South Korea" />
          <div className="field-hint">Enter a city, region, or country.</div>
        </>}

        {step === "audience" && <>
          <div className="goal-block">
            <label className="field-label" htmlFor="goal">What are you trying to do in {market.trim() || "this market"}? <span className="required">*</span></label>
            <textarea id="goal" rows={3} maxLength={400} value={goal} onChange={(event) => { onGoalChange(event.target.value); onDraftChange(); }} placeholder="e.g. Launch a compact furniture line for people living in small apartments" />
            <div className="field-hint">One sentence is enough. We use it to pick cultural references and to keep the ideas in your brief on target.</div>
          </div>

          <div className="signal-label-row"><label htmlFor="reference-input">Cultural references <span className="required">*</span></label><span className="field-count">{referenceCount} / 4</span></div>
          <div className="reference-suggest">
            <div className="reference-suggest-copy"><strong>Need a starting point?</strong><span>Get 2–4 ideas based on your goal, then edit the list.</span></div>
            <button className="suggest-button" type="button" onClick={onSuggestReferences} disabled={suggesting || loading || !goal.trim() || xaiConfigured === false}>
              {suggesting ? <><span className="suggest-spinner" />Finding references…</> : <><Icon name="sparkle" size={14} />Suggest references</>}
            </button>
          </div>
          {xaiConfigured === false && <p className="suggest-hint">AI suggestions aren’t available here. Add at least two references yourself below.</p>}
          <div className="reference-explainer">
            <span className="reference-explainer-label">WHY THIS MATTERS</span>
            <p>These names stand in for the cultural world your idea would enter. LaunchLens checks whether <strong>{brand.trim() || "your brand"}</strong> already has a connection to each one in <strong>{market.trim() || "your market"}</strong>. A match—especially near #1—means there’s a bridge the idea can build on. No match means the campaign would have to create that connection, so treat it as a gap to test.</p>
            <p>That helps you choose which idea to test first. It isn’t a competitor count, audience survey, or demand forecast—just evidence for where the brand already has cultural footing.</p>
          </div>

          {references.length > 0 && <ul className="reference-list">{references.map((reference) => (
            <li className="reference-item" key={reference.name}>
              <div className="reference-copy">
                <strong>{reference.name}</strong>
                {reference.why && <span>{reference.why}</span>}
              </div>
              <button className="reference-remove" type="button" onClick={() => removeReference(reference.name)} aria-label={`Remove ${reference.name}`} disabled={suggesting}>×</button>
            </li>
          ))}</ul>}

          {needsMoreReferences && <p className="reference-validation" id="reference-validation" role="alert">
            {referenceCount === 1
              ? "Add one more cultural reference to continue. Using at least two helps compare more than one cultural connection."
              : "Add at least two cultural references to continue. Using more than one helps compare cultural connections."}
          </p>}

          <div className="reference-add">
            <input ref={referenceInputRef} id="reference-input" value={referenceInput} maxLength={200} disabled={atReferenceLimit || suggesting} aria-invalid={needsMoreReferences} aria-describedby={needsMoreReferences ? "reference-validation" : undefined} onChange={(event) => setReferenceInput(event.target.value)} onKeyDown={handleReferenceKeyDown} placeholder={atReferenceLimit ? "Maximum of four references" : "Add a name — separate several with commas"} />
            <button type="button" onClick={() => { addReferences(referenceInput); setReferenceInput(""); }} disabled={atReferenceLimit || suggesting || !referenceInput.trim()}>Add</button>
          </div>

          <div className="cue-examples"><span>Try:</span>{exampleReferences.map((example) => {
            const selected = references.some((item) => item.name.toLowerCase() === example.name.toLowerCase());
            return <button key={example.name} type="button" onClick={() => addReferences(example.name)} disabled={selected || atReferenceLimit || suggesting} aria-pressed={selected}>{example.label}</button>;
          })}</div>
        </>}

        {step === "concepts" && <>
          <div className="optional-step-note"><span className="optional-label">OPTIONAL</span><p>Enter two ideas and we’ll say which one to test first, and why. Leave both blank and we’ll suggest ranked first tests instead.</p></div>
          <div className="campaign-fields campaign-fields-step">
            <label className="field-label" htmlFor="campaign-a">Concept A</label>
            <input id="campaign-a" maxLength={180} value={campaignA} onChange={(event) => { onCampaignAChange(event.target.value); onDraftChange(); }} placeholder="e.g. A design-led pop-up" />
            <label className="field-label" htmlFor="campaign-b">Concept B</label>
            <input id="campaign-b" maxLength={180} value={campaignB} onChange={(event) => { onCampaignBChange(event.target.value); onDraftChange(); }} placeholder="e.g. A creator-led series" />
            <p className="field-hint">AI compares your ideas using the signals—not as a performance forecast.</p>
          </div>
        </>}

        {step === "preview" && <div className="brief-preview" aria-label="Brief preview">
          <div className="brief-preview-row"><span>Brand or product</span><strong>{brand}</strong></div>
          <div className="brief-preview-row"><span>Target market</span><strong>{market}</strong></div>
          <div className="brief-preview-row brief-preview-goal"><span>Your goal</span><strong>{goal}</strong></div>
          <div className="brief-preview-row brief-preview-references"><span>Cultural references</span><div>{references.map((reference) => <span className="brief-reference-chip" key={reference.name}>{reference.name}</span>)}</div></div>
          <div className="brief-preview-row"><span>Campaign comparison</span><strong>{campaignA && campaignB ? `${campaignA} vs. ${campaignB}` : "Not included — we’ll suggest ranked first tests"}</strong></div>
        </div>}

        <div className="honeypot-field" aria-hidden="true">
          <label htmlFor="company-website">Leave this field blank</label>
          <input id="company-website" name="companyWebsite" tabIndex={-1} autoComplete="off" value={companyWebsite} onChange={(event) => onCompanyWebsiteChange(event.target.value)} />
        </div>

        {isFinalStep && analysisEnabled === false && !isCachedExample && <div className="analysis-paused">Live analysis is paused right now. You can still view the example from Overview.</div>}

        <div className="wizard-form-actions">
          {step !== "market" && <button className="back-button" type="button" onClick={onBack} disabled={loading || suggesting}>Back</button>}
          <button className="analyze-button" type="submit" disabled={loading || suggesting || (isFinalStep && analysisEnabled === false && !isCachedExample)}>
            {loading ? <span className="button-spinner" /> : <Icon name={isFinalStep ? "sparkle" : "arrow"} size={17} />}
            {loading ? "Reading market signals…" : isFinalStep && isCachedExample ? "View example report" : isFinalStep ? "Run market check" : "Continue"}
            {!loading && <span className="button-arrow">↗</span>}
          </button>
        </div>
        <div className="secure-note"><span className="secure-lock">⌑</span> Draft stays in this tab. Inputs go to Qloo and, if enabled, the AI provider. Don’t enter confidential information; briefs aren’t saved.</div>
      </form>
    </section>
  );
}
