import React, { useState } from 'react';
import { Header } from '../components/Header';
import { DateInput } from '../components/DateInput';
import { FileUploader } from '../components/FileUploader';
import { ApplicationRecord, DocumentSlot, UploadedDocMetadata } from '../lib/types';
import { parseDateParts, buildIsoDate } from '../lib/formatters';
import { AlertCircle, Check, Loader2, Upload } from 'lucide-react';

interface FixAndResubmitPageProps {
  application: ApplicationRecord;
  onResubmit: (resubmissionPayload: any) => Promise<void>;
  onCancel: () => void;
  onSignOut: () => void;
  onGoToStaff?: () => void;
  currentUser?: any;
}

export const FixAndResubmitPage: React.FC<FixAndResubmitPageProps> = ({
  application,
  onResubmit,
  onCancel,
  onSignOut,
  onGoToStaff,
  currentUser
}) => {
  const problems = application.problems || [];

  // Initialize fixable states
  const initialDobParts = parseDateParts(application.dateOfBirth);
  const [dobParts, setDobParts] = useState(initialDobParts);
  const [applicantName, setApplicantName] = useState(application.applicantName);
  const [marksPercentage, setMarksPercentage] = useState(String(application.marksPercentage));
  const [annualFamilyIncome, setAnnualFamilyIncome] = useState(String(application.annualFamilyIncome));

  // Replacement documents state
  const [replacements, setReplacements] = useState<Record<string, UploadedDocMetadata>>({});
  const [showIdReplacement, setShowIdReplacement] = useState(false);
  const [showMarksheetReplacement, setShowMarksheetReplacement] = useState(false);
  const [showIncomeReplacement, setShowIncomeReplacement] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleReplacementUpload = (slot: DocumentSlot, fileMeta: UploadedDocMetadata) => {
    setReplacements((prev) => ({ ...prev, [slot]: fileMeta }));
  };

  const handleReplacementRemove = (slot: DocumentSlot) => {
    setReplacements((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg(null);

      const isoDob = buildIsoDate(dobParts.day, dobParts.month, dobParts.year);

      const payload = {
        applicantName,
        dateOfBirth: isoDob || application.dateOfBirth,
        marksPercentage: Number(marksPercentage) || application.marksPercentage,
        annualFamilyIncome: Number(annualFamilyIncome) || application.annualFamilyIncome,
        replacementDocuments: replacements
      };

      await onResubmit(payload);
    } catch (err: any) {
      console.error('Resubmit error:', err);
      setErrorMsg(err?.message || 'Failed to resubmit application. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col">
      <Header
        onSignOut={onSignOut}
        userRole={currentUser?.role}
        userEmail={currentUser?.email}
        onNavigateToStaff={onGoToStaff}
      />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Sub-header badges */}
        <div className="flex items-center gap-4 text-xs text-[#6B665E] font-medium mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B5532C]" />
            <span>Application #{application.id}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9A6700]" />
            <span>{problems.length} items require correction</span>
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-[#1F1D1A] tracking-tight mb-1">
          Fix and resubmit
        </h1>
        <p className="text-sm text-[#6B665E] mb-6">
          Shows only the problems that need fixing.
        </p>

        {errorMsg && (
          <div className="mb-6 p-4 bg-[#FBECEB] border border-[#F5C2C0] rounded-[6px] text-sm text-[#B3362E]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {problems.map((problem, index) => {
            const isDob = problem.field === 'dateOfBirth';
            const isName = problem.field === 'applicantName';
            const isMarks = problem.field === 'marksPercentage';
            const isIncome = problem.field === 'annualFamilyIncome';
            const isUnreadableOrWrongDoc = problem.slot !== undefined;

            return (
              <div
                key={problem.id}
                className="bg-white border border-[#E4E0D8] rounded-[6px] p-6 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-base text-[#1F1D1A]">
                    {problem.title}
                  </h2>
                  <span className="text-xs text-[#6B665E]">
                    Correction {index + 1} of {problems.length}
                  </span>
                </div>

                {/* Mismatched alert callout */}
                <div className="bg-[#FDF6E7] border border-[#F2D79A] rounded-[6px] p-3.5 flex items-start gap-2.5 mb-4 text-xs text-[#9A6700]">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold mb-0.5">Problem detail</strong>
                    <span>{problem.fixNeeded}</span>
                  </div>
                </div>

                {/* Form fields specific to this problem */}
                {isDob && (
                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-[#6B665E]">
                      Confirm your date of birth
                    </label>
                    <DateInput
                      day={dobParts.day}
                      month={dobParts.month}
                      year={dobParts.year}
                      onChange={(parts) => setDobParts(parts)}
                    />
                    <p className="text-xs text-[#6B665E]">
                      Enter your date of birth as it appears on your ID.
                    </p>

                    <div className="pt-2">
                      {!showIdReplacement ? (
                        <button
                          type="button"
                          onClick={() => setShowIdReplacement(true)}
                          className="text-xs text-[#B5532C] hover:underline cursor-pointer"
                        >
                          Was your ID read wrongly? Upload a clearer ID instead.
                        </button>
                      ) : (
                        <div className="mt-3">
                          <FileUploader
                            slot="id_proof"
                            title="Replacement ID proof"
                            doc={replacements.id_proof}
                            onUpload={handleReplacementUpload}
                            onRemove={handleReplacementRemove}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isName && (
                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-[#6B665E]">
                      Full name
                    </label>
                    <input
                      type="text"
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      className="w-full h-11 px-3 bg-white border border-[#E4E0D8] rounded-[6px] text-sm text-[#1F1D1A]"
                    />
                  </div>
                )}

                {isMarks && (
                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-[#6B665E]">
                      Marks percentage
                    </label>
                    <input
                      type="text"
                      value={marksPercentage}
                      onChange={(e) => setMarksPercentage(e.target.value)}
                      className="w-full h-11 px-3 bg-white border border-[#E4E0D8] rounded-[6px] text-sm text-[#1F1D1A]"
                    />
                    {!showMarksheetReplacement ? (
                      <button
                        type="button"
                        onClick={() => setShowMarksheetReplacement(true)}
                        className="text-xs text-[#B5532C] hover:underline cursor-pointer"
                      >
                        Was your marksheet read wrongly? Upload a clearer marksheet instead.
                      </button>
                    ) : (
                      <div className="mt-3">
                        <FileUploader
                          slot="marksheet"
                          title="Replacement marksheet"
                          doc={replacements.marksheet}
                          onUpload={handleReplacementUpload}
                          onRemove={handleReplacementRemove}
                        />
                      </div>
                    )}
                  </div>
                )}

                {isIncome && (
                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-[#6B665E]">
                      Annual family income
                    </label>
                    <input
                      type="text"
                      value={annualFamilyIncome}
                      onChange={(e) => setAnnualFamilyIncome(e.target.value)}
                      className="w-full h-11 px-3 bg-white border border-[#E4E0D8] rounded-[6px] text-sm text-[#1F1D1A]"
                    />
                    {!showIncomeReplacement ? (
                      <button
                        type="button"
                        onClick={() => setShowIncomeReplacement(true)}
                        className="text-xs text-[#B5532C] hover:underline cursor-pointer"
                      >
                        Was your income certificate read wrongly? Upload a clearer certificate instead.
                      </button>
                    ) : (
                      <div className="mt-3">
                        <FileUploader
                          slot="income_certificate"
                          title="Replacement income certificate"
                          doc={replacements.income_certificate}
                          onUpload={handleReplacementUpload}
                          onRemove={handleReplacementRemove}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Direct document problem slot */}
                {isUnreadableOrWrongDoc && !isDob && !isMarks && !isIncome && (
                  <div className="mt-2">
                    <FileUploader
                      slot={problem.slot!}
                      title={`Replacement ${problem.slot!.replace('_', ' ')}`}
                      doc={replacements[problem.slot!]}
                      onUpload={handleReplacementUpload}
                      onRemove={handleReplacementRemove}
                    />
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 bg-[#1F1D1A] hover:bg-[#35322D] active:bg-black text-white text-sm font-medium rounded-[6px] flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#B5532C]" />
                <span>Checking your documents</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Resubmit corrected application</span>
              </>
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="text-xs font-medium text-[#6B665E] hover:text-[#1F1D1A] transition-colors cursor-pointer py-1"
            >
              Cancel and return to application overview
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};
