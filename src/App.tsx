import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, signOut } from './lib/firebase';
import { ApplicationRecord, NotificationRecord, Role } from './lib/types';
import { parseDateParts, buildIsoDate } from './lib/formatters';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

// Pages
import { SignInPage } from './pages/SignInPage';
import { ApplyStep1Details } from './pages/ApplyStep1Details';
import { ApplyStep2Documents } from './pages/ApplyStep2Documents';
import { ApplyStep3Review } from './pages/ApplyStep3Review';
import { MyApplicationPage } from './pages/MyApplicationPage';
import { FixAndResubmitPage } from './pages/FixAndResubmitPage';
import { StaffSignInPage } from './pages/StaffSignInPage';
import { StaffApplicationsPage } from './pages/StaffApplicationsPage';
import { StaffDetailPage } from './pages/StaffDetailPage';

export default function App() {
  const [currentUser, setCurrentUser] = useState<(FirebaseUser & { role?: Role }) | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [application, setApplication] = useState<ApplicationRecord | null>(null);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [selectedStaffAppId, setSelectedStaffAppId] = useState<string | null>(null);

  // Applicant local draft step: 1, 2, 3 or 'my_application' or 'fix'
  const [applicantView, setApplicantView] = useState<'step1' | 'step2' | 'step3' | 'my_application' | 'fix'>('step1');

  // Step 1 Form Data
  const [formData, setFormData] = useState<{
    applicantName: string;
    email: string;
    phone: string;
    dobDay: string;
    dobMonth: string;
    dobYear: string;
    dateOfBirth?: string;
    course: string;
    marksPercentage: string;
    annualFamilyIncome: string;
  }>({
    applicantName: '',
    email: '',
    phone: '',
    dobDay: '',
    dobMonth: '',
    dobYear: '',
    dateOfBirth: '',
    course: '',
    marksPercentage: '',
    annualFamilyIncome: ''
  });

  // Step 2 Documents
  const [documents, setDocuments] = useState<any>({});

  // URL Path tracking
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Sync user role and load application
  const syncUserAndLoadData = async (user: FirebaseUser) => {
    try {
      const syncRes = await fetch('/api/auth/sync-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        })
      });
      const roleData = await syncRes.json();
      const updatedUser = Object.assign(user, { role: roleData.role });
      setCurrentUser(updatedUser);

      if (roleData.role === 'applicant') {
        const appRes = await fetch(`/api/applications/my?userId=${user.uid}`);
        if (appRes.ok) {
          const { application: userApp, notifications: userNotifs } = await appRes.json();
          setNotifications(userNotifs || []);

          if (userApp) {
            setApplication(userApp);
            // Pre-fill form data if available
            const dobParts = parseDateParts(userApp.dateOfBirth);
            setFormData({
              applicantName: userApp.applicantName || user.displayName || '',
              email: userApp.applicantEmail || user.email || '',
              phone: userApp.phone || '',
              dobDay: dobParts.day,
              dobMonth: dobParts.month,
              dobYear: dobParts.year,
              course: userApp.course || '',
              marksPercentage: userApp.marksPercentage ? String(userApp.marksPercentage) : '',
              annualFamilyIncome: userApp.annualFamilyIncome ? String(userApp.annualFamilyIncome) : ''
            });

            if (userApp.documents) {
              setDocuments(userApp.documents);
            }

            // Decide screen based on application state:
            // "if the applicant has no application, show Apply step 1. If they have a draft, resume it. If they have a submitted application, show My application."
            if (userApp.isDraft || userApp.status === 'Draft') {
              if (userApp.step === 2) {
                setApplicantView('step2');
              } else if (userApp.step === 3) {
                setApplicantView('step3');
              } else {
                setApplicantView('step1');
              }
            } else {
              setApplicantView('my_application');
            }
          } else {
            // First time applicant
            setFormData((prev) => ({
              ...prev,
              applicantName: user.displayName || '',
              email: user.email || ''
            }));
            setApplicantView('step1');
          }
        }
      }
    } catch (err) {
      console.error('Failed to sync user data:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        await syncUserAndLoadData(fbUser);
      } else {
        setCurrentUser(null);
        setApplication(null);
        setNotifications([]);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setCurrentUser(null);
    setApplication(null);
    if (currentPath.startsWith('/staff')) {
      navigateTo('/staff');
    } else {
      navigateTo('/');
    }
  };

  const refreshApplicantData = async () => {
    if (!currentUser) return;
    try {
      const appRes = await fetch(`/api/applications/my?userId=${currentUser.uid}`);
      if (appRes.ok) {
        const { application: userApp, notifications: userNotifs } = await appRes.json();
        setNotifications(userNotifs || []);
        if (userApp) {
          setApplication(userApp);
          if (!userApp.isDraft && userApp.status !== 'Draft') {
            setApplicantView('my_application');
          }
        }
      }
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  };

  // Save Step 1 Draft
  const handleStep1Next = async (step1Data: any) => {
    console.log('[App.tsx] handleStep1Next called with:', step1Data);
    setFormData(step1Data);
    console.log('[App.tsx] Setting applicantView -> step2');
    setApplicantView('step2');

    if (currentUser) {
      try {
        console.log('[App.tsx] Saving step 1 draft to server...');
        const res = await fetch('/api/applications/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.uid,
            applicantEmail: currentUser.email || step1Data.email,
            applicantName: step1Data.applicantName,
            phone: step1Data.phone,
            dateOfBirth: step1Data.dateOfBirth,
            course: step1Data.course,
            marksPercentage: step1Data.marksPercentage,
            annualFamilyIncome: step1Data.annualFamilyIncome,
            step: 2,
            documents
          })
        });
        const savedData = await res.json();
        console.log('[App.tsx] Step 1 draft saved successfully:', savedData);
      } catch (err) {
        console.error('[App.tsx] Failed to save step 1 draft:', err);
      }
    }
  };

  // Save Step 2 Documents
  const handleStep2Next = async (uploadedDocs: any) => {
    console.log('[App.tsx] handleStep2Next called with docs:', Object.keys(uploadedDocs || {}));
    setDocuments(uploadedDocs);
    console.log('[App.tsx] Setting applicantView -> step3');
    setApplicantView('step3');

    if (currentUser) {
      try {
        console.log('[App.tsx] Saving step 2 draft documents to server...');
        const res = await fetch('/api/applications/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.uid,
            applicantEmail: currentUser.email || formData.email,
            applicantName: formData.applicantName,
            phone: formData.phone,
            dateOfBirth: formData.dateOfBirth || buildIsoDate(formData.dobDay, formData.dobMonth, formData.dobYear),
            course: formData.course,
            marksPercentage: formData.marksPercentage,
            annualFamilyIncome: formData.annualFamilyIncome,
            step: 3,
            documents: uploadedDocs
          })
        });
        const savedData = await res.json();
        console.log('[App.tsx] Step 2 draft saved successfully:', savedData);
      } catch (err) {
        console.error('[App.tsx] Failed to save step 2 draft documents:', err);
      }
    }
  };

  // Step 3 Submit
  const handleFinalSubmit = async () => {
    if (!currentUser) return;
    const dobParts = [
      formData.dobYear,
      formData.dobMonth,
      formData.dobDay
    ];
    // Formulate ISO DOB
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const mIndex = months.indexOf(formData.dobMonth as any) + 1;
    const isoDob = `${formData.dobYear}-${String(mIndex).padStart(2, '0')}-${String(formData.dobDay).padStart(2, '0')}`;

    const res = await fetch('/api/applications/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.uid,
        applicantEmail: currentUser.email,
        applicantName: formData.applicantName,
        phone: formData.phone,
        dateOfBirth: isoDob,
        course: formData.course,
        marksPercentage: Number(formData.marksPercentage),
        annualFamilyIncome: Number(formData.annualFamilyIncome),
        documents
      })
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Evaluation failed');
    }

    setApplication(json.application);
    setApplicantView('my_application');
    await refreshApplicantData();
  };

  // Fix and Resubmit
  const handleResubmit = async (payload: any) => {
    if (!application) return;

    const res = await fetch(`/api/applications/${application.id}/resubmit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || 'Resubmission failed');
    }

    setApplication(json.application);
    setApplicantView('my_application');
    await refreshApplicantData();
  };

  const [grantingStaff, setGrantingStaff] = useState(false);

  const handleGrantStaffAccess = async () => {
    if (!currentUser) return;
    try {
      setGrantingStaff(true);
      const res = await fetch('/api/staff/grant-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          uid: currentUser.uid
        })
      });
      if (!res.ok) {
        throw new Error('Failed to authorize staff account');
      }
      const updatedUser = Object.assign(currentUser, { role: 'staff' as Role });
      setCurrentUser({ ...updatedUser });
      navigateTo('/staff');
    } catch (err) {
      console.error('Failed to grant staff access:', err);
    } finally {
      setGrantingStaff(false);
    }
  };

  // Loading indicator on boot
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center p-6 text-sm text-[#6B665E]">
        Checking authentication...
      </div>
    );
  }

  const isStaffRoute = currentPath.startsWith('/staff');

  // ==========================================
  // STAFF ROUTING LOGIC
  // ==========================================
  if (isStaffRoute) {
    // If user is logged in as Applicant and tries to access staff route:
    if (currentUser && currentUser.role === 'applicant') {
      return (
        <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-[460px] bg-white border border-[#E4E0D8] rounded-[6px] p-8 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#FFF1EB] text-[#B5532C] flex items-center justify-center mx-auto mb-4 border border-[#B5532C]/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-semibold text-[#1F1D1A] mb-2">
              Staff Access Required
            </h1>
            <p className="text-sm text-[#6B665E] mb-4">
              You are signed in as <strong className="text-[#1F1D1A]">{currentUser.email}</strong>, which currently has an <em>Applicant</em> role.
            </p>

            <div className="bg-[#FAF8F4] border border-[#E4E0D8] rounded-[6px] p-3 text-xs text-[#6B665E] text-left mb-6 space-y-1.5">
              <p className="font-medium text-[#1F1D1A]">Scholarship Admin Options:</p>
              <p>To access the institutional review and applicant evaluation dashboard, authorize this account or switch to an approved staff account.</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleGrantStaffAccess}
                disabled={grantingStaff}
                type="button"
                className="w-full h-11 bg-[#B5532C] hover:bg-[#9B4523] text-white text-sm font-medium rounded-[6px] flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-70"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{grantingStaff ? 'Authorizing...' : 'Authorize this Account as Staff Admin'}</span>
              </button>

              <button
                onClick={handleSignOut}
                type="button"
                className="w-full h-11 bg-[#1F1D1A] hover:bg-[#35322D] text-white text-sm font-medium rounded-[6px] transition-colors cursor-pointer"
              >
                Sign out and switch Google account
              </button>

              <button
                onClick={() => {
                  navigateTo('/');
                  setApplicantView('my_application');
                }}
                type="button"
                className="w-full h-10 border border-[#E4E0D8] bg-white hover:bg-[#FAF8F4] text-[#6B665E] hover:text-[#1F1D1A] text-sm font-medium rounded-[6px] transition-colors cursor-pointer"
              >
                Return to your application
              </button>
            </div>
          </div>
        </div>
      );
    }

    // If not signed in as staff, show Staff Sign In
    if (!currentUser || currentUser.role !== 'staff') {
      return (
        <StaffSignInPage
          onSuccess={(staffUser) => {
            setCurrentUser(staffUser);
          }}
          onGoToApplicant={() => navigateTo('/')}
        />
      );
    }

    // Signed in as Staff: check if viewing application detail
    if (selectedStaffAppId) {
      return (
        <StaffDetailPage
          applicationId={selectedStaffAppId}
          currentUser={currentUser}
          onBack={() => setSelectedStaffAppId(null)}
          onSignOut={handleSignOut}
          onGoToApplicant={() => navigateTo('/')}
        />
      );
    }

    // Default Staff view: Applications list
    return (
      <StaffApplicationsPage
        currentUser={currentUser}
        onSelectApplication={(id) => setSelectedStaffAppId(id)}
        onSignOut={handleSignOut}
        onGoToApplicant={() => navigateTo('/')}
      />
    );
  }

  // ==========================================
  // APPLICANT ROUTING LOGIC
  // ==========================================

  // If not signed in as applicant, show Applicant Sign In
  if (!currentUser) {
    return (
      <SignInPage
        onSuccess={(user) => {
          syncUserAndLoadData(user);
        }}
        onGoToStaff={() => navigateTo('/staff')}
      />
    );
  }

  // Top preview banner for staff viewing applicant flow
  const staffBanner = currentUser.role === 'staff' ? (
    <div className="bg-[#1F1D1A] text-white text-xs px-4 py-2 flex items-center justify-between">
      <span className="flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-[#B5532C]" />
        Staff Admin Mode &mdash; currently previewing the applicant interface
      </span>
      <button
        onClick={() => navigateTo('/staff')}
        className="underline text-[#FAF8F4] hover:text-white font-medium cursor-pointer"
      >
        Go to Staff Review Dashboard (/staff) &rarr;
      </button>
    </div>
  ) : null;

  // Signed-in Applicant screens:
  if (applicantView === 'fix' && application) {
    return (
      <>
        {staffBanner}
        <FixAndResubmitPage
          application={application}
          onResubmit={handleResubmit}
          onCancel={() => setApplicantView('my_application')}
          onSignOut={handleSignOut}
          onGoToStaff={() => navigateTo('/staff')}
          currentUser={currentUser}
        />
      </>
    );
  }

  if (applicantView === 'my_application' && application) {
    return (
      <>
        {staffBanner}
        <MyApplicationPage
          application={application}
          notifications={notifications}
          onGoToFix={() => setApplicantView('fix')}
          onSignOut={handleSignOut}
          onRefresh={refreshApplicantData}
          onGoToStaff={() => navigateTo('/staff')}
          currentUser={currentUser}
        />
      </>
    );
  }

  if (applicantView === 'step2') {
    return (
      <>
        {staffBanner}
        <ApplyStep2Documents
          documents={documents}
          onSaveAndNext={handleStep2Next}
          onBack={() => setApplicantView('step1')}
          onSignOut={handleSignOut}
          onGoToStaff={() => navigateTo('/staff')}
          currentUser={currentUser}
        />
      </>
    );
  }

  if (applicantView === 'step3') {
    return (
      <>
        {staffBanner}
        <ApplyStep3Review
          formData={{
            ...formData,
            dateOfBirth: `${formData.dobDay} ${formData.dobMonth} ${formData.dobYear}`
          }}
          documents={documents}
          onEditDetails={() => setApplicantView('step1')}
          onEditDocuments={() => setApplicantView('step2')}
          onSubmit={handleFinalSubmit}
          onBack={() => setApplicantView('step2')}
          onSignOut={handleSignOut}
          onGoToStaff={() => navigateTo('/staff')}
          currentUser={currentUser}
        />
      </>
    );
  }

  // Default step 1
  return (
    <>
      {staffBanner}
      <ApplyStep1Details
        key={currentUser ? `${currentUser.uid}-${formData.email}` : 'step1'}
        initialData={formData}
        onSaveAndNext={handleStep1Next}
        onSignOut={handleSignOut}
        onGoToStaff={() => navigateTo('/staff')}
        currentUser={currentUser}
      />
    </>
  );
}
