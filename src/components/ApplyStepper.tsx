import React from 'react';

interface ApplyStepperProps {
  currentStep: 1 | 2 | 3;
}

export const ApplyStepper: React.FC<ApplyStepperProps> = ({ currentStep }) => {
  const stepLabel = `Step ${currentStep} of 3`;
  const rightLabel =
    currentStep === 1
      ? ''
      : currentStep === 2
      ? 'In progress'
      : 'Final step';

  return (
    <div className="w-full mb-8">
      {/* Top Header Row */}
      <div className="flex items-center justify-between text-xs text-[#6B665E] font-medium mb-2.5">
        <span>{stepLabel}</span>
        {rightLabel && <span>{rightLabel}</span>}
      </div>

      {/* 3-segment progress line */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div
          className={`h-1 rounded-full ${
            currentStep >= 1 ? 'bg-[#1F1D1A]' : 'bg-[#E4E0D8]'
          }`}
        />
        <div
          className={`h-1 rounded-full ${
            currentStep >= 2
              ? currentStep === 2
                ? 'bg-[#B5532C]'
                : 'bg-[#1F1D1A]'
              : 'bg-[#E4E0D8]'
          }`}
        />
        <div
          className={`h-1 rounded-full ${
            currentStep === 3 ? 'bg-[#1F1D1A]' : 'bg-[#E4E0D8]'
          }`}
        />
      </div>

      {/* Step dot labels */}
      <div className="flex items-center justify-between text-xs font-medium">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              currentStep >= 1 ? 'bg-[#1F1D1A]' : 'bg-[#A8A39D]'
            }`}
          />
          <span className={currentStep >= 1 ? 'text-[#1F1D1A]' : 'text-[#6B665E]'}>
            Details
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              currentStep >= 2
                ? currentStep === 2
                  ? 'bg-[#B5532C]'
                  : 'bg-[#1F1D1A]'
                : 'bg-[#A8A39D]'
            }`}
          />
          <span
            className={
              currentStep === 2
                ? 'text-[#B5532C]'
                : currentStep > 2
                ? 'text-[#1F1D1A]'
                : 'text-[#6B665E]'
            }
          >
            Documents
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              currentStep === 3 ? 'bg-[#1F1D1A]' : 'bg-[#A8A39D]'
            }`}
          />
          <span className={currentStep === 3 ? 'text-[#1F1D1A]' : 'text-[#6B665E]'}>
            Review
          </span>
        </div>
      </div>
    </div>
  );
};
