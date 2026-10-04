import { describe, it, expect } from 'vitest';
import {
  matchDateOfBirth,
  matchMarksPercentage,
  matchAnnualIncome,
  evaluateApplication
} from '../src/lib/comparison';
import { UploadedDocMetadata } from '../src/lib/types';

describe('Data Comparison & Status Determination Functions', () => {
  describe('matchDateOfBirth', () => {
    it('should match identical YYYY-MM-DD date strings', () => {
      expect(matchDateOfBirth('2003-05-12', '2003-05-12')).toBe(true);
      expect(matchDateOfBirth('  2003-05-12  ', '2003-05-12')).toBe(true);
    });

    it('should reject different dates', () => {
      expect(matchDateOfBirth('2003-05-12', '2003-05-21')).toBe(false);
      expect(matchDateOfBirth('2003-05-12', '2004-05-12')).toBe(false);
      expect(matchDateOfBirth('2003-05-12', '2003-06-12')).toBe(false);
    });

    it('should return false for missing or null dates', () => {
      expect(matchDateOfBirth('2003-05-12', null)).toBe(false);
      expect(matchDateOfBirth(null, '2003-05-12')).toBe(false);
      expect(matchDateOfBirth(undefined, undefined)).toBe(false);
    });
  });

  describe('matchMarksPercentage', () => {
    it('should match exact marks', () => {
      expect(matchMarksPercentage(84.5, 84.5)).toBe(true);
    });

    it('should match marks within 0.5 boundary (including exact 0.5)', () => {
      expect(matchMarksPercentage(84.5, 85.0)).toBe(true); // +0.5
      expect(matchMarksPercentage(84.5, 84.0)).toBe(true); // -0.5
      expect(matchMarksPercentage(84.5, 84.8)).toBe(true); // +0.3
    });

    it('should reject marks differing by more than 0.5', () => {
      expect(matchMarksPercentage(84.5, 85.1)).toBe(false); // +0.6
      expect(matchMarksPercentage(84.5, 83.9)).toBe(false); // -0.6
      expect(matchMarksPercentage(84.5, 90.0)).toBe(false);
    });
  });

  describe('matchAnnualIncome', () => {
    it('should match exact income', () => {
      expect(matchAnnualIncome(240000, 240000)).toBe(true);
      expect(matchAnnualIncome(0, 0)).toBe(true);
    });

    it('should match income within 1 percent boundary (including exact 1 percent)', () => {
      // 1% of 240,000 = 2,400
      expect(matchAnnualIncome(240000, 242400)).toBe(true); // +1% exactly
      expect(matchAnnualIncome(240000, 237600)).toBe(true); // -1% exactly
      expect(matchAnnualIncome(240000, 241000)).toBe(true); // within 1%
    });

    it('should reject income differing by more than 1 percent', () => {
      expect(matchAnnualIncome(240000, 242500)).toBe(false); // > 1%
      expect(matchAnnualIncome(240000, 237000)).toBe(false); // > 1%
      expect(matchAnnualIncome(240000, 300000)).toBe(false);
    });
  });

  describe('evaluateApplication Status Decider', () => {
    const baseFormData = {
      applicantName: 'Pooja Ramesh Sharma',
      dateOfBirth: '2003-05-12',
      course: 'B.Tech Computer Science and Engineering',
      marksPercentage: 84.5,
      annualFamilyIncome: 240000
    };

    const validMatchingDocs: Record<string, UploadedDocMetadata> = {
      id_proof: {
        slot: 'id_proof',
        fileName: 'aadhaar.pdf',
        fileSize: 1500000,
        fileType: 'application/pdf',
        uploadedAt: '2025-05-14T09:00:00Z',
        detectedType: 'id_proof',
        isReadable: true,
        readabilityIssue: null,
        confidence: 0.96,
        extractedFields: {
          full_name: 'Pooja R. Sharma',
          date_of_birth: '2003-05-12',
          id_number_last4: '4521',
          marks_percentage: null,
          issuer_or_board: 'GOVT OF INDIA',
          annual_income: null
        }
      },
      marksheet: {
        slot: 'marksheet',
        fileName: 'marksheet.pdf',
        fileSize: 2000000,
        fileType: 'application/pdf',
        uploadedAt: '2025-05-14T09:00:00Z',
        detectedType: 'marksheet',
        isReadable: true,
        readabilityIssue: null,
        confidence: 0.98,
        extractedFields: {
          full_name: 'Pooja Ramesh Sharma',
          date_of_birth: null,
          id_number_last4: null,
          marks_percentage: 84.8, // within 0.5 of 84.5
          issuer_or_board: 'STATE BOARD',
          annual_income: null
        }
      },
      income_certificate: {
        slot: 'income_certificate',
        fileName: 'income_cert.pdf',
        fileSize: 1200000,
        fileType: 'application/pdf',
        uploadedAt: '2025-05-14T09:00:00Z',
        detectedType: 'income_certificate',
        isReadable: true,
        readabilityIssue: null,
        confidence: 0.95,
        extractedFields: {
          full_name: 'Pooja Ramesh Sharma',
          date_of_birth: null,
          id_number_last4: null,
          marks_percentage: null,
          issuer_or_board: 'TAHSILDAR OFFICE',
          annual_income: 241000 // within 1% of 240000
        }
      }
    };

    it('should assign status Approved when all 3 documents match and confidence >= 0.7', () => {
      const result = evaluateApplication(baseFormData, validMatchingDocs as any);
      expect(result.status).toBe('Approved');
      expect(result.problems).toHaveLength(0);
      expect(result.summary).toContain('All details match your documents');
    });

    it('should assign status Needs correction when Date of Birth does not match ID', () => {
      const docsWithMismatchedDob = {
        ...validMatchingDocs,
        id_proof: {
          ...validMatchingDocs.id_proof,
          extractedFields: {
            ...validMatchingDocs.id_proof.extractedFields!,
            date_of_birth: '2003-05-21' // ID has 21 May instead of 12 May
          }
        }
      };

      const result = evaluateApplication(baseFormData, docsWithMismatchedDob as any);
      expect(result.status).toBe('Needs correction');
      expect(result.problems.some((p) => p.field === 'dateOfBirth')).toBe(true);
      expect(result.summary).toContain('We found 1 problem');
    });

    it('should assign status Needs correction when wrong document type is uploaded in a slot', () => {
      const docsWithWrongSlot = {
        ...validMatchingDocs,
        id_proof: {
          ...validMatchingDocs.id_proof,
          detectedType: 'marksheet' as any // Marksheet in ID slot!
        }
      };

      const result = evaluateApplication(baseFormData, docsWithWrongSlot as any);
      expect(result.status).toBe('Needs correction');
      expect(result.problems.some((p) => p.id.includes('wrong_type'))).toBe(true);
      expect(result.problems.find((p) => p.id.includes('wrong_type'))?.fixNeeded).toContain(
        'You uploaded a marksheet in the ID proof slot'
      );
    });

    it('should assign status Needs correction when a document is unreadable', () => {
      const docsWithUnreadableIncome = {
        ...validMatchingDocs,
        income_certificate: {
          ...validMatchingDocs.income_certificate,
          isReadable: false,
          readabilityIssue: 'stamp_unreadable' as any
        }
      };

      const result = evaluateApplication(baseFormData, docsWithUnreadableIncome as any);
      expect(result.status).toBe('Needs correction');
      expect(result.problems.some((p) => p.id.includes('unreadable'))).toBe(true);
    });

    it('should assign status Needs review when confidence is below 0.7 without a clear mismatch', () => {
      const docsWithLowConfidence = {
        ...validMatchingDocs,
        marksheet: {
          ...validMatchingDocs.marksheet,
          confidence: 0.65 // low confidence
        }
      };

      const result = evaluateApplication(baseFormData, docsWithLowConfidence as any);
      expect(result.status).toBe('Needs review');
      expect(result.hasLowConfidence).toBe(true);
      expect(result.summary).toContain('requires manual verification');
    });

    it('should treat Course as informational only and never cause a mismatch', () => {
      const formDataDiffCourse = {
        ...baseFormData,
        course: 'B.Sc Computer Science'
      };

      const result = evaluateApplication(formDataDiffCourse, validMatchingDocs as any);
      expect(result.status).toBe('Approved');
      const courseComparison = result.comparisons.find((c) => c.field === 'course');
      expect(courseComparison?.result).toBe('match');
    });
  });
});
