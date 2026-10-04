import {
  ApplicationProblem,
  ApplicationRecord,
  ApplicationStatus,
  DocumentSlot,
  FieldComparison,
  UploadedDocMetadata
} from './types';
import { formatDateDisplay, formatIndianCurrency, formatMarks } from './formatters';

/**
 * Normalize string: lowercase, strip punctuation except spaces, collapse multiple spaces
 */
export function normalizeText(text?: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate Levenshtein-based similarity between two strings (0.0 to 1.0)
 */
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  if (s1 === s2) return 1.0;
  if (!s1.length || !s2.length) return 0.0;

  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1.0 - distance / maxLen;
}

/**
 * Check if two names match either by similarity >= 0.85 OR
 * initials matching (e.g. "Pooja R. Sharma" matches "Pooja Ramesh Sharma", or missing middle name)
 */
export function matchNames(name1: string, name2: string): boolean {
  const n1 = normalizeText(name1);
  const n2 = normalizeText(name2);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;

  // 1. Direct similarity check
  const sim = stringSimilarity(n1, n2);
  if (sim >= 0.85) return true;

  // 2. Tokenized initials comparison
  const tokens1 = n1.split(' ').filter(Boolean);
  const tokens2 = n2.split(' ').filter(Boolean);

  // If first and last name match exactly:
  if (tokens1.length >= 2 && tokens2.length >= 2) {
    const first1 = tokens1[0];
    const last1 = tokens1[tokens1.length - 1];
    const first2 = tokens2[0];
    const last2 = tokens2[tokens2.length - 1];

    if (first1 === first2 && last1 === last2) {
      // Middle names logic
      const middle1 = tokens1.slice(1, -1);
      const middle2 = tokens2.slice(1, -1);

      // Case: One has no middle name (e.g. "Pooja Sharma" vs "Pooja Ramesh Sharma")
      if (middle1.length === 0 || middle2.length === 0) {
        return true;
      }

      // Case: Middle name is an initial (e.g. "R" vs "Ramesh")
      const initials1 = middle1.map(m => m[0]).join('');
      const initials2 = middle2.map(m => m[0]).join('');

      if (initials1 === initials2) return true;
      if (middle1[0] && middle2[0] && (middle1[0][0] === middle2[0][0])) return true;
    }
  }

  return false;
}

/**
 * Clean and compare date strings (YYYY-MM-DD)
 */
export function matchDateOfBirth(dob1?: string | null, dob2?: string | null): boolean {
  if (!dob1 || !dob2) return false;
  const clean1 = dob1.trim();
  const clean2 = dob2.trim();
  return clean1 === clean2;
}

/**
 * Compare marks percentage: within 0.5 of the form value
 */
export function matchMarksPercentage(formMarks: number, docMarks: number): boolean {
  return Math.abs(formMarks - docMarks) <= 0.5;
}

/**
 * Compare annual income: within 1 percent of the form value
 */
export function matchAnnualIncome(formIncome: number, docIncome: number): boolean {
  if (formIncome === 0 && docIncome === 0) return true;
  const base = formIncome === 0 ? 1 : formIncome;
  const diffPercent = Math.abs(formIncome - docIncome) / base;
  return diffPercent <= 0.01 + 1e-9;
}

export interface EvaluationResult {
  status: ApplicationStatus;
  comparisons: FieldComparison[];
  problems: ApplicationProblem[];
  summary: string;
  hasLowConfidence: boolean;
  technicalReason?: string;
}

/**
 * Plain code evaluation comparing form data against extracted document data
 */
