import { describe, it, expect } from 'vitest';
import { normalizeText, stringSimilarity, matchNames } from '../src/lib/comparison';

describe('Name Normalization and Matching', () => {
  describe('normalizeText', () => {
    it('should convert text to lowercase and remove punctuation', () => {
      expect(normalizeText('Pooja R. Sharma')).toBe('pooja r sharma');
      expect(normalizeText("O'Connor, Mary-Jane")).toBe('o connor mary jane');
    });

    it('should collapse multiple spaces and trim whitespace', () => {
      expect(normalizeText('   Pooja     Ramesh    Sharma   ')).toBe('pooja ramesh sharma');
    });

    it('should handle null, undefined, and empty string', () => {
      expect(normalizeText('')).toBe('');
      expect(normalizeText(null)).toBe('');
      expect(normalizeText(undefined)).toBe('');
    });
  });

  describe('stringSimilarity', () => {
    it('should return 1.0 for identical strings', () => {
      expect(stringSimilarity('Pooja Ramesh Sharma', 'Pooja Ramesh Sharma')).toBe(1.0);
      expect(stringSimilarity('ananya das', 'Ananya   Das')).toBe(1.0);
    });

    it('should return 0.0 when one or both strings are empty', () => {
      expect(stringSimilarity('', 'Pooja')).toBe(0.0);
      expect(stringSimilarity('Pooja', '')).toBe(0.0);
    });

    it('should calculate accurate Levenshtein distance similarity', () => {
      // Small typo: 1 character difference in a 19 character string
      const sim = stringSimilarity('Pooja Ramesh Sharma', 'Poojz Ramesh Sharma');
      expect(sim).toBeGreaterThanOrEqual(0.9);
      expect(sim).toBeLessThan(1.0);
    });
  });

  describe('matchNames edge cases', () => {
    it('should match exact identical names regardless of casing or extra spaces', () => {
      expect(matchNames('Pooja Ramesh Sharma', 'pooja ramesh sharma')).toBe(true);
      expect(matchNames('Pooja Ramesh Sharma', '  POOJA   RAMESH   SHARMA  ')).toBe(true);
    });

    it('should match when similarity is at least 0.85', () => {
      // 1 char transposition / typo
      expect(matchNames('Pooja Ramesh Sharma', 'Pooja Ramesh Sharme')).toBe(true);
    });

    it('should match when middle names are shortened to initials with or without dot', () => {
      expect(matchNames('Pooja R. Sharma', 'Pooja Ramesh Sharma')).toBe(true);
      expect(matchNames('Pooja Ramesh Sharma', 'Pooja R. Sharma')).toBe(true);
      expect(matchNames('Pooja R Sharma', 'Pooja Ramesh Sharma')).toBe(true);
      expect(matchNames('Tariq A. Khan', 'Tariq Ahmad Khan')).toBe(true);
      expect(matchNames('Tariq Ahmad Khan', 'Tariq A Khan')).toBe(true);
    });

    it('should match when one name has a missing middle name', () => {
      // Form: "Pooja Sharma", Document: "Pooja Ramesh Sharma"
      expect(matchNames('Pooja Sharma', 'Pooja Ramesh Sharma')).toBe(true);
      // Reverse: Form: "Pooja Ramesh Sharma", Document: "Pooja Sharma"
      expect(matchNames('Pooja Ramesh Sharma', 'Pooja Sharma')).toBe(true);
      expect(matchNames('Ananya Das', 'Ananya Priya Das')).toBe(true);
    });

    it('should not match when first name is different', () => {
      expect(matchNames('Aarav Sharma', 'Pooja Sharma')).toBe(false);
      expect(matchNames('Rahul Ramesh Sharma', 'Pooja Ramesh Sharma')).toBe(false);
    });

    it('should not match when last name is different', () => {
      expect(matchNames('Pooja Ramesh Sharma', 'Pooja Ramesh Verma')).toBe(false);
      expect(matchNames('Pooja Sharma', 'Pooja Patel')).toBe(false);
    });

    it('should return false for completely different names', () => {
      expect(matchNames('Tariq Ahmad Khan', 'Pooja Ramesh Sharma')).toBe(false);
      expect(matchNames('', 'Pooja Sharma')).toBe(false);
    });
  });
});
