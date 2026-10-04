# ApplyFlow

ApplyFlow is a production-grade, automated scholarship application processing system. Applicants submit their details along with three supporting documents (Government ID proof, Academic Marksheet, and Family Income Certificate). The system uses Gemini Flash on the server side to read and classify each document, then evaluates extracted fields against form entries using plain deterministic code, decides status automatically, dispatches notifications via in-app alerts and email, and provides a portal for institutional staff review.

---

## What the App Does

1. **Applicant Workflow**:
   - Google Authentication via Firebase Auth.
   - 3-step application intake flow:
     - **Step 1: Your details**: Full name, email, Indian mobile number (+91), 3-part date of birth, course, marks percentage, annual family income. Auto-saves as a draft.
     - **Step 2: Your documents**: File validation for real MIME type (PDF, JPG, PNG) and size (up to 5 MB per file) across 3 slots: ID proof, Marksheet, and Income certificate.
     - **Step 3: Review and submit**: Clean summary without premature application IDs, terms confirmation, and submission trigger.
   - **Intake Evaluation**: Automated server-side Gemini document extraction followed by deterministic rule-based comparison.
   - **My Application Dashboard**: Displays live status badge, problem list, application journey timeline (Submitted -> Checked -> Decision: Pending), and notifications.
   - **Fix and Resubmit**: Target-focused correction screen showing only flagged fields or unreadable/wrong documents. Re-evaluates only modified documents.

2. **Staff Workflow (`/staff`)**:
   - Dedicated restricted staff login page with Google sign-in.
   - Strict role separation: non-staff accounts are blocked with `"This account is not approved for staff access"` and automatically signed out.
   - **Applications List**: Real-time counter tabs (All, Needs review, Needs correction, Approved, Rejected), multi-attribute search (applicant name, ID, document name, detected type, or extracted values), and 10-row pagination.
   - **Application Detail**: "What we found" summary, highlighted comparison table (tinted mismatched rows with "Does not match" indicator), document summary cards with full-file modal viewer, and action bar with Approve, Request correction (with required note), and Reject.
   - Optional demo seed action clearly marked `isDemo: true` for test evaluation.

---

## Setup & Secrets

Configure the following environment variables in `.env`:

```env
# GEMINI_API_KEY: Server-side Gemini API key (never exposed to browser)
GEMINI_API_KEY="your-gemini-api-key"

# EMAIL_API_KEY: Server-side email service key (e.g. Resend, Sendgrid)
# If email service fails or key is omitted, in-app notification is preserved and email failure is recorded
EMAIL_API_KEY="your-email-api-key"

# STAFF_EMAILS: Comma-separated list of approved institutional staff email addresses
STAFF_EMAILS="mdshameel740@gmail.com,staff@university.edu"

# APP_URL: Base URL of hosted application
APP_URL="http://localhost:3000"
```

To run the application:

```bash
# Start full-stack server (Node.js + Vite middleware)
npm run dev

# Run automated unit test suite
npm test

# Build production bundle
npm run build
```

---

## How Roles Work

- **Separation of Paths**: Applicants use `/` and `/apply/*`. Staff use `/staff`.
- **Server-Authoritative RBAC**: User role is strictly computed on the server by inspecting `STAFF_EMAILS`. A user can never elevate their own role.
- **Access Boundary**:
  - If an applicant navigates to any `/staff` address, they see `"You don't have access to this page"` and a direct link back to their application.
  - If staff opens an applicant route, they are routed to the staff dashboard.
  - Firestore security rules mandate that only approved admins (`admins/{uid}`) can read all records and perform staff status overrides.

---

## How the Checks and Statuses Work

Document reading is performed by Gemini Flash using temperature 0 and a strict JSON schema. Plain deterministic code performs all evaluations:

1. **Document Type Slot Matching**: Each upload slot (`id_proof`, `marksheet`, `income_certificate`) must match the detected document type. Otherwise flagged as `"wrong document"`.
2. **Readability Check**: If `is_readable` is false, flags `"unreadable document"` with plain-English reasons (blurry, cropped, too dark, stamp unreadable).
3. **Name Comparison**: Normalized comparison across all three documents. Matches if Levenshtein similarity >= 0.85 or if middle names match initials (e.g., `"Pooja R. Sharma"` matches `"Pooja Ramesh Sharma"`).
4. **Date of Birth Comparison**: Exact match of `YYYY-MM-DD` between form and ID proof.
5. **Marks Percentage**: Form percentage must match marksheet within $\pm 0.5\%$.
6. **Annual Family Income**: Form income must match income certificate within $\pm 1\%$.
7. **Course**: Information only; never causes a mismatch.

### Status Transitions:
- **Needs correction**: Any mismatch, wrong document type, or unreadable document. Saves actionable problem items for the applicant.
- **Needs review**: Low Gemini confidence ($<0.7$), transient service timeouts, or malformed replies after retry. Never crashes or auto-rejects.
- **Approved**: All 3 documents are the correct type, readable, confidence $\ge 0.7$, and all comparisons match.
- **Processing**: Temporary status while background verification runs.
- **Rejected**: Set exclusively by staff review with an optional or required reason.

---

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full architectural specifications and Mermaid diagrams.

---

## Known Limitations

- Multi-page PDF preview renders natively within an iframe; older browser viewports without built-in PDF plug-ins will offer direct file download.
- Resubmissions require valid replacement image/PDF scans; physical documents with missing stamps or torn edges must be re-issued by local authorities.

---

## Disclosure

This application was engineered using Gemini and AI-assisted tooling in Google AI Studio. Gemini 2.5 Flash is utilized on the server side to read scanned documents without human bias. All eligibility and matching determinations are executed via plain, deterministic code.
