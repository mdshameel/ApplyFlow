# ApplyFlow Architecture

ApplyFlow is structured as a full-stack, decoupled architecture prioritizing zero client exposure of sensitive keys, server-authoritative role verification, and deterministic rule validation.

```mermaid
flowchart TD
    subgraph Browser ["Client Tier (React + Vite SPA)"]
        UI_Applicant["Applicant Portal (/, /apply/*, /application)"]
        UI_Staff["Staff Portal (/staff, /staff/applications)"]
        FB_Auth["Firebase Client Auth (Google Sign-In)"]
    end

    subgraph Server ["Server Tier (Node.js Express + TSX)"]
        AUTH_SYNC["Role Syncer (/api/auth/sync-role)\nValidates against STAFF_EMAILS"]
        EVAL_ENGINE["Evaluation Engine (/api/applications/evaluate)\nMagic Bytes MIME & Size Guard"]
        DETERMINISTIC_RULES["Plain Code Rules Engine\nName, DOB, Marks, Income & Slots"]
        STAFF_API["Staff Decision API (/api/staff/*)\nApprove, Request Correction, Reject"]
    end

    subgraph CloudServices ["External Services & AI Tier"]
        GEMINI["Gemini 2.5 Flash\nTemperature 0, JSON Schema"]
        EMAIL_SVC["Email Gateway (EMAIL_API_KEY)\nFallback to In-App Notification"]
        FIRESTORE["Firebase Cloud Firestore\nCollections: users, applications, notifications, admins"]
    end

    UI_Applicant -->|Sign in with Google| FB_Auth
    UI_Staff -->|Sign in with Google| FB_Auth
    FB_Auth -->|Send UID & Email| AUTH_SYNC
    AUTH_SYNC -->|Enforce Role| FIRESTORE

    UI_Applicant -->|Submit Form & 3 Files| EVAL_ENGINE
    EVAL_ENGINE -->|Inline Base64 Scan| GEMINI
    GEMINI -->|JSON Extracted Fields| DETERMINISTIC_RULES
    DETERMINISTIC_RULES -->|Write Status & Problems| FIRESTORE
    DETERMINISTIC_RULES -->|Dispatch Alert| EMAIL_SVC

    UI_Staff -->|Review Application| STAFF_API
    STAFF_API -->|Read & Write Status Decision| FIRESTORE
    STAFF_API -->|Send Correction / Decision Email| EMAIL_SVC
```

## Architectural Component Breakdown

1. **Client Tier (React SPA)**:
   - Built with React 19, TypeScript, and Tailwind CSS.
   - Separate experiences for Applicants (`/`, `/apply/*`, `/application`) and Staff (`/staff`).
   - Role boundaries enforced at the router level: Applicants opening `/staff` receive an explicit access denied card; staff opening `/` are automatically redirected to `/staff`.

2. **Server Tier (Express + Middleware)**:
   - Runs on Port 3000.
   - Intercepts requests, validates real file MIME types via binary magic byte analysis (rejecting invalid formats before AI invocation), enforces 5 MB limits, and protects API keys.
   - Evaluates applicant records using strictly deterministic comparisons (Levenshtein name similarity, $\pm 0.5\%$ marks margin, $\pm 1\%$ income margin).
   - Gemini API keys are never bundled into the client build.

3. **Cloud & AI Services**:
   - **Gemini 2.5 Flash**: Invoked with system instructions that extract only visible text and explicitly forbid prompt injections contained within uploaded documents.
   - **Firestore & Security Rules**: RBAC rules guard against user self-elevation, ensuring only verified administrators can view and mutate all records.
   - **Email Gateway**: Sends real email notifications using `EMAIL_API_KEY`. If network delivery fails or credentials are omitted, the error is recorded, and the notification is persisted to Firestore for display in the applicant portal.
