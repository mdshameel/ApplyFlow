import { MONTH_NAMES } from './formatters';

export interface ValidationErrors {
  applicantName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  course?: string;
  marksPercentage?: string;
  annualFamilyIncome?: string;
}

/**
 * Full name: required, letters, spaces, dots, apostrophes and hyphens only, 2 to 80 characters.
 */
export function validateFullName(name: string): string | null {
  if (!name || !name.trim()) {
    return 'Full name is required.';
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 80) {
    return 'Full name must be between 2 and 80 characters.';
  }
  // Letters (including unicode letters if any, plus standard english), spaces, dots, apostrophes, hyphens
  const nameRegex = /^[A-Za-z\s.'-]+$/;
  if (!nameRegex.test(trimmed)) {
    return 'Full name can only contain letters, spaces, dots, apostrophes, and hyphens.';
  }
  return null;
}

/**
 * Email: valid format
 */
export function validateEmail(email: string): string | null {
  if (!email || !email.trim()) {
    return 'Email address is required.';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return 'Enter a valid email address.';
  }
  return null;
}

/**
 * Phone: Indian mobile, 10 digits starting with 6 to 9, with +91.
 * e.g. +91 98201 44521, +919820144521, +91-9820144521
 */
export function validatePhone(phone: string): string | null {
  if (!phone || !phone.trim()) {
    return 'Phone number is required.';
  }
  const clean = phone.trim();
  if (!clean.startsWith('+91')) {
    return 'Phone number must start with +91.';
  }
  // Strip non-digits after +91
  const digitsAfterPrefix = clean.slice(3).replace(/\D/g, '');
  if (digitsAfterPrefix.length !== 10) {
    return 'Phone number must contain 10 digits after +91.';
  }
  if (!/^[6-9]/.test(digitsAfterPrefix)) {
    return 'Indian mobile number must start with 6, 7, 8, or 9.';
  }
  return null;
}

/**
 * Format raw phone input cleanly to "+91 XXXXX XXXXX" if possible
 */
export function formatPhoneNumber(phone: string): string {
  const clean = phone.trim();
  if (!clean) return '+91 ';
  const digits = clean.startsWith('+91')
    ? clean.slice(3).replace(/\D/g, '')
    : clean.replace(/\D/g, '');

  if (digits.length === 0) return '+91 ';
  if (digits.length <= 5) return `+91 ${digits}`;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5, 10)}`;
}

/**
 * Date of birth: a real calendar date, applicant age between 15 and 40.
 */
export function validateDateOfBirth(
  day: string | number,
  monthName: string,
  year: string | number,
  currentDate: Date = new Date()
): { error: string | null; isoDate: string } {
  const d = parseInt(String(day), 10);
  const y = parseInt(String(year), 10);
  let mIndex = MONTH_NAMES.indexOf(monthName as any);
  if (mIndex === -1 && monthName) {
    const numM = parseInt(String(monthName), 10);
    if (!isNaN(numM) && numM >= 1 && numM <= 12) {
      mIndex = numM - 1;
    }
  }

  if (!day || isNaN(d) || !monthName || mIndex === -1 || !year || isNaN(y)) {
    return { error: 'Please enter day, month, and year.', isoDate: '' };
  }

  if (y < 1900 || y > currentDate.getFullYear()) {
    return { error: 'Enter a valid four-digit birth year.', isoDate: '' };
  }

  // Check real calendar date (handles leap years, days in month)
  const testDate = new Date(y, mIndex, d);
  if (
    testDate.getFullYear() !== y ||
    testDate.getMonth() !== mIndex ||
    testDate.getDate() !== d
  ) {
    return { error: 'Enter a real calendar date.', isoDate: '' };
  }

  // Calculate age
  let age = currentDate.getFullYear() - y;
  const currentMonth = currentDate.getMonth();
  const currentDay = currentDate.getDate();
  if (currentMonth < mIndex || (currentMonth === mIndex && currentDay < d)) {
    age--;
  }

  if (age < 15 || age > 40) {
    return { error: 'Applicant age must be between 15 and 40 years.', isoDate: '' };
  }

  const iso = `${y}-${String(mIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return { error: null, isoDate: iso };
}

/**
 * Course: required, 2 to 80 characters.
 */
export function validateCourse(course: string): string | null {
  if (!course || !course.trim()) {
    return 'Course name is required.';
  }
  const trimmed = course.trim();
  if (trimmed.length < 2 || trimmed.length > 80) {
    return 'Course name must be between 2 and 80 characters.';
  }
  return null;
}

/**
 * Marks percentage: a number from 0 to 100, at most one decimal place.
 */
export function validateMarksPercentage(value: number | string): string | null {
  if (value === '' || value === null || value === undefined) {
    return 'Marks percentage is required.';
  }
  const str = String(value).trim();
  const num = Number(str);
  if (isNaN(num)) {
    return 'Marks percentage must be a valid number.';
  }
  if (num < 0 || num > 100) {
    return 'Marks percentage must be between 0 and 100.';
  }
  // At most one decimal place
  const parts = str.split('.');
  if (parts.length > 1 && parts[1].length > 1) {
    return 'Marks percentage can have at most one decimal place.';
  }
  return null;
}

/**
 * Annual family income: a whole number of rupees, 0 or more.
 */
export function validateAnnualFamilyIncome(value: number | string): string | null {
  if (value === '' || value === null || value === undefined) {
    return 'Annual family income is required.';
  }
  const str = String(value).replace(/,/g, '').trim();
  const num = Number(str);
  if (isNaN(num)) {
    return 'Annual family income must be a valid number.';
  }
  if (num < 0) {
    return 'Annual family income must be 0 or more.';
  }
  if (!Number.isInteger(num)) {
    return 'Annual family income must be a whole number of rupees.';
  }
  return null;
}

/**
 * Validate all form fields
 */
export function validateDetailsForm(formData: {
  applicantName: string;
  email: string;
  phone: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  course: string;
  marksPercentage: string | number;
  annualFamilyIncome: string | number;
}): { isValid: boolean; errors: ValidationErrors; isoDate: string } {
  const errors: ValidationErrors = {};

  const nameErr = validateFullName(formData.applicantName);
  if (nameErr) errors.applicantName = nameErr;

  const emailErr = validateEmail(formData.email);
  if (emailErr) errors.email = emailErr;

  const phoneErr = validatePhone(formData.phone);
  if (phoneErr) errors.phone = phoneErr;

  const dobResult = validateDateOfBirth(formData.dobDay, formData.dobMonth, formData.dobYear);
  if (dobResult.error) errors.dateOfBirth = dobResult.error;

  const courseErr = validateCourse(formData.course);
  if (courseErr) errors.course = courseErr;

  const marksErr = validateMarksPercentage(formData.marksPercentage);
  if (marksErr) errors.marksPercentage = marksErr;

  const incomeErr = validateAnnualFamilyIncome(formData.annualFamilyIncome);
  if (incomeErr) errors.annualFamilyIncome = incomeErr;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    isoDate: dobResult.isoDate
  };
}

/**
 * Validate document file type and size.
 * Max size: 5 MB (5 * 1024 * 1024 bytes)
 * Accepted types: PDF, JPG, PNG
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function validateDocumentFile(file: { name: string; size: number; type: string }): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return 'This file is larger than 5 MB. Upload a smaller file.';
  }
  const acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  const ext = file.name.split('.').pop()?.toLowerCase();
  const validExts = ['pdf', 'jpg', 'jpeg', 'png'];

  if (!acceptedTypes.includes(file.type) && (!ext || !validExts.includes(ext))) {
    return 'Only PDF, JPG, or PNG files are accepted. Check your file format.';
  }
  return null;
}

/**
 * Server-side magic bytes validation for PDF, JPEG, PNG
 */
export function detectRealMimeType(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;

  // PDF: %PDF (0x25 0x50 0x44 0x46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  return null;
}
