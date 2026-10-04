import React, { useState } from 'react';
import { Header } from '../components/Header';
import { ApplyStepper } from '../components/ApplyStepper';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateDisplay, formatIndianCurrency, formatMarks } from '../lib/formatters';
import { Edit2, FileText, Check, Loader2 } from 'lucide-react';

interface ApplyStep3ReviewProps {
  formData: {
    applicantName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    course: string;
    marksPercentage: number | string;
    annualFamilyIncome: number | string;
  };
  documents: {
    id_proof?: any;
    marksheet?: any;
    income_certificate?: any;
  };
  onEditDetails: () => void;
  onEditDocuments: () => void;
  onSubmit: () => Promise<void>;
  onBack: () => void;
  onSignOut: () => void;
  onGoToStaff?: () => void;
  currentUser?: any;
}

export const ApplyStep3Review: React.FC<ApplyStep3ReviewProps> = ({
  formData,
  documents,
  onEditDetails,
  onEditDocuments,
  onSubmit,
  onBack,
  onSignOut,
  onGoToStaff,
  currentUser
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!confirmed || submitting) return;
    try {
      setSubmitting(true);
      setSubmitError(null);
      await onSubmit();
    } catch (err: any) {
      console.error('Submission error:', err);
      setSubmitError(err?.message || 'Failed to submit application. Please try again.');
      setSubmitting(false);
    }
  };

  const formatMb = (bytes?: number) =>
    bytes ? (bytes / (1024 * 1024)).toFixed(1) + ' MB' : '';

  const docList = [
    { slot: 'id_proof', label: 'ID proof', doc: documents.id_proof },
    { slot: 'marksheet', label: 'Marksheet', doc: documents.marksheet },
    { slot: 'income_certificate', label: 'Income certificate', doc: documents.income_certificate }
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col">
      <Header
        onSignOut={onSignOut}
        userRole={currentUser?.role}
        userEmail={currentUser?.email}
        onNavigateToStaff={onGoToStaff}
      />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <ApplyStepper currentStep={3} />

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#1F1D1A] tracking-tight mb-1">
            Review and submit
          </h1>
          <p className="text-sm text-[#6B665E]">
            Please review your institutional grant application information before finalizing your submission.
          </p>
        </div>

        {submitError && (
          <div className="mb-6 p-4 bg-[#FBECEB] border border-[#F5C2C0] rounded-[6px] text-sm text-[#B3362E]">
            {submitError}
          </div>
        )}

        {/* Card 1: Your Details */}
        <div className="bg-white border border-[#E4E0D8] rounded-[6px] p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-[#E4E0D8] mb-4">
            <h2 className="font-semibold text-base text-[#1F1D1A]">Your details</h2>
            <button
              type="button"
              onClick={onEditDetails}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B665E] hover:text-[#B5532C] transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>

          <div className="divide-y divide-[#F2EFE9] text-sm">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[#6B665E]">Full name</span>
              <span className="font-medium text-[#1F1D1A] text-right">{formData.applicantName}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[#6B665E]">Email</span>
              <span className="text-[#1F1D1A] text-right">{formData.email}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[#6B665E]">Phone</span>
              <span className="text-[#1F1D1A] text-right">{formData.phone}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[#6B665E]">Date of birth</span>
              <span className="font-medium text-[#1F1D1A] text-right">{formatDateDisplay(formData.dateOfBirth)}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[#6B665E]">Course</span>
              <span className="font-medium text-[#1F1D1A] text-right">{formData.course}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[#6B665E]">Marks percentage</span>
              <span className="font-medium text-[#1F1D1A] text-right">{formatMarks(Number(formData.marksPercentage))}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[#6B665E]">Annual family income</span>
              <span className="font-medium text-[#1F1D1A] text-right">{formatIndianCurrency(Number(formData.annualFamilyIncome))}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Your Documents */}
        <div className="bg-white border border-[#E4E0D8] rounded-[6px] p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-[#E4E0D8] mb-4">
            <h2 className="font-semibold text-base text-[#1F1D1A]">Your documents</h2>
            <button
              type="button"
              onClick={onEditDocuments}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B665E] hover:text-[#B5532C] transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>

          <div className="space-y-3">
            {docList.map(({ slot, label, doc }) => (
              <div
                key={slot}
                className="bg-[#FAF8F4] border border-[#E4E0D8] rounded-[6px] p-3.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white border border-[#E4E0D8] rounded flex items-center justify-center text-[#B5532C]">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1F1D1A] truncate max-w-xs sm:max-w-md">
                      {doc?.fileName || `${label} file`}
                    </p>
                    <p className="text-xs text-[#6B665E]">
                      {label} • {formatMb(doc?.fileSize)}
                    </p>
                  </div>
                </div>
                <StatusBadge status="Uploaded" size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Confirmation Checkbox */}
        <div className="mb-6">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={submitting}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-[#1F1D1A] border-[#E4E0D8] focus:ring-[#B5532C] cursor-pointer"
            />
            <span className="text-sm text-[#1F1D1A]">
              I confirm that the details and documents are correct
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!confirmed || submitting}
          className="w-full h-11 bg-[#1F1D1A] hover:bg-[#35322D] active:bg-black text-white text-sm font-medium rounded-[6px] flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mb-4"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#B5532C]" />
              <span>Checking your documents</span>
            </>
          ) : (
            <span>Submit application</span>
          )}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            className="text-xs font-medium text-[#6B665E] hover:text-[#1F1D1A] transition-colors cursor-pointer py-1"
          >
            Back
          </button>
        </div>
      </main>
    </div>
  );
};
