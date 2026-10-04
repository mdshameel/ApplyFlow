import React from 'react';
import { Header } from '../components/Header';
import { StatusBadge } from '../components/StatusBadge';
import { ApplicationRecord, NotificationRecord } from '../lib/types';
import { formatDateDisplay } from '../lib/formatters';
import {
  Calendar,
  FileText,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  FileQuestion,
  Bell
} from 'lucide-react';

interface MyApplicationPageProps {
  application: ApplicationRecord;
  notifications: NotificationRecord[];
  onGoToFix: () => void;
  onSignOut: () => void;
  onRefresh: () => void;
  onStartNewApplication?: () => void;
  onGoToStaff?: () => void;
  currentUser?: any;
}

export const MyApplicationPage: React.FC<MyApplicationPageProps> = ({
  application,
  notifications,
  onGoToFix,
  onSignOut,
  onRefresh,
  onStartNewApplication,
  onGoToStaff,
  currentUser
}) => {
  const problems = application.problems || [];
  const hasProblems = application.status === 'Needs correction' && problems.length > 0;
  const isApproved = application.status === 'Approved';
  const isRejected = application.status === 'Rejected';
  const isNeedsReview = application.status === 'Needs review';
  const isProcessing = application.status === 'Processing';
  const isDemoApplicant = currentUser?.isDemo || currentUser?.uid?.startsWith('demo-applicant-');

  // Find latest unread notification
  const latestNotif = notifications.length > 0 ? notifications[0] : null;

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col">
      <Header
        onSignOut={onSignOut}
        userRole={currentUser?.role}
        userEmail={currentUser?.email}
        onNavigateToStaff={onGoToStaff}
      />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Page Title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#1F1D1A] tracking-tight mb-1">
              My application
            </h1>
            <p className="text-sm text-[#6B665E]">
              {hasProblems
                ? 'Review issues flagged during intake check'
                : isApproved
                ? 'Your scholarship application has been approved'
                : isRejected
                ? 'Review decision on your scholarship application'
                : 'Intake and document verification overview'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isDemoApplicant && onStartNewApplication && (
              <button
                onClick={onStartNewApplication}
                type="button"
                className="text-xs bg-[#B5532C] hover:bg-[#9B4523] text-white px-3 py-1.5 rounded font-medium transition-colors cursor-pointer shadow-xs"
              >
                Start a new application
              </button>
            )}
            <button
              onClick={onRefresh}
              type="button"
              className="text-xs text-[#6B665E] hover:text-[#1F1D1A] px-2.5 py-1.5 border border-[#E4E0D8] rounded bg-white hover:bg-[#F2EFE9] transition-colors cursor-pointer"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* In-app Notification Banner if available */}
        {latestNotif && (
          <div className="mb-6 bg-white border-l-4 border-[#B5532C] border-y border-r border-[#E4E0D8] rounded-[6px] p-4 flex items-start gap-3 shadow-sm">
            <Bell className="w-4 h-4 text-[#B5532C] flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-semibold text-[#1F1D1A] mb-0.5">{latestNotif.title}</p>
              <p className="text-[#6B665E] leading-relaxed">{latestNotif.message}</p>
              <p className="text-[#A8A39D] mt-1.5">{formatDateDisplay(latestNotif.createdAt)}</p>
            </div>
          </div>
        )}

        {/* Main Status Card */}
        <div className="bg-white border border-[#E4E0D8] rounded-[6px] p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-[#6B665E]">
              Application ID <strong className="text-[#1F1D1A] font-semibold">#{application.id}</strong>
            </span>
            <StatusBadge status={application.status} />
          </div>

          <div className="bg-[#FAF8F4] border border-[#E4E0D8] rounded-[6px] p-4 mb-4">
            <p className="text-sm text-[#1F1D1A] leading-relaxed">
              {application.summary ||
                (isApproved
                  ? 'All details match your documents. Your application has been approved.'
                  : hasProblems
                  ? `We found ${problems.length} problems with your application. Fix them and we will check again.`
                  : isNeedsReview
                  ? 'Your application is undergoing manual verification by staff.'
                  : 'Your application has been received and is being processed.')}
            </p>
            {application.staffNote && (
              <p className="text-xs text-[#6B665E] mt-2 pt-2 border-t border-[#E4E0D8]">
                <strong>Staff note:</strong> {application.staffNote}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-[#6B665E]">
            {hasProblems ? (
              <div className="flex items-center gap-1.5 text-[#9A6700] font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Resubmit within 5 days</span>
              </div>
            ) : (
              <span />
            )}
            <span>Submitted {formatDateDisplay(application.submittedAt || application.createdAt)}</span>
          </div>
        </div>

        {/* What to fix Card (shown when Needs correction) */}
        {hasProblems && (
          <div className="bg-white border border-[#E4E0D8] rounded-[6px] p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base text-[#1F1D1A]">What to fix</h2>
              <span className="px-2 py-0.5 bg-[#FDF6E7] text-[#9A6700] text-xs font-medium rounded-full">
                {problems.length} {problems.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="space-y-4 mb-6">
              {problems.map((problem) => {
                const isDate = problem.field === 'dateOfBirth';
                const isDoc = problem.slot || problem.id.includes('unreadable') || problem.id.includes('wrong');

                return (
                  <div
                    key={problem.id}
                    className="bg-[#FAF8F4] border border-[#E4E0D8] rounded-[6px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded bg-white border border-[#E4E0D8] flex items-center justify-center text-[#B5532C] flex-shrink-0 mt-0.5">
                        {isDate ? (
                          <Calendar className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#1F1D1A] mb-1">
                          {problem.title}
                        </h3>
                        <p className="text-xs text-[#6B665E] leading-relaxed">
                          {problem.fixNeeded}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onGoToFix}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-[#E4E0D8] hover:border-[#1F1D1A] text-xs font-medium text-[#1F1D1A] rounded-[6px] transition-colors cursor-pointer self-end sm:self-center flex-shrink-0"
                    >
                      {isDate ? 'Fix date' : 'Upload document'}
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onGoToFix}
              className="w-full h-11 bg-[#1F1D1A] hover:bg-[#35322D] active:bg-black text-white text-sm font-medium rounded-[6px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Fix and resubmit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Application Journey Progress line */}
        <div className="bg-white border border-[#E4E0D8] rounded-[6px] p-6 shadow-sm">
          <h3 className="text-xs font-semibold text-[#6B665E] uppercase tracking-wider mb-6">
            Application journey
          </h3>

          <div className="relative flex items-center justify-between">
            {/* Connecting line */}
            <div className="absolute left-6 right-6 top-3.5 h-0.5 bg-[#E4E0D8] -z-0" />

            {/* Step 1: Submitted */}
            <div className="flex flex-col items-center text-center z-10">
              <div className="w-7 h-7 rounded-full bg-[#EDF6F0] text-[#2F7D4F] border border-[#2F7D4F]/30 flex items-center justify-center mb-2">
                <CheckCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-[#1F1D1A]">Submitted</span>
              <span className="text-[11px] text-[#6B665E] mt-0.5">
                {formatDateDisplay(application.submittedAt || application.createdAt)}
              </span>
            </div>

            {/* Step 2: Checked */}
            <div className="flex flex-col items-center text-center z-10">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center mb-2 border ${
                  hasProblems
                    ? 'bg-[#FDF6E7] text-[#9A6700] border-[#9A6700]/30'
                    : isNeedsReview
                    ? 'bg-[#F3EFF9] text-[#6B4FA3] border-[#6B4FA3]/30'
                    : 'bg-[#EDF6F0] text-[#2F7D4F] border-[#2F7D4F]/30'
                }`}
              >
                {hasProblems ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : isNeedsReview ? (
                  <Clock className="w-3.5 h-3.5" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
              </div>
              <span className="text-xs font-semibold text-[#1F1D1A]">Checked</span>
              <span
                className={`text-[11px] mt-0.5 ${
                  hasProblems ? 'text-[#9A6700]' : 'text-[#6B665E]'
                }`}
              >
                {hasProblems ? `${problems.length} problems found` : 'Checks complete'}
              </span>
            </div>

            {/* Step 3: Decision: Shows "Pending" until a decision exists, never a date! */}
            <div className="flex flex-col items-center text-center z-10">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center mb-2 border ${
                  isApproved
                    ? 'bg-[#EDF6F0] text-[#2F7D4F] border-[#2F7D4F]/30'
                    : isRejected
                    ? 'bg-[#FBECEB] text-[#B3362E] border-[#B3362E]/30'
                    : 'bg-[#FAF8F4] text-[#A8A39D] border-[#E4E0D8]'
                }`}
              >
                {isApproved ? (
                  <CheckCircle className="w-4 h-4" />
                ) : isRejected ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-[#A8A39D]" />
                )}
              </div>
              <span className="text-xs font-semibold text-[#1F1D1A]">Decision</span>
              <span className="text-[11px] text-[#6B665E] mt-0.5">
                {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending'}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
