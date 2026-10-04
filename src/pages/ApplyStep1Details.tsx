import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { ApplyStepper } from '../components/ApplyStepper';
import { DateInput } from '../components/DateInput';
import { validateDetailsForm, formatPhoneNumber } from '../lib/validation';
import { formatIndianCurrency } from '../lib/formatters';
import { ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

interface ApplyStep1DetailsProps {
  initialData: {
    applicantName: string;
    email: string;
    phone: string;
    dobDay: string;
    dobMonth: string;
    dobYear: string;
    course: string;
    marksPercentage: string;
    annualFamilyIncome: string;
  };
  onSaveAndNext: (data: any) => void;
  onSignOut: () => void;
  onGoToStaff?: () => void;
  currentUser?: any;
}

const COURSE_OPTIONS = [
  'B.Tech Computer Science and Engineering',
  'B.Tech Electronics and Communication Engineering',
  'B.Tech Mechanical Engineering',
  'B.Tech Civil Engineering',
  'B.Tech Electrical Engineering',
  'M.Sc Applied Physics',
  'B.Sc Mathematics',
  'B.Sc Physics',
  'B.A. Economics (Hons)',
  'B.Com (Hons)',
  'Bachelor of Business Administration (BBA)',
  'Bachelor of Computer Applications (BCA)',
  'Master of Computer Applications (MCA)',
  'Master of Business Administration (MBA)'
];

export const ApplyStep1Details: React.FC<ApplyStep1DetailsProps> = ({
  initialData,
  onSaveAndNext,
  onSignOut,
  onGoToStaff,
  currentUser
}) => {
  const [formData, setFormData] = useState({
    ...initialData,
    phone: initialData.phone || '+91 '
  });
  const [isOtherCourse, setIsOtherCourse] = useState(
    Boolean(initialData.course && !COURSE_OPTIONS.includes(initialData.course))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Sync state if initialData changes after async user/draft load
  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        applicantName: prev.applicantName || initialData.applicantName || '',
        email: initialData.email || prev.email || '',
        phone: prev.phone && prev.phone !== '+91 ' ? prev.phone : (initialData.phone || '+91 '),
        dobDay: prev.dobDay || initialData.dobDay || '',
        dobMonth: prev.dobMonth || initialData.dobMonth || '',
        dobYear: prev.dobYear || initialData.dobYear || '',
        course: prev.course || initialData.course || '',
        marksPercentage: prev.marksPercentage || initialData.marksPercentage || '',
        annualFamilyIncome: prev.annualFamilyIncome || initialData.annualFamilyIncome || ''
      }));
      if (initialData.course && !COURSE_OPTIONS.includes(initialData.course)) {
        setIsOtherCourse(true);
      }
    }
  }, [initialData]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handlePhoneChange = (val: string) => {
    const formatted = formatPhoneNumber(val);
    handleChange('phone', formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateDetailsForm(formData);

    if (!result.isValid) {
      setErrors(result.errors as any);
      return;
    }

    try {
      setSaving(true);
      await onSaveAndNext({
        ...formData,
        dateOfBirth: result.isoDate
      });
    } catch (err) {
      console.error('Failed to proceed to step 2:', err);
    } finally {
      setSaving(false);
    }
  };

  const isDemoApplicant = currentUser?.isDemo || currentUser?.uid?.startsWith('demo-applicant-');

  const handleFillSampleDetails = () => {
    setFormData({
      applicantName: 'Aarav Sharma',
      email: currentUser?.email || 'aarav.sharma@scholarship.example.org',
      phone: '+91 98765 40000',
      dobDay: '15',
      dobMonth: 'May',
      dobYear: '2004',
      course: 'B.Tech Computer Science and Engineering',
      marksPercentage: '88',
      annualFamilyIncome: '250000'
    });
    setIsOtherCourse(false);
    setErrors({});
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
        <ApplyStepper currentStep={1} />

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#1F1D1A] tracking-tight mb-1">
            Your details
          </h1>
          <p className="text-sm text-[#6B665E]">
            Please confirm your personal and academic record as registered with the university council.
          </p>
        </div>

        {isDemoApplicant && (
          <div className="mb-6 p-4 bg-[#FFF8EB] border border-[#F2D7A1] rounded-[6px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-[#B5532C] flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-[#1F1D1A]">Evaluation Sample Data</p>
                <p className="text-[11px] text-[#8C5D1E]">Fill Step 1 with fictional details matching the clean sample document set.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFillSampleDetails}
              className="px-3 py-1.5 bg-[#B5532C] hover:bg-[#9B4523] text-white text-xs font-medium rounded-[4px] transition-colors cursor-pointer flex-shrink-0 shadow-xs"
            >
              Fill the form with sample details
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-[#E4E0D8] rounded-[6px] p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-[#1F1D1A] mb-1.5">
              Full name
            </label>
            <input
              type="text"
              value={formData.applicantName}
              onChange={(e) => handleChange('applicantName', e.target.value)}
              placeholder="Pooja Ramesh Sharma"
              className={`w-full h-11 px-3.5 bg-white border ${
                errors.applicantName ? 'border-[#B3362E]' : 'border-[#E4E0D8]'
              } rounded-[6px] text-base text-[#1F1D1A] placeholder:text-[#A8A39D] focus:outline-none focus:ring-1 focus:ring-[#B5532C] focus:border-[#B5532C]`}
            />
            {errors.applicantName ? (
              <p className="text-sm text-[#B3362E] mt-1.5">{errors.applicantName}</p>
            ) : (
              <p className="text-xs text-[#6B665E] mt-1.5">
                As printed on your secondary school certificate or national identity registry.
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[#1F1D1A] mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              disabled={Boolean(initialData.email && initialData.email.trim())}
              placeholder="applicant@example.com"
              className={`w-full h-11 px-3.5 ${
                initialData.email && initialData.email.trim()
                  ? 'bg-[#FAF8F4] text-[#6B665E] cursor-not-allowed'
                  : 'bg-white text-[#1F1D1A]'
              } border ${
                errors.email ? 'border-[#B3362E]' : 'border-[#E4E0D8]'
              } rounded-[6px] text-base placeholder:text-[#A8A39D] focus:outline-none focus:ring-1 focus:ring-[#B5532C] focus:border-[#B5532C]`}
            />
            {errors.email ? (
              <p className="text-sm text-[#B3362E] mt-1.5">{errors.email}</p>
            ) : (
              <p className="text-xs text-[#6B665E] mt-1.5">
                Prefilled from your account. Used for all application status notifications.
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-[#1F1D1A]">
                Phone
              </label>
              {errors.phone && (
                <span className="text-xs text-[#B3362E]">Format requires verification</span>
              )}
            </div>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="+91 98201 44521"
              className={`w-full h-11 px-3.5 bg-white border ${
                errors.phone ? 'border-[#B3362E] bg-[#FFFBFB]' : 'border-[#E4E0D8]'
              } rounded-[6px] text-base text-[#1F1D1A] placeholder:text-[#A8A39D] focus:outline-none focus:ring-1 focus:ring-[#B5532C] focus:border-[#B5532C]`}
            />
            {errors.phone ? (
              <p className="text-sm text-[#B3362E] mt-1.5">{errors.phone}</p>
            ) : (
              <p className="text-xs text-[#6B665E] mt-1.5">
                Enter a primary mobile number verified with applicant SMS one-time passcodes.
              </p>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-[#1F1D1A] mb-1.5">
              Date of birth
            </label>
            <DateInput
              day={formData.dobDay}
              month={formData.dobMonth}
              year={formData.dobYear}
              error={errors.dateOfBirth}
              onChange={(parts) => {
                setFormData((prev) => ({
                  ...prev,
                  dobDay: parts.day,
                  dobMonth: parts.month,
                  dobYear: parts.year
                }));
                if (errors.dateOfBirth) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.dateOfBirth;
                    return next;
                  });
                }
              }}
            />
          </div>

          {/* Course */}
          <div>
            <label className="block text-sm font-medium text-[#1F1D1A] mb-1.5">
              Course
            </label>
            <select
              value={
                isOtherCourse
                  ? 'Other'
                  : COURSE_OPTIONS.includes(formData.course)
                  ? formData.course
                  : ''
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'Other') {
                  setIsOtherCourse(true);
                  handleChange('course', COURSE_OPTIONS.includes(formData.course) ? '' : formData.course);
                } else {
                  setIsOtherCourse(false);
                  handleChange('course', val);
                }
              }}
              className={`w-full h-11 px-3.5 bg-white border ${
                errors.course ? 'border-[#B3362E]' : 'border-[#E4E0D8]'
              } rounded-[6px] text-base text-[#1F1D1A] focus:outline-none focus:ring-1 focus:ring-[#B5532C] focus:border-[#B5532C] cursor-pointer`}
            >
              <option value="">Select your course</option>
              {COURSE_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="Other">Other (enter manually)</option>
            </select>

            {isOtherCourse && (
              <input
                type="text"
                value={formData.course}
                onChange={(e) => handleChange('course', e.target.value)}
                placeholder="Enter your course name"
                className={`mt-2 w-full h-11 px-3.5 bg-white border ${
                  errors.course ? 'border-[#B3362E]' : 'border-[#E4E0D8]'
                } rounded-[6px] text-base text-[#1F1D1A] placeholder:text-[#A8A39D] focus:outline-none focus:ring-1 focus:ring-[#B5532C] focus:border-[#B5532C]`}
              />
            )}

            {errors.course && (
              <p className="text-sm text-[#B3362E] mt-1.5">{errors.course}</p>
            )}
          </div>

          {/* Marks & Annual Income Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-[#1F1D1A] mb-1.5">
                Marks percentage
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.marksPercentage}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, '');
                    handleChange('marksPercentage', v);
                  }}
                  placeholder="84.5"
                  className={`w-full h-11 pl-3.5 pr-8 bg-white border ${
                    errors.marksPercentage ? 'border-[#B3362E]' : 'border-[#E4E0D8]'
                  } rounded-[6px] text-base text-[#1F1D1A] placeholder:text-[#A8A39D] focus:outline-none focus:ring-1 focus:ring-[#B5532C] focus:border-[#B5532C]`}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-[#6B665E] pointer-events-none">
                  %
                </span>
              </div>
              {errors.marksPercentage && (
                <p className="text-sm text-[#B3362E] mt-1.5">{errors.marksPercentage}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1F1D1A] mb-1.5">
                Annual family income
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#6B665E] pointer-events-none">
                  ₹
                </span>
                <input
                  type="text"
                  value={formData.annualFamilyIncome}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    handleChange('annualFamilyIncome', raw);
                  }}
                  placeholder="240000"
                  className={`w-full h-11 pl-8 pr-3.5 bg-white border ${
                    errors.annualFamilyIncome ? 'border-[#B3362E]' : 'border-[#E4E0D8]'
                  } rounded-[6px] text-base text-[#1F1D1A] placeholder:text-[#A8A39D] focus:outline-none focus:ring-1 focus:ring-[#B5532C] focus:border-[#B5532C]`}
                />
              </div>
              {errors.annualFamilyIncome ? (
                <p className="text-sm text-[#B3362E] mt-1.5">{errors.annualFamilyIncome}</p>
              ) : formData.annualFamilyIncome ? (
                <p className="text-xs text-[#6B665E] mt-1.5">
                  Displays as {formatIndianCurrency(Number(formData.annualFamilyIncome))}
                </p>
              ) : null}
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-[#FAF8F4] border border-[#E4E0D8] rounded-[6px] p-4 flex items-start gap-3 text-xs text-[#6B665E]">
            <ShieldCheck className="w-5 h-5 text-[#B5532C] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-[#1F1D1A] mb-0.5">Applicant details preview</p>
              <p>Make sure the name and birth date match your government identity document.</p>
            </div>
          </div>

          {/* Error Summary Banner if any field fails validation */}
          {Object.keys(errors).length > 0 && (
            <div className="p-3 bg-[#FBECEB] border border-[#F5C2C0] rounded-[6px] text-xs text-[#B3362E] flex items-center gap-2">
              <span>Please check and correct the highlighted fields above before continuing.</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full h-11 bg-[#1F1D1A] hover:bg-[#35322D] active:bg-black text-white text-sm font-medium rounded-[6px] flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span>{saving ? 'Saving...' : 'Continue'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </main>
    </div>
  );
};
