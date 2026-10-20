import { Icon } from "@/components/launch-lens/icon";
import { wizardSteps, type WizardStep } from "@/components/launch-lens/wizard-types";

type WizardProgressProps = {
  activeStepIndex: number;
  highestStep: number;
  hasReport: boolean;
  onSelect: (step: WizardStep) => void;
};

export function WizardProgress({ activeStepIndex, highestStep, hasReport, onSelect }: WizardProgressProps) {
  return (
    <nav className="wizard-progress" aria-label="Market check steps">
      {wizardSteps.map((step, index) => {
        const isComplete = index < activeStepIndex;
        const isCurrent = index === activeStepIndex;
        const isDisabled = index > highestStep || (step.id === "results" && !hasReport);

        return (
          <div className="wizard-progress-item" key={step.id}>
            <button
              className={`wizard-step ${isCurrent ? "current" : ""} ${isComplete ? "complete" : ""}`}
              type="button"
              onClick={() => onSelect(step.id)}
              disabled={isDisabled}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className="wizard-step-number">{isComplete ? <Icon name="check" size={13} /> : `0${index + 1}`}</span>
              <span><strong>{step.label}</strong><small>{step.description}</small></span>
            </button>
            {index < wizardSteps.length - 1 && <span className={`wizard-connector ${isComplete ? "complete" : ""}`} />}
          </div>
        );
      })}
    </nav>
  );
}
