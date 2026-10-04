import { describe, it, expect } from 'vitest';
import {
  validateFullName,
  validatePhone,
  formatPhoneNumber,
  validateDateOfBirth
} from '../src/lib/validation';
import {
  normalizeText,
  stringSimilarity,
  matchNames,
  matchDateOfBirth,
  matchMarksPercentage,
  matchAnnualIncome
} from '../src/lib/comparison';

describe('ApplyFlow Core Logic Tests (tests/logic.test.ts)', () => {
  // =========================================================================
  // 1. FULL NAME FORMAT VALIDATION
  // Requirements: Required, letters, spaces, dots, apostrophes, and hyphens only,
  // 2 to 80 characters.
  // =========================================================================
  describe('Name Format Validation (validateFullName)', () => {
    it('accepts valid standard full names', () => {
      expect(validateFullName('Pooja Ramesh Sharma')).toBeNull();
      expect(validateFullName('Tariq Ahmad Khan')).toBeNull();
      expect(validateFullName('Ananya Priya Das')).toBeNull();
    });

    it('accepts valid names with dots, apostrophes, and hyphens', () => {
      expect(validateFullName("Pooja R. Sharma")).toBeNull();
      expect(validateFullName("Shaquille O'Neal")).toBeNull();
      expect(validateFullName('Mary-Jane Watson')).toBeNull();
      expect(validateFullName("Dr. A. P. J. Abdul Kalam")).toBeNull();
      expect(validateFullName("Jean-Luc D'Artagnan")).toBeNull();
    });

    it('accepts names at the boundary lengths (2 and 80 characters)', () => {
      expect(validateFullName('Al')).toBeNull(); // exactly 2 chars
      expect(validateFullName('Jo')).toBeNull(); // exactly 2 chars

      const eightyChars = 'A'.repeat(80);
      expect(validateFullName(eightyChars)).toBeNull(); // exactly 80 chars
    });

    it('rejects empty, whitespace-only, or too short names (< 2 characters)', () => {
      expect(validateFullName('')).toBe('Full name is required.');
      expect(validateFullName('   ')).toBe('Full name is required.');
      expect(validateFullName('A')).toBe('Full name must be between 2 and 80 characters.');
    });

    it('rejects names exceeding 80 characters', () => {
      const eightyOneChars = 'A'.repeat(81);
      expect(validateFullName(eightyOneChars)).toBe('Full name must be between 2 and 80 characters.');
    });

    it('rejects names containing numbers or forbidden symbols', () => {
      expect(validateFullName('Pooja123')).toBe(
        'Full name can only contain letters, spaces, dots, apostrophes, and hyphens.'
      );
      expect(validateFullName('Pooja @ University')).toBe(
        'Full name can only contain letters, spaces, dots, apostrophes, and hyphens.'
      );
      expect(validateFullName('Pooja #Sharma')).toBe(
        'Full name can only contain letters, spaces, dots, apostrophes, and hyphens.'
      );
      expect(validateFullName('Pooja_Sharma')).toBe(
        'Full name can only contain letters, spaces, dots, apostrophes, and hyphens.'
      );
      expect(validateFullName('Pooja/Sharma')).toBe(
        'Full name can only contain letters, spaces, dots, apostrophes, and hyphens.'
      );
    });
  });

  // =========================================================================
  // 2. INDIAN PHONE NUMBER VERIFICATION
  // Requirements: Indian mobile, 10 digits starting with 6 to 9, with +91.
  // =========================================================================
  describe('Indian Phone Number Verification (validatePhone & formatPhoneNumber)', () => {
    it('accepts valid 10-digit Indian numbers starting with 6, 7, 8, or 9 with +91', () => {
      expect(validatePhone('+91 98201 44521')).toBeNull();
      expect(validatePhone('+919820144521')).toBeNull();
      expect(validatePhone('+91 81234 56789')).toBeNull();
      expect(validatePhone('+91 71234 56789')).toBeNull();
      expect(validatePhone('+91 61234 56789')).toBeNull();
      expect(validatePhone('+91-98201-44521')).toBeNull();
    });

    it('rejects numbers without the +91 country prefix', () => {
      expect(validatePhone('9820144521')).toBe('Phone number must start with +91.');
      expect(validatePhone('09820144521')).toBe('Phone number must start with +91.');
      expect(validatePhone('+1 98201 44521')).toBe('Phone number must start with +91.');
      expect(validatePhone('')).toBe('Phone number is required.');
    });

    it('rejects numbers where the first digit after +91 is not 6 to 9', () => {
      expect(validatePhone('+91 51234 56789')).toBe(
        'Indian mobile number must start with 6, 7, 8, or 9.'
      );
      expect(validatePhone('+91 41234 56789')).toBe(
        'Indian mobile number must start with 6, 7, 8, or 9.'
      );
      expect(validatePhone('+91 11234 56789')).toBe(
        'Indian mobile number must start with 6, 7, 8, or 9.'
      );
      expect(validatePhone('+91 01234 56789')).toBe(
        'Indian mobile number must start with 6, 7, 8, or 9.'
      );
    });

    it('rejects numbers that do not have exactly 10 digits after +91', () => {
      expect(validatePhone('+91 98201 4452')).toBe(
        'Phone number must contain 10 digits after +91.'
      ); // 9 digits
      expect(validatePhone('+91 98201 445210')).toBe(
        'Phone number must contain 10 digits after +91.'
      ); // 11 digits
      expect(validatePhone('+91 98201')).toBe(
        'Phone number must contain 10 digits after +91.'
      ); // 5 digits
    });

    it('formats raw mobile numbers into standard +91 XXXXX XXXXX grouping', () => {
      expect(formatPhoneNumber('9820144521')).toBe('+91 98201 44521');
      expect(formatPhoneNumber('+919820144521')).toBe('+91 98201 44521');
      expect(formatPhoneNumber('+91 9820144521')).toBe('+91 98201 44521');
      expect(formatPhoneNumber('98201')).toBe('+91 98201');
      expect(formatPhoneNumber('')).toBe('+91 ');
    });
  });

  // =========================================================================
  // 3. DATE OF BIRTH & AGE CALCULATION (15 TO 40 YEARS)
  // Requirements: Real calendar date, applicant age between 15 and 40.
  // =========================================================================
  describe('Date of Birth & Age Calculation (validateDateOfBirth)', () => {
    // Pin reference date to 2025-05-14 for predictable boundary tests
    const refDate = new Date('2025-05-14T00:00:00Z');

    it('accepts a valid calendar date for an applicant aged between 15 and 40', () => {
      // 22 years old
      const result = validateDateOfBirth('12', 'May', '2003', refDate);
      expect(result.error).toBeNull();
      expect(result.isoDate).toBe('2003-05-12');
    });

    it('accepts exact lower age boundary (turning exactly 15 today)', () => {
      // Born 14 May 2010 -> exactly 15 on 14 May 2025
      const exact15 = validateDateOfBirth('14', 'May', '2010', refDate);
      expect(exact15.error).toBeNull();
      expect(exact15.isoDate).toBe('2010-05-14');
    });

    it('accepts exact upper age boundary (turning exactly 40 today)', () => {
      // Born 14 May 1985 -> exactly 40 on 14 May 2025
      const exact40 = validateDateOfBirth('14', 'May', '1985', refDate);
      expect(exact40.error).toBeNull();
      expect(exact40.isoDate).toBe('1985-05-14');
    });

    it('rejects applicant younger than 15 by even 1 day', () => {
      // Born 15 May 2010 -> 14 years and 364 days on 14 May 2025
      const tooYoung = validateDateOfBirth('15', 'May', '2010', refDate);
      expect(tooYoung.error).toBe('Applicant age must be between 15 and 40 years.');
    });

    it('rejects applicant older than 40 (age 41 or above)', () => {
      // Born 14 May 1984 -> turning 41 on 14 May 2025 (exceeds 40 years)
      const turning41 = validateDateOfBirth('14', 'May', '1984', refDate);
      expect(turning41.error).toBe('Applicant age must be between 15 and 40 years.');

      // Born 1975 -> 50 years old
      const age50 = validateDateOfBirth('12', 'May', '1975', refDate);
      expect(age50.error).toBe('Applicant age must be between 15 and 40 years.');
    });

    it('rejects impossible calendar dates (e.g. 31 February, 31 April)', () => {
      const feb31 = validateDateOfBirth('31', 'February', '2003', refDate);
      expect(feb31.error).toBe('Enter a real calendar date.');

      const feb30 = validateDateOfBirth('30', 'February', '2003', refDate);
      expect(feb30.error).toBe('Enter a real calendar date.');

      const apr31 = validateDateOfBirth('31', 'April', '2003', refDate);
      expect(apr31.error).toBe('Enter a real calendar date.');

      const jun31 = validateDateOfBirth('31', 'June', '2003', refDate);
      expect(jun31.error).toBe('Enter a real calendar date.');
    });

    it('accurately verifies leap year days (29 February)', () => {
      // 2004 was a leap year
      const leapValid = validateDateOfBirth('29', 'February', '2004', refDate);
      expect(leapValid.error).toBeNull();
      expect(leapValid.isoDate).toBe('2004-02-29');

      // 2000 was a leap century year
      const leap2000 = validateDateOfBirth('29', 'February', '2000', refDate);
      expect(leap2000.error).toBeNull();
      expect(leap2000.isoDate).toBe('2000-02-29');

      // 2003 was not a leap year
      const nonLeap = validateDateOfBirth('29', 'February', '2003', refDate);
      expect(nonLeap.error).toBe('Enter a real calendar date.');
    });

    it('rejects missing or non-numeric day, month, or year inputs', () => {
      expect(validateDateOfBirth('', 'May', '2003', refDate).error).toBe(
        'Please enter day, month, and year.'
      );
      expect(validateDateOfBirth('12', '', '2003', refDate).error).toBe(
        'Please enter day, month, and year.'
      );
      expect(validateDateOfBirth('12', 'May', '', refDate).error).toBe(
        'Please enter day, month, and year.'
      );
      expect(validateDateOfBirth('abc', 'May', '2003', refDate).error).toBe(
        'Please enter day, month, and year.'
      );
    });
  });

  // =========================================================================
  // 4. DATA COMPARISON LOGIC
  // Requirements:
  // - Name: Normalize case, punctuation, spaces. Match if similarity >= 0.85
  //   or initials match ("Pooja R. Sharma" matches "Pooja Ramesh Sharma").
  // - Date of birth: Exact match (YYYY-MM-DD).
  // - Marks percentage: Match within 0.5 of form value.
  // - Annual family income: Match within 1% of form value.
  // =========================================================================
  describe('Data Comparison Logic', () => {
    describe('Name Normalization and Similarity Matching (matchNames)', () => {
      it('normalizes case, punctuation, and extra whitespace', () => {
        expect(normalizeText('  Pooja   R.  Sharma  ')).toBe('pooja r sharma');
        expect(normalizeText("O'Connor-Smith, Jane.")).toBe('o connor smith jane');
      });

      it('computes expected Levenshtein similarity', () => {
        expect(stringSimilarity('Pooja Ramesh Sharma', 'Pooja Ramesh Sharma')).toBe(1.0);
        expect(stringSimilarity('Pooja', 'Pooja')).toBe(1.0);
        expect(stringSimilarity('', 'Pooja')).toBe(0.0);

        // 1 typo out of 19 chars -> similarity ~0.947 >= 0.85
        const typoSim = stringSimilarity('Pooja Ramesh Sharma', 'Pooja Ramesh Sharme');
        expect(typoSim).toBeGreaterThanOrEqual(0.85);
      });

      it('matches identical names regardless of casing or extra spaces', () => {
        expect(matchNames('Pooja Ramesh Sharma', 'pooja ramesh sharma')).toBe(true);
        expect(matchNames('Pooja Ramesh Sharma', '  POOJA   RAMESH   SHARMA  ')).toBe(true);
      });

      it('matches when name similarity is at least 0.85', () => {
        expect(matchNames('Pooja Ramesh Sharma', 'Pooja Ramesh Sharme')).toBe(true);
      });

      it('matches when middle name is shortened to an initial (with or without dot)', () => {
        expect(matchNames('Pooja R. Sharma', 'Pooja Ramesh Sharma')).toBe(true);
        expect(matchNames('Pooja Ramesh Sharma', 'Pooja R. Sharma')).toBe(true);
        expect(matchNames('Pooja R Sharma', 'Pooja Ramesh Sharma')).toBe(true);
        expect(matchNames('Tariq A. Khan', 'Tariq Ahmad Khan')).toBe(true);
        expect(matchNames('Tariq Ahmad Khan', 'Tariq A Khan')).toBe(true);
      });

      it('matches when one name has a missing middle name', () => {
        expect(matchNames('Pooja Sharma', 'Pooja Ramesh Sharma')).toBe(true);
        expect(matchNames('Pooja Ramesh Sharma', 'Pooja Sharma')).toBe(true);
        expect(matchNames('Ananya Das', 'Ananya Priya Das')).toBe(true);
      });

      it('rejects when first name is different', () => {
        expect(matchNames('Aarav Ramesh Sharma', 'Pooja Ramesh Sharma')).toBe(false);
        expect(matchNames('Rahul Sharma', 'Pooja Sharma')).toBe(false);
      });

      it('rejects when last name is different', () => {
        expect(matchNames('Pooja Ramesh Sharma', 'Pooja Ramesh Verma')).toBe(false);
        expect(matchNames('Pooja Sharma', 'Pooja Patel')).toBe(false);
      });
    });

    describe('Date of Birth Comparison (matchDateOfBirth)', () => {
      it('matches identical YYYY-MM-DD date strings', () => {
        expect(matchDateOfBirth('2003-05-12', '2003-05-12')).toBe(true);
        expect(matchDateOfBirth('  2003-05-12 ', '2003-05-12')).toBe(true);
      });

      it('rejects dates with differing days, months, or years', () => {
        expect(matchDateOfBirth('2003-05-12', '2003-05-21')).toBe(false); // Day mismatch
        expect(matchDateOfBirth('2003-05-12', '2003-06-12')).toBe(false); // Month mismatch
        expect(matchDateOfBirth('2003-05-12', '2004-05-12')).toBe(false); // Year mismatch
      });

      it('rejects when either date is null, undefined, or empty', () => {
        expect(matchDateOfBirth('2003-05-12', null)).toBe(false);
        expect(matchDateOfBirth(null, '2003-05-12')).toBe(false);
        expect(matchDateOfBirth('', '2003-05-12')).toBe(false);
        expect(matchDateOfBirth(undefined, undefined)).toBe(false);
      });
    });

    describe('Marks Percentage Threshold (matchMarksPercentage)', () => {
      it('matches when marks are exactly identical', () => {
        expect(matchMarksPercentage(84.5, 84.5)).toBe(true);
        expect(matchMarksPercentage(92.0, 92.0)).toBe(true);
      });

      it('matches when difference is within 0.5 (including exact 0.5 boundary)', () => {
        expect(matchMarksPercentage(84.5, 85.0)).toBe(true); // +0.5 exactly
        expect(matchMarksPercentage(84.5, 84.0)).toBe(true); // -0.5 exactly
        expect(matchMarksPercentage(84.5, 84.8)).toBe(true); // +0.3
        expect(matchMarksPercentage(84.5, 84.2)).toBe(true); // -0.3
      });

      it('rejects when difference exceeds 0.5', () => {
        expect(matchMarksPercentage(84.5, 85.1)).toBe(false); // +0.6 diff
        expect(matchMarksPercentage(84.5, 83.9)).toBe(false); // -0.6 diff
        expect(matchMarksPercentage(84.5, 90.0)).toBe(false);
      });
    });

    describe('Annual Family Income Threshold (matchAnnualIncome)', () => {
      it('matches when income is identical', () => {
        expect(matchAnnualIncome(240000, 240000)).toBe(true);
        expect(matchAnnualIncome(0, 0)).toBe(true);
      });

      it('matches when difference is within 1 percent (including exact 1 percent boundary)', () => {
        // 1% of 240,000 = 2,400. Valid range: [237,600, 242,400]
        expect(matchAnnualIncome(240000, 242400)).toBe(true); // +1% exactly
        expect(matchAnnualIncome(240000, 237600)).toBe(true); // -1% exactly
        expect(matchAnnualIncome(240000, 241000)).toBe(true); // +0.41%
        expect(matchAnnualIncome(240000, 239000)).toBe(true); // -0.41%

        // 1% of 500,000 = 5,000
        expect(matchAnnualIncome(500000, 505000)).toBe(true); // +1% exactly
        expect(matchAnnualIncome(500000, 495000)).toBe(true); // -1% exactly
      });

      it('rejects when difference exceeds 1 percent', () => {
        // Range for 240,000 is 237,600 to 242,400
        expect(matchAnnualIncome(240000, 242450)).toBe(false); // > 1%
        expect(matchAnnualIncome(240000, 243000)).toBe(false); // 1.25% diff
        expect(matchAnnualIncome(240000, 237000)).toBe(false); // 1.25% diff
        expect(matchAnnualIncome(240000, 300000)).toBe(false);
      });
    });
  });
});
