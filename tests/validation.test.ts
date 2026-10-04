import { describe, it, expect } from 'vitest';
import {
  validateFullName,
  validateEmail,
  validatePhone,
  formatPhoneNumber,
  validateDateOfBirth,
  validateCourse,
  validateMarksPercentage,
  validateAnnualFamilyIncome,
  validateDocumentFile,
  detectRealMimeType,
  validateDetailsForm,
  MAX_FILE_SIZE
} from '../src/lib/validation';

describe('Validation Logic', () => {
  describe('validateFullName', () => {
    it('should accept valid standard names', () => {
      expect(validateFullName('Pooja Ramesh Sharma')).toBeNull();
      expect(validateFullName('John Doe')).toBeNull();
      expect(validateFullName('Ananya Priya Das')).toBeNull();
    });

    it('should accept names with dots, apostrophes, and hyphens', () => {
      expect(validateFullName("Shaquille O'Neal")).toBeNull();
      expect(validateFullName('Mary-Jane Watson')).toBeNull();
      expect(validateFullName('Dr. A. P. J. Abdul Kalam')).toBeNull();
    });

    it('should reject names with less than 2 characters or empty', () => {
      expect(validateFullName('')).toBe('Full name is required.');
      expect(validateFullName('   ')).toBe('Full name is required.');
      expect(validateFullName('A')).toBe('Full name must be between 2 and 80 characters.');
    });

    it('should reject names longer than 80 characters', () => {
      const longName = 'A'.repeat(81);
      expect(validateFullName(longName)).toBe('Full name must be between 2 and 80 characters.');
    });

    it('should reject names with numbers or illegal special characters', () => {
      expect(validateFullName('Pooja123')).toBe(
        'Full name can only contain letters, spaces, dots, apostrophes, and hyphens.'
      );
      expect(validateFullName('Pooja @ Sharma')).toBe(
        'Full name can only contain letters, spaces, dots, apostrophes, and hyphens.'
      );
      expect(validateFullName('Pooja #')).toBe(
        'Full name can only contain letters, spaces, dots, apostrophes, and hyphens.'
      );
    });
  });

  describe('validateEmail', () => {
    it('should accept valid email formats', () => {
      expect(validateEmail('pooja.sharma@example.com')).toBeNull();
      expect(validateEmail('user+tag@domain.co.in')).toBeNull();
      expect(validateEmail('student123@university.ac.in')).toBeNull();
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('')).toBe('Email address is required.');
      expect(validateEmail('pooja.sharma')).toBe('Enter a valid email address.');
      expect(validateEmail('pooja@')).toBe('Enter a valid email address.');
      expect(validateEmail('@domain.com')).toBe('Enter a valid email address.');
      expect(validateEmail('pooja@domain')).toBe('Enter a valid email address.');
    });
  });

  describe('validatePhone', () => {
    it('should accept Indian mobile numbers starting with 6, 7, 8, 9 with +91', () => {
      expect(validatePhone('+91 98201 44521')).toBeNull();
      expect(validatePhone('+919820144521')).toBeNull();
      expect(validatePhone('+91 81234 56789')).toBeNull();
      expect(validatePhone('+91 71234 56789')).toBeNull();
      expect(validatePhone('+91 61234 56789')).toBeNull();
    });

    it('should reject numbers without +91 prefix', () => {
      expect(validatePhone('9820144521')).toBe('Phone number must start with +91.');
      expect(validatePhone('09820144521')).toBe('Phone number must start with +91.');
    });

    it('should reject numbers that start with 0-5 after +91', () => {
      expect(validatePhone('+91 51234 56789')).toBe(
        'Indian mobile number must start with 6, 7, 8, or 9.'
      );
      expect(validatePhone('+91 11234 56789')).toBe(
        'Indian mobile number must start with 6, 7, 8, or 9.'
      );
    });

    it('should reject numbers that do not have exactly 10 digits after +91', () => {
      expect(validatePhone('+91 98201 4452')).toBe(
        'Phone number must contain 10 digits after +91.'
      );
      expect(validatePhone('+91 98201 445210')).toBe(
        'Phone number must contain 10 digits after +91.'
      );
    });

    it('should format numbers with spacing correctly', () => {
      expect(formatPhoneNumber('+919820144521')).toBe('+91 98201 44521');
      expect(formatPhoneNumber('9820144521')).toBe('+91 98201 44521');
    });
  });

  describe('validateDateOfBirth', () => {
    const fixedCurrentDate = new Date('2025-05-14');

    it('should accept valid dates where applicant is between 15 and 40', () => {
      // 22 years old
      const res = validateDateOfBirth('12', 'May', '2003', fixedCurrentDate);
      expect(res.error).toBeNull();
      expect(res.isoDate).toBe('2003-05-12');

      // 15 years old
      const res15 = validateDateOfBirth('14', 'May', '2010', fixedCurrentDate);
      expect(res15.error).toBeNull();
      expect(res15.isoDate).toBe('2010-05-14');

      // 40 years old
      const res40 = validateDateOfBirth('14', 'May', '1985', fixedCurrentDate);
      expect(res40.error).toBeNull();
      expect(res40.isoDate).toBe('1985-05-14');
    });

    it('should reject invalid calendar dates', () => {
      const res31Feb = validateDateOfBirth('31', 'February', '2003', fixedCurrentDate);
      expect(res31Feb.error).toBe('Enter a real calendar date.');

      const res31Apr = validateDateOfBirth('31', 'April', '2003', fixedCurrentDate);
      expect(res31Apr.error).toBe('Enter a real calendar date.');
    });

    it('should correctly handle leap years', () => {
      // 2004 was a leap year
      const leapValid = validateDateOfBirth('29', 'February', '2004', fixedCurrentDate);
      expect(leapValid.error).toBeNull();
      expect(leapValid.isoDate).toBe('2004-02-29');

      // 2003 was not a leap year
      const nonLeap = validateDateOfBirth('29', 'February', '2003', fixedCurrentDate);
      expect(nonLeap.error).toBe('Enter a real calendar date.');
    });

    it('should reject applicants under 15 or over 40', () => {
      // 14 years old
      const tooYoung = validateDateOfBirth('15', 'May', '2010', fixedCurrentDate);
      expect(tooYoung.error).toBe('Applicant age must be between 15 and 40 years.');

      // 41 years old
      const tooOld = validateDateOfBirth('13', 'May', '1984', fixedCurrentDate);
      expect(tooOld.error).toBe('Applicant age must be between 15 and 40 years.');
    });
  });

  describe('validateCourse', () => {
    it('should accept valid courses', () => {
      expect(validateCourse('B.Tech Computer Science and Engineering')).toBeNull();
      expect(validateCourse('M.Sc Physics')).toBeNull();
      expect(validateCourse('B.A. Economics (Hons)')).toBeNull();
    });

    it('should reject empty or invalid course lengths', () => {
      expect(validateCourse('')).toBe('Course name is required.');
      expect(validateCourse('X')).toBe('Course name must be between 2 and 80 characters.');
      expect(validateCourse('A'.repeat(81))).toBe('Course name must be between 2 and 80 characters.');
    });
  });

  describe('validateMarksPercentage', () => {
    it('should accept valid percentages from 0 to 100 with at most 1 decimal', () => {
      expect(validateMarksPercentage(84.5)).toBeNull();
      expect(validateMarksPercentage('84.5')).toBeNull();
      expect(validateMarksPercentage(100)).toBeNull();
      expect(validateMarksPercentage(0)).toBeNull();
      expect(validateMarksPercentage('92')).toBeNull();
    });

    it('should reject percentages with more than 1 decimal place', () => {
      expect(validateMarksPercentage('84.55')).toBe(
        'Marks percentage can have at most one decimal place.'
      );
      expect(validateMarksPercentage('99.99')).toBe(
        'Marks percentage can have at most one decimal place.'
      );
    });

    it('should reject percentages outside 0-100 or non-numeric', () => {
      expect(validateMarksPercentage(101)).toBe('Marks percentage must be between 0 and 100.');
      expect(validateMarksPercentage(-1)).toBe('Marks percentage must be between 0 and 100.');
      expect(validateMarksPercentage('abc')).toBe('Marks percentage must be a valid number.');
      expect(validateMarksPercentage('')).toBe('Marks percentage is required.');
    });
  });

  describe('validateAnnualFamilyIncome', () => {
    it('should accept whole number amounts >= 0', () => {
      expect(validateAnnualFamilyIncome(240000)).toBeNull();
      expect(validateAnnualFamilyIncome('240000')).toBeNull();
      expect(validateAnnualFamilyIncome('2,40,000')).toBeNull();
      expect(validateAnnualFamilyIncome(0)).toBeNull();
    });

    it('should reject non-integers, negative numbers, or non-numeric input', () => {
      expect(validateAnnualFamilyIncome('240000.50')).toBe(
        'Annual family income must be a whole number of rupees.'
      );
      expect(validateAnnualFamilyIncome(-100)).toBe('Annual family income must be 0 or more.');
      expect(validateAnnualFamilyIncome('invalid')).toBe(
        'Annual family income must be a valid number.'
      );
      expect(validateAnnualFamilyIncome('')).toBe('Annual family income is required.');
    });
  });

  describe('validateDocumentFile and detectRealMimeType', () => {
    it('should accept valid file formats under 5 MB', () => {
      expect(
        validateDocumentFile({ name: 'aadhaar.pdf', size: 1024 * 1024, type: 'application/pdf' })
      ).toBeNull();
      expect(
        validateDocumentFile({ name: 'photo.jpg', size: 2 * 1024 * 1024, type: 'image/jpeg' })
      ).toBeNull();
      expect(
        validateDocumentFile({ name: 'scan.png', size: 3 * 1024 * 1024, type: 'image/png' })
      ).toBeNull();
    });

    it('should reject files exceeding 5 MB limit', () => {
      expect(
        validateDocumentFile({
          name: 'large_scan.pdf',
          size: MAX_FILE_SIZE + 1024,
          type: 'application/pdf'
        })
      ).toBe('This file is larger than 5 MB. Upload a smaller file.');
    });

    it('should reject unsupported formats', () => {
      expect(
        validateDocumentFile({ name: 'doc.docx', size: 1024, type: 'application/vnd.openxmlformats' })
      ).toBe('Only PDF, JPG, or PNG files are accepted. Check your file format.');
      expect(
        validateDocumentFile({ name: 'script.exe', size: 1024, type: 'application/x-msdownload' })
      ).toBe('Only PDF, JPG, or PNG files are accepted. Check your file format.');
    });

    it('should detect real MIME type from binary magic bytes', () => {
      const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
      expect(detectRealMimeType(pdf)).toBe('application/pdf');

      const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(detectRealMimeType(png)).toBe('image/png');

      const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe1]);
      expect(detectRealMimeType(jpeg)).toBe('image/jpeg');

      const unknown = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      expect(detectRealMimeType(unknown)).toBeNull();
    });
  });

  describe('validateDetailsForm composite helper', () => {
    it('should return isValid true when all form fields are valid', () => {
      const result = validateDetailsForm({
        applicantName: 'Pooja Ramesh Sharma',
        email: 'pooja.sharma@example.com',
        phone: '+91 98201 44521',
        dobDay: '12',
        dobMonth: 'May',
        dobYear: '2003',
        course: 'B.Tech Computer Science and Engineering',
        marksPercentage: '84.5',
        annualFamilyIncome: '240000'
      });
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
      expect(result.isoDate).toBe('2003-05-12');
    });

    it('should return errors for invalid fields', () => {
      const result = validateDetailsForm({
        applicantName: '',
        email: 'invalid-email',
        phone: '12345',
        dobDay: '31',
        dobMonth: 'February',
        dobYear: '2003',
        course: '',
        marksPercentage: '105',
        annualFamilyIncome: '-500'
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.applicantName).toBeDefined();
      expect(result.errors.email).toBeDefined();
      expect(result.errors.phone).toBeDefined();
      expect(result.errors.dateOfBirth).toBeDefined();
      expect(result.errors.course).toBeDefined();
      expect(result.errors.marksPercentage).toBeDefined();
      expect(result.errors.annualFamilyIncome).toBeDefined();
    });
  });
});
