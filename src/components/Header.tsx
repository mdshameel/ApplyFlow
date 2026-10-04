import React from 'react';
import { Logo } from './Logo';
import { ShieldCheck, ArrowRight, ArrowLeft, LogOut } from 'lucide-react';

interface HeaderProps {
  onSignOut?: () => void;
  showSignOut?: boolean;
  userRole?: 'applicant' | 'staff';
  userEmail?: string;
  onNavigateToStaff?: () => void;
  onNavigateToApplicant?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSignOut,
  showSignOut = true,
  userRole,
  userEmail,
  onNavigateToStaff,
  onNavigateToApplicant
}) => {
  return (
    <header className="w-full bg-[#FAF8F4] border-b border-[#E4E0D8]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          {userRole === 'staff' && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#B5532C]/10 text-[#B5532C] border border-[#B5532C]/20">
              <ShieldCheck className="w-3 h-3" />
              Staff Reviewer
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {userRole === 'staff' && onNavigateToApplicant && (
            <button
              onClick={onNavigateToApplicant}
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B665E] hover:text-[#1F1D1A] transition-colors py-1.5 px-2.5 rounded hover:bg-[#EAE6DF] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Applicant View</span>
            </button>
          )}

          {userRole !== 'staff' && onNavigateToStaff && (
            <button
              onClick={onNavigateToStaff}
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B5532C] hover:text-[#9B4523] bg-[#B5532C]/5 hover:bg-[#B5532C]/10 border border-[#B5532C]/20 transition-colors py-1 px-2.5 rounded cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
              <ArrowRight className="w-3 h-3 hidden sm:inline" />
            </button>
          )}

          {userEmail && (
            <span className="hidden md:inline-block text-xs text-[#8C867E] max-w-[140px] truncate" title={userEmail}>
              {userEmail}
            </span>
          )}

          {showSignOut && onSignOut && (
            <button
              onClick={onSignOut}
              type="button"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#6B665E] hover:text-[#1F1D1A] transition-colors cursor-pointer py-1.5 px-2.5 rounded hover:bg-[#EAE6DF]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
