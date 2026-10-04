export type Role = 'applicant' | 'staff';

export type ApplicationStatus =
  | 'Draft'
  | 'Processing'
  | 'Needs correction'
  | 'Needs review'
  | 'Approved'
  | 'Rejected';

export type DocumentSlot = 'id_proof' | 'marksheet' | 'income_certificate';

export type DetectedDocType = 'id_proof' | 'marksheet' | 'income_certificate' | 'unknown';

export type ReadabilityIssue =
  | 'blurry'
  | 'cropped'
  | 'too_dark'
  | 'stamp_unreadable'
  | 'other'
  | null;

export interface ExtractedDocFields {
  full_name: string | null;
  date_of_birth: string | null; // YYYY-MM-DD
  id_number_last4: string | null;
  marks_percentage: number | null;
  issuer_or_board: string | null;
  annual_income: number | null;
}

export interface GeminiExtractionResult {
  document_type: DetectedDocType;
  is_readable: boolean;
  readability_issue: ReadabilityIssue;
  confidence: number;
  fields: ExtractedDocFields;
  raw_error?: string;
}

export interface UploadedDocMetadata {
  slot: DocumentSlot;
  fileName: string;
  fileSize: number;
  fileType: string; // mime
  dataUrl?: string; // base64 representation for preview & analysis
  uploadedAt: string;
  detectedType?: DetectedDocType;
  isReadable?: boolean;
  readabilityIssue?: ReadabilityIssue;
  confidence?: number;
  extractedFields?: ExtractedDocFields;
}

export interface FieldComparison {
  field: string;
  label: string;
  entered: string;
  found: string;
  result: 'match' | 'mismatch';
  note?: string;
}

export interface ApplicationProblem {
  id: string;
  title: string;
  field: string;
  entered: string;
  found: string;
  fixNeeded: string;
  slot?: DocumentSlot;
}

export interface StatusHistoryEntry {
  status: ApplicationStatus;
  changedBy: string; // 'system' or staff email
  timestamp: string;
  reason?: string;
  note?: string;
}

export interface ApplicationRecord {
  id: string; // e.g. SCH-2025-084
  userId: string;
  applicantEmail: string;
  applicantName: string;
  phone: string;
  dateOfBirth: string; // YYYY-MM-DD
  course: string;
  marksPercentage: number;
  annualFamilyIncome: number;
  status: ApplicationStatus;
  isDraft: boolean;
  step?: number;
  documents: {
    id_proof?: UploadedDocMetadata;
    marksheet?: UploadedDocMetadata;
    income_certificate?: UploadedDocMetadata;
  };
  comparisons?: FieldComparison[];
  problems?: ApplicationProblem[];
  summary?: string;
  staffNote?: string;
  statusHistory?: StatusHistoryEntry[];
  isDemo?: boolean;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  applicationId: string;
  recipientEmail: string;
  type: 'status_update' | 'needs_correction' | 'approved' | 'rejected';
  title: string;
  message: string;
  problems?: ApplicationProblem[];
  emailStatus: 'sent' | 'failed' | 'demo_not_sent';
  emailError?: string | null;
  isDemo?: boolean;
  createdAt: string;
  read: boolean;
}

export interface UserRecord {
  id: string;
  email: string;
  role: Role;
  displayName: string | null;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}
