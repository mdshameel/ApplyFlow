import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { StatusBadge } from '../components/StatusBadge';
import { DocumentModal } from '../components/DocumentModal';
import { ApplicationRecord, UploadedDocMetadata, ApplicationStatus } from '../lib/types';
import { formatDateDisplay, formatIndianCurrency, formatMarks, maskIdNumber } from '../lib/formatters';
import {
  ArrowLeft,
  Info,
  CheckCircle,
  AlertTriangle,
  FileText,
  Eye,
  Check,
  XCircle,
  Send,
  Loader2
} from 'lucide-react';

interface StaffDetailPageProps {
  applicationId: string;
  currentUser: any;
  onBack: () => void;
  onSignOut: () => void;
  onGoToApplicant?: () => void;
}

export const StaffDetailPage: React.FC<StaffDetailPageProps> = ({
  applicationId,
  currentUser,
  onBack,
  onSignOut,
  onGoToApplicant
}) => {
  const [application, setApplication] = useState<ApplicationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [acting, setActing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<UploadedDocMetadata | null>(null);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/staff/applications/${applicationId}`, {
        headers: {
          'x-user-email': currentUser.email || '',
          'x-user-id': currentUser.uid || ''
        }
      });
      if (res.ok) {
        const json = await res.json();
        setApplication(json.application);
      } else {
        setErrorMsg('Application not found');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load application');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplication();
  }, [applicationId]);

  const handleAction = async (action: 'approve' | 'request_correction' | 'reject') => {
    if (!application) return;

    if (action === 'request_correction' && !note.trim()) {
      setErrorMsg('Please provide a note to the applicant explaining what needs correction.');
      return;
    }

    try {
      setActing(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch(`/api/staff/applications/${application.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email || '',
          'x-user-id': currentUser.uid || ''
        },
        body: JSON.stringify({ action, note })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update status');
      }

      setApplication(json.application);
      setSuccessMsg(`Application status updated to ${json.application.status}`);
      setNote('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Action failed');
    } finally {
      setActing(false);
    }
  };

  const renderHeader = () => (
    <Header
      onSignOut={onSignOut}
      userRole="staff"
      userEmail={currentUser?.email}
      onNavigateToApplicant={onGoToApplicant}
    />
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex flex-col">
        {renderHeader()}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-12 text-center text-sm text-[#6B665E]">
          Loading application detail...
        </main>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex flex-col">
        {renderHeader()}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-12 text-center">
          <p className="text-base text-[#B3362E] mb-4">Application not found</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-white border border-[#E4E0D8] rounded-[6px] text-sm text-[#1F1D1A]"
          >
            Back to applications
          </button>
        </main>
      </div>
    );
  }

  const docs = application.documents || {};
  const comparisons = application.comparisons || [];

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col pb-16">
      {renderHeader()}

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Back Link */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B665E] hover:text-[#1F1D1A] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to applications</span>
          </button>
          <span className="text-xs text-[#6B665E]">
            Submitted on {formatDateDisplay(application.submittedAt || application.createdAt)}
          </span>
        </div>

        {/* Top Header Card */}
        <div className="bg-white border border-[#E4E0D8] rounded-[6px] p-6 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-semibold text-[#1F1D1A] tracking-tight">
                  {application.applicantName}
                </h1>
                <StatusBadge status={application.status} />
              </div>
              <div className="flex items-center gap-2 text-xs text-[#6B665E]">
                <span>Application ID: <strong className="text-[#1F1D1A]">#{application.id}</strong></span>
                {application.isDemo && (
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#FFF1EB] text-[#B5532C] border border-[#B5532C]/20">
                    Demo
                  </span>
                )}
                <span>•</span>
                <span>Course: {application.course}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback alerts */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-[#FBECEB] border border-[#F5C2C0] rounded-[6px] text-xs text-[#B3362E]">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 bg-[#EDF6F0] border border-[#BDE0C8] rounded-[6px] text-xs text-[#2F7D4F]">
            {successMsg}
          </div>
        )}

        {/* "What we found" summary box */}
        <div className="bg-[#FAF8F4] border border-[#E4E0D8] rounded-[6px] p-4 flex items-start gap-3 mb-6">
          <div className="w-6 h-6 rounded-full bg-white border border-[#E4E0D8] flex items-center justify-center text-[#B5532C] flex-shrink-0 mt-0.5">
            <Info className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 text-xs">
            <h3 className="font-semibold text-[#1F1D1A] mb-0.5">What we found</h3>
            <p className="text-[#6B665E] leading-relaxed">
              {application.summary || 'All form entries match the extracted document fields without issue.'}
            </p>
          </div>
        </div>

        {/* Data Comparison Table */}
        <div className="bg-white border border-[#E4E0D8] rounded-[6px] shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-[#E4E0D8] flex items-center justify-between bg-[#FAF8F4]/50">
            <div>
              <h2 className="font-semibold text-base text-[#1F1D1A]">Data comparison</h2>
              <p className="text-xs text-[#6B665E]">Comparing entered form against submitted files</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAF8F4] border-b border-[#E4E0D8] text-xs font-semibold text-[#6B665E]">
                <tr>
                  <th className="py-3 px-6">Field</th>
                  <th className="py-3 px-4">Entered by applicant</th>
                  <th className="py-3 px-4">Found in documents</th>
                  <th className="py-3 px-6 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E0D8]">
                {comparisons.map((row) => {
                  const isMismatch = row.result === 'mismatch';

                  return (
                    <tr
                      key={row.field}
                      className={isMismatch ? 'bg-[#FFF8E7]' : 'hover:bg-[#FAF8F4]/50'}
                    >
                      <td className={`py-3.5 px-6 font-medium ${isMismatch ? 'text-[#9A6700]' : 'text-[#1F1D1A]'}`}>
                        {row.label}
                      </td>

                      <td className={`py-3.5 px-4 ${isMismatch ? 'text-[#9A6700] font-medium' : 'text-[#1F1D1A]'}`}>
                        {row.entered}
                      </td>

                      <td className={`py-3.5 px-4 ${isMismatch ? 'text-[#9A6700] font-medium' : 'text-[#6B665E]'}`}>
                        {row.found}
                      </td>

                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        {isMismatch ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-[#FDF6E7] text-[#9A6700] border border-[#F2D79A]">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Does not match</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-[#EDF6F0] text-[#2F7D4F] border border-[#BDE0C8]">
                            <CheckCircle className="w-3 h-3" />
                            <span>Match</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Documents Cards Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-base text-[#1F1D1A]">Documents</h2>
            <span className="text-xs text-[#6B665E]">3 files attached</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* ID Proof Card */}
            <div className="bg-white border border-[#E4E0D8] rounded-[6px] p-4 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#1F1D1A]">ID proof</h3>
                    <p className="text-xs text-[#6B665E]">
                      {docs.id_proof?.extractedFields?.id_number_last4
                        ? maskIdNumber(docs.id_proof.extractedFields.id_number_last4, 'Aadhaar')
                        : 'Government ID'}
                    </p>
                  </div>
                  <StatusBadge status={docs.id_proof?.isReadable === false ? 'Unreadable' : 'Uploaded'} size="sm" />
                </div>

                <div className="bg-[#FAF8F4] border border-[#E4E0D8] rounded p-3 text-xs space-y-1 mb-4">
                  <div className="flex items-center justify-between text-[#6B665E]">
                    <span className="uppercase text-[10px] font-semibold">
                      {docs.id_proof?.extractedFields?.issuer_or_board || 'GOVT OF INDIA'}
                    </span>
                  </div>
                  <p className="text-[#1F1D1A]">
                    Name: <strong>{docs.id_proof?.extractedFields?.full_name || '—'}</strong>
                  </p>
                  <p className="text-[#1F1D1A]">
                    DOB: <strong>{formatDateDisplay(docs.id_proof?.extractedFields?.date_of_birth)}</strong>
                  </p>
                  <p className="text-[#6B665E]">
                    UID: {docs.id_proof?.extractedFields?.id_number_last4 ? maskIdNumber(docs.id_proof.extractedFields.id_number_last4, 'XXXX XXXX') : '—'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDocForPreview(docs.id_proof || null)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 bg-[#FAF8F4] hover:bg-[#F2EFE9] border border-[#E4E0D8] text-xs font-medium text-[#1F1D1A] rounded transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View full file</span>
              </button>
            </div>

            {/* Marksheet Card */}
            <div className="bg-white border border-[#E4E0D8] rounded-[6px] p-4 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#1F1D1A]">Marksheet</h3>
                    <p className="text-xs text-[#6B665E]">Class 12 / Degree Marksheet</p>
                  </div>
                  <StatusBadge status={docs.marksheet?.isReadable === false ? 'Unreadable' : 'Uploaded'} size="sm" />
                </div>

                <div className="bg-[#FAF8F4] border border-[#E4E0D8] rounded p-3 text-xs space-y-1 mb-4">
                  <div className="flex items-center justify-between text-[#6B665E]">
                    <span className="uppercase text-[10px] font-semibold">
                      {docs.marksheet?.extractedFields?.issuer_or_board || 'ACADEMIC BOARD'}
                    </span>
                  </div>
                  <p className="text-[#1F1D1A]">
                    Candidate: <strong>{docs.marksheet?.extractedFields?.full_name || '—'}</strong>
                  </p>
                  <p className="text-[#1F1D1A]">
                    Aggregate: <strong>{formatMarks(docs.marksheet?.extractedFields?.marks_percentage)}</strong>
                  </p>
                  <p className="text-[#2F7D4F]">Status: Passed</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDocForPreview(docs.marksheet || null)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 bg-[#FAF8F4] hover:bg-[#F2EFE9] border border-[#E4E0D8] text-xs font-medium text-[#1F1D1A] rounded transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View full file</span>
              </button>
            </div>

            {/* Income Certificate Card */}
            <div className="bg-white border border-[#E4E0D8] rounded-[6px] p-4 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#1F1D1A]">Income certificate</h3>
                    <p className="text-xs text-[#6B665E]">Income Certificate</p>
                  </div>
                  <StatusBadge
                    status={
                      docs.income_certificate?.isReadable === false || docs.income_certificate?.readabilityIssue
                        ? 'Blurry scan'
                        : 'Uploaded'
                    }
                    size="sm"
                  />
                </div>

                <div className="bg-[#FAF8F4] border border-[#E4E0D8] rounded p-3 text-xs space-y-1 mb-4">
                  <div className="flex items-center justify-between text-[#6B665E]">
                    <span className="uppercase text-[10px] font-semibold">
                      {docs.income_certificate?.extractedFields?.issuer_or_board || 'REVENUE AUTHORITY'}
                    </span>
                  </div>
                  <p className="text-[#1F1D1A]">
                    Declared: <strong>{formatIndianCurrency(docs.income_certificate?.extractedFields?.annual_income)} / annum</strong>
                  </p>
                  {docs.income_certificate?.readabilityIssue && (
                    <p className="text-[#9A6700] text-[11px]">
                      Issue: {docs.income_certificate.readabilityIssue.replace('_', ' ')}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDocForPreview(docs.income_certificate || null)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 bg-[#FAF8F4] hover:bg-[#F2EFE9] border border-[#E4E0D8] text-xs font-medium text-[#1F1D1A] rounded transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View full file</span>
              </button>
            </div>
          </div>
        </div>

        {/* Staff Action & Decision Bar */}
        <div className="bg-white border border-[#E4E0D8] rounded-[6px] p-6 shadow-sm">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-[#1F1D1A]">
                Note to applicant:
              </label>
              <span className="text-xs text-[#6B665E]">
                Will be emailed and shown on applicant portal
              </span>
            </div>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Please provide a clear scan of your income certificate and confirm your date of birth."
              className="w-full p-3 bg-white border border-[#E4E0D8] rounded-[6px] text-sm text-[#1F1D1A] placeholder:text-[#A8A39D] focus:outline-none focus:ring-1 focus:ring-[#B5532C] focus:border-[#B5532C]"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-[#E4E0D8]">
            <button
              type="button"
              disabled={acting}
              onClick={() => handleAction('reject')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 border border-[#B3362E] text-xs font-medium text-[#B3362E] hover:bg-[#FBECEB] rounded-[6px] transition-colors cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject</span>
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                disabled={acting}
                onClick={() => handleAction('approve')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 border border-[#2F7D4F] text-xs font-medium text-[#2F7D4F] hover:bg-[#EDF6F0] rounded-[6px] transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Approve</span>
              </button>

              <button
                type="button"
                disabled={acting}
                onClick={() => handleAction('request_correction')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 bg-[#1F1D1A] hover:bg-[#35322D] active:bg-black text-xs font-medium text-white rounded-[6px] transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Request correction</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Full Document Viewer Modal */}
      <DocumentModal
        docMeta={selectedDocForPreview}
        onClose={() => setSelectedDocForPreview(null)}
      />
    </div>
  );
};