export function evaluateApplication(
  formData: {
    applicantName: string;
    dateOfBirth: string; // YYYY-MM-DD
    course: string;
    marksPercentage: number;
    annualFamilyIncome: number;
  },
  documents: {
    id_proof?: UploadedDocMetadata;
    marksheet?: UploadedDocMetadata;
    income_certificate?: UploadedDocMetadata;
  }
): EvaluationResult {
  const problems: ApplicationProblem[] = [];
  const comparisons: FieldComparison[] = [];
  let hasLowConfidence = false;
  let geminiFailed = false;
  let failureReason = '';

  const slots: { slot: DocumentSlot; expectedLabel: string }[] = [
    { slot: 'id_proof', expectedLabel: 'ID proof' },
    { slot: 'marksheet', expectedLabel: 'Marksheet' },
    { slot: 'income_certificate', expectedLabel: 'Income certificate' }
  ];

  // 1. Check all slots exist and are readable & right document type
  for (const item of slots) {
    const doc = documents[item.slot];
    if (!doc) {
      problems.push({
        id: `missing_${item.slot}`,
        title: `${item.expectedLabel} is missing`,
        field: item.slot,
        entered: 'Not provided',
        found: 'No file',
        fixNeeded: `Upload your ${item.expectedLabel.toLowerCase()}.`,
        slot: item.slot
      });
      continue;
    }

    if (doc.confidence !== undefined && doc.confidence < 0.7) {
      hasLowConfidence = true;
    }

    // Check if doc reading failed completely
    if (doc.detectedType === 'unknown' && !doc.isReadable && !doc.readabilityIssue) {
      geminiFailed = true;
      failureReason = `Could not read ${item.expectedLabel} by the system.`;
    }

    // Check readability
    if (doc.isReadable === false) {
      const issueWord = doc.readabilityIssue ? doc.readabilityIssue.replace('_', ' ') : 'unreadable';
      problems.push({
        id: `unreadable_${item.slot}`,
        title: `${item.expectedLabel} is unreadable`,
        field: item.slot,
        entered: doc.fileName,
        found: `Document is ${issueWord}`,
        fixNeeded: `Upload a clearer photo or scan of your ${item.expectedLabel.toLowerCase()}.`,
        slot: item.slot
      });
    }

    // Check document type matches slot
    if (doc.detectedType && doc.detectedType !== 'unknown' && doc.detectedType !== item.slot) {
      const typeNames: Record<string, string> = {
        id_proof: 'ID proof',
        marksheet: 'marksheet',
        income_certificate: 'income certificate'
      };
      const foundName = typeNames[doc.detectedType] || doc.detectedType;
      problems.push({
        id: `wrong_type_${item.slot}`,
        title: `Wrong document uploaded for ${item.expectedLabel}`,
        field: item.slot,
        entered: item.expectedLabel,
        found: foundName,
        fixNeeded: `You uploaded a ${foundName} in the ${item.expectedLabel} slot. Upload your ${item.expectedLabel.toLowerCase()}.`,
        slot: item.slot
      });
    }
  }

  // 2. Name check on all three documents
  let nameMatchesAll = true;
  const foundNames: string[] = [];

  for (const item of slots) {
    const doc = documents[item.slot];
    const docName = doc?.extractedFields?.full_name;
    if (docName) {
      foundNames.push(docName);
      const isMatch = matchNames(formData.applicantName, docName);
      if (!isMatch) {
        nameMatchesAll = false;
        problems.push({
          id: `name_mismatch_${item.slot}`,
          title: `Name does not match on ${item.expectedLabel}`,
          field: 'applicantName',
          entered: formData.applicantName,
          found: docName,
          fixNeeded: `Your name on the form does not match the name found on your ${item.expectedLabel.toLowerCase()} (${docName}). Update your name or upload a matching document.`,
          slot: item.slot
        });
      }
    }
  }

  comparisons.push({
    field: 'applicantName',
    label: 'Full name',
    entered: formData.applicantName,
    found: foundNames.length > 0 ? foundNames[0] : 'Not found',
    result: nameMatchesAll && foundNames.length > 0 ? 'match' : 'mismatch'
  });

  // 3. Date of birth check on ID proof
  const idDoc = documents.id_proof;
  const docDob = idDoc?.extractedFields?.date_of_birth;
  let dobMatch = false;

  if (docDob) {
    dobMatch = matchDateOfBirth(formData.dateOfBirth, docDob);
    if (!dobMatch) {
      problems.push({
        id: 'dob_mismatch',
        title: 'Date of birth does not match',
        field: 'dateOfBirth',
        entered: formatDateDisplay(formData.dateOfBirth),
        found: formatDateDisplay(docDob),
        fixNeeded: `You entered ${formatDateDisplay(formData.dateOfBirth)}. Your ID shows ${formatDateDisplay(docDob)}. Confirm your birth date or upload a clearer ID.`,
        slot: 'id_proof'
      });
    }
  } else if (idDoc?.isReadable !== false && idDoc?.detectedType === 'id_proof') {
    // If ID proof is present and readable but date of birth couldn't be extracted
    problems.push({
      id: 'dob_not_found',
      title: 'Date of birth not found on ID proof',
      field: 'dateOfBirth',
      entered: formatDateDisplay(formData.dateOfBirth),
      found: 'Not visible',
      fixNeeded: 'Upload an ID proof clearly displaying your date of birth.',
      slot: 'id_proof'
    });
  }

  comparisons.push({
    field: 'dateOfBirth',
    label: 'Date of birth',
    entered: formatDateDisplay(formData.dateOfBirth),
    found: docDob ? formatDateDisplay(docDob) : 'Not found',
    result: dobMatch ? 'match' : 'mismatch'
  });

  // 4. Course: shown for information only. Never causes a mismatch.
  comparisons.push({
    field: 'course',
    label: 'Course',
    entered: formData.course,
    found: documents.marksheet?.extractedFields?.issuer_or_board
      ? `${formData.course} (${documents.marksheet.extractedFields.issuer_or_board})`
      : formData.course,
    result: 'match'
  });

  // 5. Marks percentage check on marksheet
  const marksheet = documents.marksheet;
  const docMarks = marksheet?.extractedFields?.marks_percentage;
  let marksMatch = false;

  if (docMarks !== undefined && docMarks !== null) {
    marksMatch = matchMarksPercentage(formData.marksPercentage, docMarks);
    if (!marksMatch) {
      problems.push({
        id: 'marks_mismatch',
        title: 'Marks percentage does not match',
        field: 'marksPercentage',
        entered: formatMarks(formData.marksPercentage),
        found: formatMarks(docMarks),
        fixNeeded: `You entered ${formatMarks(formData.marksPercentage)}. Your marksheet shows ${formatMarks(docMarks)}. Update your marks or upload your correct marksheet.`,
        slot: 'marksheet'
      });
    }
  } else if (marksheet?.isReadable !== false && marksheet?.detectedType === 'marksheet') {
    problems.push({
      id: 'marks_not_found',
      title: 'Marks percentage not found on marksheet',
      field: 'marksPercentage',
      entered: formatMarks(formData.marksPercentage),
      found: 'Not visible',
      fixNeeded: 'Upload a marksheet clearly showing your percentage or aggregate score.',
      slot: 'marksheet'
    });
  }

  comparisons.push({
    field: 'marksPercentage',
    label: 'Marks percentage',
    entered: formatMarks(formData.marksPercentage),
    found: docMarks !== undefined && docMarks !== null ? formatMarks(docMarks) : 'Not found',
    result: marksMatch ? 'match' : 'mismatch'
  });

  // 6. Annual family income check on income certificate
  const incomeDoc = documents.income_certificate;
  const docIncome = incomeDoc?.extractedFields?.annual_income;
  let incomeMatch = false;

  if (docIncome !== undefined && docIncome !== null) {
    incomeMatch = matchAnnualIncome(formData.annualFamilyIncome, docIncome);
    if (!incomeMatch) {
      problems.push({
        id: 'income_mismatch',
        title: 'Annual family income does not match',
        field: 'annualFamilyIncome',
        entered: formatIndianCurrency(formData.annualFamilyIncome),
        found: formatIndianCurrency(docIncome),
        fixNeeded: `You entered ${formatIndianCurrency(formData.annualFamilyIncome)}. Your certificate shows ${formatIndianCurrency(docIncome)}. Update your income or upload your correct certificate.`,
        slot: 'income_certificate'
      });
    }
  } else if (incomeDoc?.isReadable !== false && incomeDoc?.detectedType === 'income_certificate') {
    problems.push({
      id: 'income_not_found',
      title: 'Income figure not found on income certificate',
      field: 'annualFamilyIncome',
      entered: formatIndianCurrency(formData.annualFamilyIncome),
      found: 'Not visible',
      fixNeeded: 'Upload an income certificate clearly showing your annual family income.',
      slot: 'income_certificate'
    });
  }

  comparisons.push({
    field: 'annualFamilyIncome',
    label: 'Annual family income',
    entered: formatIndianCurrency(formData.annualFamilyIncome),
    found: docIncome !== undefined && docIncome !== null ? formatIndianCurrency(docIncome) : 'Not found',
    result: incomeMatch ? 'match' : 'mismatch'
  });

  // STATUS RULES:
  // - Needs correction: any mismatch, wrong document type, or unreadable document.
  // - Needs review: Gemini failed or timed out, the reply stayed malformed after one retry, or any document's confidence is below 0.7, with no clear mismatch.
  // - Approved: all three documents are the right type, readable, confidence at least 0.7, and every comparison matches.
  // - Processing: while checks are running.
  // - Rejected: set only by a staff member.
  let status: ApplicationStatus = 'Approved';
  let summary = '';

  if (problems.length > 0) {
    status = 'Needs correction';
    if (problems.length === 1) {
      summary = `We found 1 problem: ${problems[0].title.toLowerCase()}. Please fix it so we can check again.`;
    } else {
      summary = `We found ${problems.length} problems with your application. Fix them and we will check again.`;
    }
  } else if (geminiFailed || hasLowConfidence) {
    status = 'Needs review';
    summary = hasLowConfidence
      ? 'Document scan quality is low and requires manual verification by staff.'
      : 'Automated reading could not be completed and requires manual verification by staff.';
  } else {
    status = 'Approved';
    summary = 'All details match your documents. Your application has been approved.';
  }

  return {
    status,
    comparisons,
    problems,
    summary,
    hasLowConfidence,
    technicalReason: failureReason || (hasLowConfidence ? 'Document confidence below 0.7 threshold' : undefined)
  };
}
