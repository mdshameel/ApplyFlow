import React, { useState, useEffect } from 'react';
import { Logo } from '../components/Logo';
import { signInWithGoogle, signInWithCustomToken, auth } from '../lib/firebase';
import { ShieldCheck, UserCheck, Sparkles, RefreshCw } from 'lucide-react';

interface StaffSignInPageProps {
  onSuccess: (user: any) => void;
  onGoToApplicant?: () => void;
}

export const StaffSignInPage: React.FC<StaffSignInPageProps> = ({ onSuccess, onGoToApplicant }) => {
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unapprovedUser, setUnapprovedUser] = useState<any | null>(null);
  const [granting, setGranting] = useState(false);
  const [demoMode, setDemoMode] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/demo-config')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.demoMode === 'boolean') {
          setDemoMode(data.demoMode);
        }
      })
      .catch(() => {
        setDemoMode(false);
      });
  }, []);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      setUnapprovedUser(null);
      const res = await signInWithGoogle();
      if (res.user) {
        // Sync role on server
        const syncRes = await fetch('/api/auth/sync-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: res.user.uid,
            email: res.user.email,
            displayName: res.user.displayName
          })
        });
        const roleData = await syncRes.json();

        if (roleData.role !== 'staff') {
          // Keep user object so an evaluator or admin can self-grant access
          setUnapprovedUser(res.user);
          setError(`Account ${res.user.email} is not listed as staff.`);
          return;
        }

        onSuccess({ ...res.user, role: 'staff', isDemo: false });
      }
    } catch (err: any) {
      console.error('Staff sign in error:', err);
      setError(err?.message || 'Failed to authenticate with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    try {
      setDemoLoading(true);
      setError(null);
      const res = await fetch('/api/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'staff' })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to start demo staff session');
      }

      const data = await res.json();
      if (data.token) {
        try {
          await signInWithCustomToken(auth, data.token);
        } catch (tokenErr) {
          console.warn('Custom token client sign-in fallback:', tokenErr);
        }
      }

      try {
        sessionStorage.setItem('applyflow_demo_session', JSON.stringify(data.user));
      } catch (storageErr) {
        console.warn('Session storage error:', storageErr);
      }

      onSuccess(data.user);
    } catch (err: any) {
      console.error('Demo staff sign in error:', err);
      setError(err?.message || 'Could not start demo staff session. Please try again.');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleAuthorizeSelf = async () => {
    if (!unapprovedUser) return;
    try {
      setGranting(true);
      setError(null);
      const res = await fetch('/api/staff/grant-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: unapprovedUser.email,
          uid: unapprovedUser.uid
        })
      });
      if (!res.ok) {
        throw new Error('Failed to authorize account');
      }
      onSuccess({ ...unapprovedUser, role: 'staff' });
    } catch (err: any) {
      setError(err?.message || 'Failed to authorize account');
    } finally {
      setGranting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[440px] bg-white border border-[#E4E0D8] rounded-[6px] p-8 text-center shadow-sm">
        {/* Centered logo */}
        <div className="flex justify-center mb-6">
          <Logo size="lg" />
        </div>

        <h1 className="text-2xl font-semibold text-[#1F1D1A] tracking-tight mb-1">
          Staff sign in
        </h1>
        <p className="text-sm text-[#6B665E] mb-6">
          Institutional review and award management
        </p>

        {error && (
          <div className="mb-4 p-3 bg-[#FBECEB] border border-[#F5C2C0] rounded-[6px] text-xs text-[#B3362E] text-left">
            <p className="mb-2 leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                handleDemoSignIn();
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#F5C2C0] text-[#B3362E] font-medium rounded hover:bg-[#FAF8F4] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Try again</span>
            </button>
          </div>
        )}

        {unapprovedUser && (
          <div className="mb-6 p-4 bg-[#FFF8EB] border border-[#F2D7A1] rounded-[6px] text-xs text-[#8C5D1E] text-left space-y-2.5">
            <p className="font-semibold text-sm text-[#1F1D1A]">Authorize Evaluator Account</p>
            <p className="leading-relaxed">
              To evaluate the staff portal with your Google account <strong>{unapprovedUser.email}</strong>, you can authorize it below.
            </p>
            <button
              onClick={handleAuthorizeSelf}
              disabled={granting}
              type="button"
              className="w-full h-9 bg-[#B5532C] hover:bg-[#9B4523] text-white text-xs font-medium rounded-[4px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>{granting ? 'Authorizing...' : 'Authorize this Account & Enter Portal'}</span>
            </button>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <button
            onClick={handleSignIn}
            disabled={loading || granting || demoLoading}
            type="button"
            className="w-full h-11 bg-[#1F1D1A] hover:bg-[#35322D] active:bg-black text-white text-sm font-medium rounded-[6px] px-4 flex items-center justify-center gap-3 transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                fill="#4285F4"
              />
              <path
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                fill="#34A853"
              />
              <path
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                fill="#FBBC05"
              />
              <path
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                fill="#EA4335"
              />
            </svg>
            <span>{loading ? 'Authenticating...' : 'Continue with Google'}</span>
          </button>

          {demoMode && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleDemoSignIn}
                disabled={loading || granting || demoLoading}
                className="w-full h-11 bg-white hover:bg-[#FAF8F4] active:bg-[#F2EFE9] text-[#1F1D1A] text-sm font-medium border border-[#D5D0C6] hover:border-[#1F1D1A] rounded-[6px] px-4 flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-[#B5532C]" />
                <span>{demoLoading ? 'Connecting to demo staff portal...' : 'Try the demo as staff'}</span>
              </button>
              <p className="text-[11px] text-[#8C877D] mt-2 font-normal">
                For evaluation. Demo data only.
              </p>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-[#E4E0D8] flex items-center justify-center gap-4 text-xs text-[#6B665E]">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#6B665E]" />
            Internal portal
          </span>
          <span className="flex items-center gap-1.5 text-[#B5532C]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B5532C]" />
            Staff Only
          </span>
        </div>

        {onGoToApplicant && (
          <div className="mt-4 pt-3 border-t border-[#E4E0D8]">
            <button
              type="button"
              onClick={onGoToApplicant}
              className="text-xs text-[#6B665E] hover:text-[#B5532C] transition-colors cursor-pointer"
            >
              &larr; Return to Applicant Portal (/)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

