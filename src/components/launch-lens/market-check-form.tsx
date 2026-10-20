import type { FormEventHandler } from "react";
import { Icon } from "@/components/launch-lens/icon";
import type { WizardStep } from "@/components/launch-lens/wizard-types";

type SetupStep = Exclude<WizardStep, "results">;

type MarketCheckFormProps = {
  step: SetupStep;
  brand: string;
  market: string;
  signalText: string;
  signalsCount: number;
  campaignA: string;
  campaignB: string;
  companyWebsite: string;
  loading: boolean;
  analysisEnabled: boolean | undefined;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onBack: () => void;
  onFillDemo: () => void;
  onDraftChange: () => void;
  onBrandChange: (value: string) => void;
  onMarketChange: (value: string) => void;
  onSignalTextChange: (value: string) => void;
  onCampaignAChange: (value: string) => void;
  onCampaignBChange: (value: string) => void;
  onCompanyWebsiteChange: (value: string) => void;
};

const stepDetails: Record<SetupStep, { number: string; title: string; description: string }> = {
  market: { number: "01", title: "Brand & market", description: "Choose a brand and where you plan to launch." },
  audience: { number: "02", title: "Culture cues", description: "Add 2–4 signals that describe your audience." },
  concepts: { number: "03", title: "Campaign ideas", description: "Optional: compare two early concepts." },
};

export function MarketCheckForm({
  step,
  brand,
  market,
  signalText,
  signalsCount,
  campaignA,
  campaignB,
  companyWebsite,
  loading,
  analysisEnabled,
  onSubmit,
  onBack,
  onFillDemo,
  onDraftChange,
  onBrandChange,
  onMarketChange,
  onSignalTextChange,
  onCampaignAChange,
  onCampaignBChange,
  onCompanyWebsiteChange,
}: MarketCheckFormProps) {
  const detail = stepDetails[step];
  const isFinalStep = step === "concepts";

  return (
    <section className="input-card" id="audience">
      <div className="card-heading">
        <div className="section-number">{detail.number}</div>
        <div><h2>{detail.title}</h2><p>{detail.description}</p></div>
        {step === "market" && <button className="fill-demo-button" type="button" onClick={onFillDemo} disabled={loading}><Icon name="sparkle" size={14} />Fill demo data</button>}
      </div>
      <form onSubmit={onSubmit}>
        {step === "market" && <>
          <label className="field-label" htmlFor="brand">Brand or product <span className="required">*</span></label>
          <div className="input-with-icon"><span className="input-brand-icon">✳</span><input id="brand" maxLength={100} value={brand} onChange={(event) => { onBrandChange(event.target.value); onDraftChange(); }} placeholder="e.g. Patagonia" /></div>
          <div className="field-hint">We’ll find the matching Qloo brand.</div>

          <label className="field-label market-label" htmlFor="market">New target market <span className="required">*</span></label>
          <input id="market" maxLength={100} value={market} onChange={(event) => { onMarketChange(event.target.value); onDraftChange(); }} placeholder="e.g. Tokyo, Japan" />
          <div className="field-hint">Enter a city, region, or country.</div>
        </>}

        {step === "audience" && <>
          <div className="field-label signal-label-row"><label htmlFor="signals">Audience culture cues <span className="required">*</span></label><span className="field-count">{signalsCount} / 4</span></div>
          <textarea id="signals" rows={5} maxLength={500} value={signalText} onChange={(event) => { onSignalTextChange(event.target.value); onDraftChange(); }} placeholder="Add artists, films, brands, places…" />
          <div className="field-hint">Enter 2–4 artists, films, brands, or places. Separate with commas.</div>
          <div className="cue-examples"><span>Examples</span><b>Artists</b><b>Films</b><b>Brands</b><b>Places</b></div>
        </>}

        {step === "concepts" && <>
          <div className="optional-step-note"><span className="optional-label">OPTIONAL</span><p>Add two ideas for an AI-assisted comparison, or skip this step.</p></div>
          <div className="campaign-fields campaign-fields-step">
            <label className="field-label" htmlFor="campaign-a">Concept A</label>
            <input id="campaign-a" maxLength={180} value={campaignA} onChange={(event) => { onCampaignAChange(event.target.value); onDraftChange(); }} placeholder="e.g. A design-led pop-up" />
            <label className="field-label" htmlFor="campaign-b">Concept B</label>
            <input id="campaign-b" maxLength={180} value={campaignB} onChange={(event) => { onCampaignBChange(event.target.value); onDraftChange(); }} placeholder="e.g. A creator-led series" />
            <p className="field-hint">AI interpretation—not a Qloo score.</p>
          </div>
        </>}

        <div className="honeypot-field" aria-hidden="true">
          <label htmlFor="company-website">Leave this field blank</label>
          <input id="company-website" name="companyWebsite" tabIndex={-1} autoComplete="off" value={companyWebsite} onChange={(event) => onCompanyWebsiteChange(event.target.value)} />
        </div>

        {isFinalStep && analysisEnabled === false && <div className="analysis-paused">Live analysis is paused right now. You can still preview the illustrative example from Overview.</div>}

        <div className="wizard-form-actions">
          {step !== "market" && <button className="back-button" type="button" onClick={onBack} disabled={loading}>Back</button>}
          <button className="analyze-button" type="submit" disabled={loading || (isFinalStep && analysisEnabled === false)}>
            {loading ? <span className="button-spinner" /> : <Icon name={isFinalStep ? "sparkle" : "arrow"} size={17} />}
            {loading ? "Reading market signals…" : isFinalStep ? "Run market check" : "Continue"}
            {!loading && <span className="button-arrow">↗</span>}
          </button>
        </div>
        <div className="secure-note"><span className="secure-lock">⌑</span> Draft stays in this tab. Inputs go to Qloo and, if enabled, the AI provider. Don’t enter confidential information; reports aren’t saved.</div>
      </form>
    </section>
  );
}
