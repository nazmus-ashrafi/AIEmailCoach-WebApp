# Development Log

## Commit 2 - Email API Endpoint 
git commit -m "feat: add email list API endpoint with mock data"

<!-- Nov 8, 2025 -->

### What I Built
- FastAPI endpoint for retrieving mock emails

### Technical Details
- Created `/api/emails` GET endpoint
- Implemented CORS middleware for frontend-backend communication
- Set up proper Python package structure with `__init__.py` files

### Dependencies Added
```bash
uv add fastapi   
uv add 'fastapi-users[sqlalchemy]'
uv add 'uvicorn[standard]'
```



## Commit 3 – Classify Email with LangGraph 
(commited twice)

git commit -m "feat: add /classify_email route with LangGraph triage + reasoning"

<!-- Nov 9, 2025 -->

### What I Built
	•	FastAPI POST endpoint /api/emails/classify_email that classifies emails into ignore, notify, or respond.
	•	Integrated the LangGraph triage graph to perform automated classification.
	•	Added reasoning field returned by the LLM to explain the classification.
	•	Updated State class to store:
	    •	classification_decision
	    •	reasoning
	    •	ai_draft (placeholder for draft replies)
	•	MVP-ready workflow: endpoint can now return meaningful classification and reasoning for mock emails.


	•	Example response:

        {
        "email_id": 6,
        "classification": "respond",
        "reasoning": "The email is an invitation to submit papers for a conference, which is relevant to my research...",
        "ai_draft": null
        }

Dependencies Added / Updated
	•	None beyond previous commit.

Notes / Next Steps
	•	Currently using mock emails; real email fetching will come later.
	•	ai_draft is a placeholder; next steps will integrate actual reply generation via response_agent.
	•	Will later add:
        •	Database persistence for classifications and drafts.
        •	Human-in-the-loop feedback loop.
        •	Metrics tracking (LangSmith).




## Commit 5 – Persist Email Classification Results 

(since Commit 3 was commited twice, we move to commit 5)
<!-- Nov 10, 2025 -->

git commit -m "feat: persist email classifications and reasoning in database"



### What I Built
	•	FastAPI /classify_email endpoint now stores classification results in the database.
	•	Implemented EmailClassification SQLAlchemy model linked to Email.
	•	Added created_at, classification, reasoning, and optional ai_draft fields.
	•	Endpoint behavior:
		•	First classification → runs LangGraph, stores result in email_classifications table.
		•	Subsequent calls for the same email → returns the stored classification without recomputation.
	•	Tables are automatically ensured at app startup via ensure_tables_exist() in main.py.
	•	Removed redundant lazy table creation logic from /emails endpoint.

### Technical Details
	•	SQLAlchemy relationships:
		•	Email → EmailClassification (one-to-many)
	•	Endpoint logic:
		•	Checks for existing classification before invoking LLM
		•	Persists new classifications with db.add() + db.commit()
	•	Optional ai_draft placeholder is generated for emails classified as respond.

### Example Response

{
  "email_id": 6,
  "classification": "respond",
  "reasoning": "The email is an invitation to submit papers for a conference, which is relevant to my research...",
  "ai_draft": ""
}

### Dependencies Added / Updated
	•	None — reuses existing FastAPI, SQLAlchemy, and project setup.

### Notes / Next Steps
	•	Implement /reclassify endpoint to force updates on classifications.
	•	Set up Alembic migrations for production-ready schema management.
	•	Integrate real-time AI draft generation and human-in-the-loop feedback.
	•	Build metrics/analytics dashboard for email triage results.


⸻

## Commit 6 – Email Inbox UI (Frontend Integration)

<!-- Nov 11, 2025 -->

git commit -m "feat: add email inbox page with dark theme and backend integration"

### What I Built
	•	Created a React frontend page (app/emails/page.tsx) to display emails fetched from the FastAPI backend.
	•	Implemented responsive email cards showing subject, sender, recipient, and preview text.
	•	Styled with dark mode using Tailwind + shadcn components (Card, Badge).
	•	Added dynamic data fetching from the backend endpoint (http://localhost:8000/api/emails/).
	•	Introduced loading and empty states:
		•	“Loading emails…” indicator.
	•	Graceful message when no emails are found.

### Technical Details
	•	Connected the frontend (Next.js) to the backend (FastAPI) via CORS-enabled API calls.
	•	Integrated shadcn UI library for consistent styling and reusable components.
	•	Applied dark theme styling using Tailwind utility classes (bg-gray-950, text-gray-100, bg-gray-900).
	•	File structure organized under:
			webapp/frontend/app/emails/page.tsx
			webapp/frontend/components/ui/


## Commit 7 – Email Inbox UI (Frontend Integration) **[Frontend]**

git commit -m "feat[Frontend]: add email classification island to email details page"     

<!-- Nov 12, 2025 -->


### What I Built
	•	Added a client-side ClassifyIsland component for email detail page.
	•	Large centered button to classify an email via the FastAPI /classify_email endpoint.
	•	Button shows a spinner while classification is in progress.
	•	Displays reasoning from the AI in a readable block with improved typography.
	•	Server-side rendered email detail page remains SSR; only the interactive button is a client-side “island.”

### Technical Details
	•	Created a React client component (ClassifyIsland.tsx) using hooks (useState) to manage classification, reasoning, loading, and error state.
	•	Fetches classification from backend via environment-based API_BASE_URL.
	•	Color-coded classification uses Tailwind classes with runtime-safe mapping. (TODO: need to fix)
	•	Spinner implemented with Lucide Loader2 icon and Tailwind animate-spin.
	•	Reasoning block styled with padding, rounded corners, larger font, and whitespace preserved.
	•	Dynamic updates ensure idempotency: already-classified emails return stored values without recomputation.


### Notes / Next Steps
	•	Fix color visibility issues for classification verdicts.
	•	Integrate AI draft generation once /reclassify endpoint is ready.
	•	Add animation for reasoning box (optional UX improvement).
	•	Connect island to metrics/analytics dashboard to track classification interactions.



## Commit 8 – AI Draft Generation (Backend + Frontend Integration)

<!-- Nov 13, 2025 -->

git commit -m "feat: add AI draft generation endpoint and frontend integration"

### What I Built
	•	Backend
		•	Implemented POST /api/emails/{email_id}/generate_draft route.
		•	Uses LangGraph response_agent only for emails classified as “respond”.
		•	Skips re-generation if a draft already exists (idempotent).
		•	Supports forced re-generation with optional config override. (will be completed later)
		•	Reuses LangGraph state (ai_draft) to persist generated draft in DB.
		•	Updated /classify_email endpoint to also capture ai_draft when classification = respond.
	•	Frontend
		•	Extended the ClassifyIsland component:
			•	Added “Generate Draft” button beside “Classify Email.”
			•	Displays the AI draft cube next to the classification cube in a responsive layout.
		•	Buttons have independent loading spinners and error states.
		•	Automatically populates the AI draft after successful classification (if available).

### Technical Details
	•	FastAPI backend:
		•	generate_draft checks for existing draft before invoking LangGraph.
		•	Adds conditional force support to bypass cache if explicitly requested. (will be completed later)
		•	Ensures persisted results in email_classifications table (ai_draft column).
	•	Frontend:
		•	Updated ClassifyIsland.tsx:
		•	Added aiDraft state.
		•	Added handleGenerateDraft() function calling /generate_draft.
		•	Displayed both cubes (classification + ai_draft) side-by-side using flex + gap-6.
	

### Example Response

{
  "email_id": 12,
  "classification": "respond",
  "reasoning": "The sender is requesting a reply regarding a research collaboration opportunity.",
  "ai_draft": "Dear Dr. Reynolds,\n\nThank you for reaching out..."
}

### Dependencies Added / Updated
	•	None — reused existing LangGraph + FastAPI setup.

### Notes / Next Possible Steps
	•	Add force regenerate toggle in frontend to pass ?force=true query param.
	•	Integrate AI draft editor for human review before sending.
	•	Separate write_email and send_email tools in LangGraph agent.
	•	Add LangSmith traces for draft generation latency and success metrics.


----

## Commit 9 – Outlook Sync,  Full Email Ingestion (Backend), Render (Frontend)

<!-- Nov 15, 2025 -->

git commit -m "feat: Outlook sync API, backend ingestion, store HTML & text, frontend rendering"

### What I Built
	•	Backend integration with Microsoft Graph API to fetch real Outlook emails.
	•	Implemented /api/emails/sync_outlook POST route.
		•	Connects via OutlookClient using credentials from .env.
		•	Fetches latest messages from Inbox (top 25 by default).
		•	Transforms Graph API payload into our Email model.
		•	Deduplicates by message_id to prevent duplicates in DB.
	•	Persisted both:
		•	email_thread_html → raw HTML for full rendering.
		•	email_thread_text → cleaned text via BeautifulSoup for previews, AI processing, and LLM input.
	•	Removed all mock email ingestion logic.
	•	Updated Email SQLAlchemy model with new fields (email_thread_html, email_thread_text, message_id).
	•	Frontend /emails/[id] now renders the full HTML content for each email and uses email_thread_text for clean previews.

### Technical Details
	•	OutlookClient handles authentication via MSAL and fetches messages from Microsoft Graph.
			Automate Outlook with python using the Outlook API
				(1) Goal: Create an Azure app:  to allow Python to connect to Microsoft Graph API Endpoint.
				- Azure portal -> Microsoft Entra ID -> Under "Manage," select "App registrations" and then "New registration."
				- Redirect URI (optional): We’ll return the authentication response to this URI after successfully authenticating the user. 
				Set to: https://localhost.com:8000
				- Manager -> Certificates & Secrets -> Set Client Secret (Key to authenticate my Python program to the Azure Server)
				-> saving "value" in .env as CLIENT_SECRET
				- Saved APPLICATION_ID in .env
				(2) Automate Outlook tasks such as fetch emails - retrieve_messages_all_emails.py

				First wrote "ms_graph.py" and "retrieve_messages_all_emails.py" to try out concept, then combined them in "outlook.py" 

				Command to use:
				The command below get the emails from outlook and populates the db.
				cd webapp/backend/core && uv run outlook.py

	•	transform_graph_message_to_email_record function converts Outlook JSON to DB-friendly structure:
		•	Extracts sender, recipients, subject, timestamps, body text and HTML.
		•	Cleans HTML to text for AI-ready ingestion.
	•	/emails/ GET endpoint returns list of emails from DB without any mock data.
	•	Detail page uses server-side rendering for HTML email content and ClassifyIsland client component for interactive classification.

### Example Response – /api/emails/1

{
  "id": 1,
  "author": "account-security-noreply@accountprotection.microsoft.com",
  "to": "nazmus_@outlook.com",
  "subject": "New app(s) connected to your Microsoft account",
  "created_at": "2025-11-15T09:47:46.946251",
  "email_thread_text": "Microsoft account\nNew app(s) have access to your data\noutlook-api-ai-email-coach connected...",
  "email_thread_html": "<html dir=\"ltr\"><head>...</html>",
  "message_id": "AQMkADAwATNiZmYAZC03NDczLWYxNzMtMDACLTAwCgBGAAADxsDs..."
}

### Dependencies Added / Updated
	•	beautifulsoup4 → HTML parsing and clean text extraction.
	•   msal = Official python package to facilitate the connection to the graph API
        Microsoft Authentication Library (MSAL)
    •   httpx = modern http client for python supporting both sync and async

### Notes / Next Possible Steps
	•	Implement incremental fetch with pagination (instead of top 25) to sync all emails efficiently.
	•	Add background task / cron job to periodically sync new emails from Outlook.
	•	Add search and filter on frontend inbox based on subject, from, to.
	•	Support attachments in future commits.
	•	Optionally integrate rich HTML preview in frontend with safe sanitization.

⸻


## Commit 10 – Outlook Sync,  Full Email Ingestion (Backend), Render (Frontend)

<!-- Nov 17, 2025 -->

git commit -m "feat[frontend/backend]: add Outlook sync button, parse received timestamp, latest-first inbox, beautified previews"

⸻

### What I Built
	1.	Sync Outlook Button (Frontend)
		•	Added <SyncOutlookButton> on the Inbox page (/emails)
		•	Button triggers backend /sync_outlook endpoint
		•	Loading and success/error message handling
		•	Inbox table automatically refreshes after sync using refreshAfterSync()
	2.	Inbox Latest-First Ordering
		•	Backend now parses Outlook received_datetime when saving emails:

				received_dt = parser.isoparse(record.get("received_datetime"))
				new_email = Email(..., created_at=received_dt)


		•	Ensures new emails appear at the top of the inbox (ORDER BY created_at DESC)

	3.	Beautified Email Previews
		•	cleanEmailPreview() in frontend formats email_thread_text for inbox display:
		•	Strips headers like From:, To:, Date:, Subject:
		•	Collapses whitespace
		•	Preserves original text for full email view and AI processing
		•	Improves readability while keeping raw data untouched
	4.	UI Improvements
		•	Display received date/time next to classification badge on each inbox card
		•	Cleaned inbox card layout with flex to align subject, badge, and timestamp
		•	Maintains dark theme styling with Tailwind and shadcn components

⸻

### Technical Details
	•	Backend
		•	/sync_outlook fetches Outlook messages via OutlookClient in a threadpool (sync client) (done before)
		•	Deduplicates by message_id (done before)
		•	Converts Outlook message payload via transform_graph_message_to_email_record (done before)
		•	Saves created_at as received_datetime for accurate chronological ordering
	•	Frontend
		•	EmailsPage.tsx uses useEffect + refreshAfterSync() for initial fetch and post-sync refresh. TODO: reduce duplicate code
		•	cleanEmailPreview() prepares readable preview text for inbox
		•	Inbox cards use flex layout to display subject, classification, and received_at side by side

⸻

### Notes / Next Steps
	•	Optionally refactor cleanEmailPreview() into a shared utility file. (Maybe just keep it here, as used by this file only)
	•	Consider full-thread preview toggle or expandable view
	•	Add animations for new messages synced
	•	Track sync performance and metrics (e.g., via LangSmith)

⸻

## Commit 11 - Outlook Delta Sync implementation for Inbox

<!-- Nov 18, 2025 -->

git commit -m "feat[outlook_sync]: full delta sync implementation for Inbox"


- Added DeltaToken table to track delta tokens per folder
- Implemented OutlookClient.delta_messages() with auto-pagination
- Added upsert_email() and delete_email() helpers
- Created /sync_outlook route using delta sync:
    • handles new, updated, deleted messages
    • stores and reuses delta token
    • one-time full inbox initialization
- Ensures datetime conversion for SQLite compatibility
- Drop-in compatible with existing FastAPI + SQLAlchemy stack

---

### Reasoning for "Delta sync implementation for Inbox"

	/sync_outlook endpoint should handle:
	•	deletions in Outlook
	•	updates (e.g., marking as read/unread)
	•	moves between folders
	•	restored emails
	•	soft-deleted items in Outlook

	Even for an MVP, the Microsoft Graph Delta API is much simpler and cleaner than trying to manually reconcile emails. 
	So I have decided to use the Microsoft Graph Delta API to eliminate:
		•	deduping
		•	reconciliation
		•	polling entire mailbox
		•	manually detecting deletions
		•	expensive queries


### What I Built

	Implemented a full production-grade delta sync for Outlook Inbox using Microsoft Graph. The implementation includes: 
		1.	DeltaToken Table: Tracks the last delta token per folder, supports one-time full sync and incremental updates. 
		2.	OutlookClient.delta_messages(): Handles delta queries, auto-paginates through Microsoft Graph pages, returns list of changes + new delta token. 
		3.	Upsert & Delete Helpers: upsert_email() safely updates or inserts messages; delete_email() removes deleted messages. 
		4.	/sync_outlook Route: 
			•	Runs delta sync in threadpool 
			•	Handles new, updated, deleted messages 
			•	Persists new delta token 
			•	Commits changes once per sync 
		5.	One-Time Initialization: Full inbox ingestion on first run, then incremental deltas only. 
		6.	SQLite Safe: Ensures datetime fields (received_at, created_at) are Python datetime objects to prevent TypeErrors. 

	Impact:
		•	Inbox stays mirrored accurately in the database. 
		•	Deletes and updates are synchronized correctly. 
		•	Sync is fast, delta-based; avoids fetching entire mailbox repeatedly. 
		•	Ready for future enhancements (multi-folder sync, background scheduling, logging, frontend triggers). 

	Next Steps:
		•	Add structured logging for audit and debugging. 
		•	Create automated tests to simulate delta changes and deletions. 
		•	Extend to other folders (Sent, Archive, etc.) if needed. 

### Impact:
	•	Inbox stays mirrored accurately in the database.
	•	Deletes and updates are synchronized correctly.
	•	Sync is fast, delta-based; avoids fetching entire mailbox repeatedly.
	•	Ready for future enhancements (multi-folder sync, background scheduling, logging, frontend triggers).

### Next Steps in this Feature:
	•	Extend to other folders (Sent, Archive, etc.) if needed.
	•	Create automated tests to simulate delta changes and deletions.


⸻

## Commit 12 - Backend Restructure

<!-- Nov 19, 2025 -->

git commit -m "refactor: restructure backend to feature-based architecture"


**My Current backend Architecture:**

1. **Core Layer** (`webapp/backend/core/`)
   - `outlook.py`: OutlookClient with Microsoft Graph integration
   - Handles OAuth flow, token management, message fetching, and delta sync

2. **Database Layer** (`webapp/backend/db/`)
   - `database.py`: SQLAlchemy setup with engine, session management, and table creation

3. **Models Layer** (`webapp/backend/models/`)
   - SQLAlchemy ORM models
   - `delta_token.py`: Stores delta sync tokens
   - `email.py`: Email data model

4. **Routers Layer** (`webapp/backend/router/`)
   - `email.py`: API endpoints for email features
   - Example: `/sync_outlook` endpoint

5. **Schemas Layer** (`webapp/backend/schemas/`)
   - `email.py`: Pydantic models for request/response validation

6. **Services Layer** (`webapp/backend/services/`)
   - `email_ingest.py`: Business logic consumed by routers
   - Example: `upsert_email()` function used by the sync endpoint

**Pattern:**
This is a clean layered architecture:
- **Routers** → define endpoints
- **Services** → contain business logic
- **Models** → define database schema
- **Schemas** → define API contracts
- **Core** → external integrations (Outlook)
- **DB** → database configuration

This is a solid, maintainable structure, however it is **layer-based (horizontal slicing)**.

For this project I want to have **feature-based (vertical slicing)**, because:
-  The feature is self-contained (Increased seperation == increased organization == increased navigation speed == faster development speed)
-  I can focus on one feature folder at a time
- Each feature is a mini-app (each mini-app can be a separate microservices later)


## **Comparison**

| Aspect | Current Structure (Layer-based) |  Re-structure (Feature-based) |
|--------|------------------------------|-----------------------------------|
| **Organization** | By technical layer (models/, routers/, services/) | By business feature (auth/, todo/, email/) |
| **Pros** | Clear separation of concerns, easy to find "all models" or "all routes" | Related code lives together, easier to work on one feature in isolation |
| **Cons** | Jump between folders when working on a feature | Some duplication of structure per feature |
| **Scalability** | Can get messy with many features | Scales well - each feature is self-contained |
| **Onboarding** | Need to understand entire layer structure | Can focus on one feature folder at a time |

## **Mapping my current layer based structure to feature-based structure**

**Current:**
```
webapp/backend/
├── core/
│   └── outlook.py
├── db/
│   └── database.py
├── models/              # SQLAlchemy models
│   ├── delta_token.py
│   └── email.py
├── schemas/             # Pydantic models
│   └── email.py
├── routers/
│   └── email.py
└── services/
    └── email_ingest.py
```

**Re-structure (Feature-based):**
```
webapp/backend/
├── core/               # or "shared"
│   └── outlook.py
├── database/
│   └── database.py
├── entities/           # ALL SQLAlchemy models
│   ├── delta_token.py
│   └── email.py
├── email/              # Email feature
│   ├── schemas.py        # Pydantic schemas
│   ├── service.py      # email_ingest logic
│   └── router.py       # email routes
└── auth/               # Auth feature (will be added)
    ├── schemas.py
    ├── service.py
    └── router.py
```

## **Migration Steps**

Steps I took to restructure the backend:

1. **Rename `models/` → `entities/`** (SQLAlchemy models stay centralized)
2. **Delete `schemas/` and `routers/` and `services/` folders (ie. moved content - see 4)**
3. **Create feature folders:**
   ```bash
   mkdir webapp/backend/email
   ```
4. **Move and rename files:**
   - `schemas/email.py` → `email/model.py` (Pydantic)
   - `routers/email.py` → `email/router.py`
   - `services/email_ingest.py` → `email/service.py`

5. **Update imports** in each file:

	(Update all import paths to relative imports)

	Example:

   ```python
   # In emails/router.py
   from emails.service import upsert_email  # instead of from services.email_ingest
   from emails.model import schemas    # instead of from schemas.email
   from entities.email import Email       # instead of from models.email
   ```

-----------




⸻

## Commit 13 - Authentication & User Management System

<!-- Nov 21, 2025 -->

git commit -m "feat: implement JWT authentication and user management modules"

### What I Built
- **Auth Module** (`webapp/backend/auth/`)
  - User registration with email validation and password hashing
  - JWT-based login with OAuth2 password flow
  - Token generation and verification
  - Protected endpoint to get current user info
  
- **Users Module** (`webapp/backend/users/`)
  - Get current user profile
  - Update user profile (name, email)
  - Change password with confirmation validation
  - Delete user account (cascades to all associated data)

- **Supporting Infrastructure**
  - Custom exception classes (`AuthenticationError`, `UserAlreadyExistsError`)
  - JWT configuration in `core/config.py` (externalized to environment variables)
  - Entity model imports in `main.py` to resolve SQLAlchemy relationships
  - Fixed `DeltaToken` foreign key relationship to `EmailAccount`

### Technical Details

**Auth Module:**
- `schemas.py`: Pydantic models for registration, token, and token data
- `service.py`: 
  - Bcrypt password hashing with `passlib`
  - JWT token creation/verification with `PyJWT`
  - User authentication logic
  - OAuth2PasswordBearer for protected routes
- `router.py`: Three endpoints
  - `POST /api/auth/register` - Create new user
  - `POST /api/auth/token` - Login and get JWT
  - `GET /api/auth/me` - Get current user (protected)

**Users Module:**
- `schemas.py`: Models for user response, profile updates, password changes
- `service.py`:
  - Get user by ID
  - Update profile with email uniqueness validation
  - Change password with current password verification and confirmation matching
  - Delete account with cascade to EmailAccounts, Emails, EmailClassifications
- `router.py`: Four protected endpoints
  - `GET /api/users/me` - Get profile
  - `PUT /api/users/me` - Update profile
  - `PUT /api/users/me/password` - Change password
  - `DELETE /api/users/me` - Delete account

**Security Features:**
- Passwords hashed with bcrypt (resistant to brute-force)
- JWT tokens with HS256 algorithm and expiration (30 min default)
- Secret key and algorithm externalized to `.env`
- Password confirmation validation to prevent typos
- Protected routes require valid JWT in Authorization header

**Database Relationships:**
```
User (1) → EmailAccount (Many) → Email (Many) → EmailClassification (Many)
                              ↓
                         DeltaToken (Many)
```

### Dependencies Added
```bash
uv add passlib[bcrypt]      # Password hashing
uv add PyJWT                # JWT token management
uv add python-multipart     # Form data parsing for OAuth2
```

### Configuration
Added to `core/config.py`:
```python
JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM")
JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
```

Required in `.env`:
```bash
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
```

### Example API Flow

**1. Register:**
```bash
POST /api/auth/register
{
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "password": "securepass123"
}
→ 201 Created
```

**2. Login:**
```bash
POST /api/auth/token
Form data: username=user@example.com&password=securepass123
→ { "access_token": "eyJhbGc...", "token_type": "bearer" }
```

**3. Access Protected Route:**
```bash
GET /api/users/me
Header: Authorization: Bearer eyJhbGc...
→ { "id": "uuid", "email": "user@example.com", ... }
```

### Bug Fixes
- Fixed SQLAlchemy relationship errors by importing all entity models in `main.py`
- Added missing foreign key `email_account_id` to `DeltaToken` model
- Fixed relationship between `DeltaToken` and `EmailAccount` with proper `back_populates`

### Testing
- Created `API_TESTING_CHECKLIST.md` with step-by-step testing guide
- All endpoints tested via Swagger UI at `http://localhost:8000/docs`
- Verified registration, login, authorization, profile management, and error handling

### Notes / Next Steps
- ✅ Authentication system complete and tested
- ✅ User management endpoints working
- 🔜 Build frontend login/register pages
- 🔜 Implement OAuth2 flow for users to connect their Outlook accounts
- 🔜 Create `email_accounts` module for multi-account support
- 🔜 Add token refresh mechanism for longer sessions
- 🔜 Implement email verification and password reset flows

⸻

## Commit 14 - OAuth2 Email Accounts & Account-Based Sync System

<!-- Nov 22, 2025 -->

git commit -m "feat[frontend/backend]: implement OAuth2 email accounts with encrypted tokens and account-based sync"

### What I Built

This was a major feature implementation that enables users to securely connect multiple email accounts via OAuth2 and sync emails on a per-account basis.

#### 1. Email Accounts Module (`webapp/backend/email_accounts/`)

**Core Infrastructure:**
- **Token Encryption** - Fernet symmetric encryption for storing refresh tokens
  - `encrypt_token()` / `decrypt_token()` functions
  - Uses `TOKEN_ENCRYPTION_KEY` from environment
  - Refresh tokens never stored in plaintext
  
- **OAuth2 State Management** - CSRF protection for OAuth flow
  - `create_oauth_state()` - Generates secure state with user_id, timestamp, nonce
  - `verify_oauth_state()` - Validates state and extracts user_id
  - 10-minute expiration window
  
- **Microsoft OAuth2 Integration** - MSAL-based authentication
  - `get_msal_app()` - Creates MSAL confidential client
  - `create_authorization_url()` - Generates Microsoft login URL
  - `exchange_code_for_tokens()` - Exchanges auth code for tokens
  - `refresh_access_token()` - Refreshes expired access tokens

**API Endpoints:**
```python
GET  /api/email_accounts/oauth/authorize    # Initiate OAuth2 flow
GET  /api/email_accounts/oauth/callback     # Handle Microsoft redirect
GET  /api/email_accounts/                   # List user's accounts
DELETE /api/email_accounts/{account_id}     # Delete account
```

**Database Schema:**
```sql
CREATE TABLE email_accounts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    provider VARCHAR,  -- 'outlook', 'google', 'imap'
    email_address VARCHAR,
    ms_refresh_token_encrypted VARCHAR,
    google_refresh_token_encrypted VARCHAR,
    access_token_expires_at TIMESTAMP,
    created_at TIMESTAMP
);
```

#### 2. Account-Based Email Sync (`webapp/backend/emails/`)

**Updated Email Service:**
- Modified `upsert_email()` to accept `email_account_id` parameter
- Links emails to their source account
- Maintains backward compatibility

**New Sync Endpoint:**
```python
POST /api/emails/sync_outlook/{account_id}
```

**Features:**
- Uses encrypted refresh tokens from database (not .env files)
- Creates `DeltaToken` with proper `email_account_id` (fixes integrity error)
- Links all synced emails to their source account
- Performs incremental delta sync via Microsoft Graph API
- Auto-refreshes access tokens when expired
- Returns detailed sync statistics

**Sync Flow:**
1. Verify account ownership
2. Decrypt refresh token from database
3. Refresh access token using MSAL
4. Load/create delta token for account + folder
5. Perform delta sync (only fetch changes)
6. Process changes (insert, update, delete)
7. Link emails to `email_account_id`
8. Save new delta token
9. Return statistics

#### 3. Frontend Implementation

**New Pages:**
- `app/accounts/page.tsx` - Email accounts dashboard
  - Lists connected accounts
  - "Connect Outlook Account" button
  - Account cards with sync/delete actions
  
- `app/accounts/oauth-callback/page.tsx` - OAuth callback handler
  - Shows success/error messages
  - Auto-redirects to accounts page

**New Components:**
- `components/accounts/account-card.tsx`
  - Displays account details (email, provider, connection date)
  - Sync and Delete buttons
  - Delete confirmation dialog
  
- `components/accounts/connect-account-button.tsx`
  - Initiates OAuth2 flow
  - Passes JWT token as query parameter

**API Client:**
- `utils/email-accounts-client.ts`
  - `getAccounts()` - Fetch connected accounts
  - `deleteAccount(id)` - Remove account
  - `syncAccount(id)` - Trigger sync
  - `getOAuthUrl()` - Get OAuth initiation URL

**Type Definitions:**
- `types/email-account.ts`
  - `EmailAccount` interface
  - `EmailAccountList` interface
  - `OAuthCallbackParams` interface

#### 4. Configuration Updates

**Backend (`core/config.py`):**
```python
MICROSOFT_CLIENT_ID: str
MICROSOFT_CLIENT_SECRET: str
MICROSOFT_REDIRECT_URI: str
MICROSOFT_TENANT_ID: str = "consumers"
MICROSOFT_SCOPES: List[str] = ["User.Read", "Mail.ReadWrite", "Mail.Send"]
TOKEN_ENCRYPTION_KEY: str
FRONTEND_URL: str = "http://localhost:3000"
```

**Environment Variables Required:**
```bash
# Microsoft OAuth2
APPLICATION_ID=<azure_app_client_id>
CLIENT_SECRET=<azure_app_client_secret>
REDIRECT_URI=http://localhost:8000/api/email_accounts/oauth/callback
TENANT_ID=consumers

# Token Encryption
TOKEN_ENCRYPTION_KEY=<fernet_key>  # Generate with: Fernet.generate_key()

# Frontend
FRONTEND_URL=http://localhost:3000
```

#### 5. Routing Updates

**Default Redirects Changed:**
- Login → `/accounts` (was `/emails`)
- Registration → `/accounts` (was `/emails`)

**User Menu:**
- Added "Email Accounts" link to dropdown

### Technical Implementation Details

#### OAuth2 Flow (Step-by-Step)

1. **User clicks "Connect Outlook Account"**
   - Frontend gets JWT token from localStorage
   - Redirects to: `GET /api/email_accounts/oauth/authorize?token=<jwt>`

2. **Backend creates authorization URL**
   - Verifies JWT token
   - Creates state parameter with user_id
   - Generates Microsoft authorization URL
   - Redirects browser to Microsoft login

3. **User authorizes on Microsoft**
   - Enters Microsoft credentials
   - Grants permissions
   - Microsoft redirects to callback with code

4. **Backend handles callback**
   - Verifies state parameter (CSRF protection)
   - Exchanges authorization code for tokens
   - Fetches user email from Microsoft Graph
   - Encrypts refresh token with Fernet
   - Stores in `email_accounts` table
   - Redirects to frontend success page

5. **Frontend shows success**
   - Displays "Account connected successfully!"
   - Redirects to accounts dashboard
   - Account appears in list

#### Delta Sync Implementation

**Old System (Broken):**
```python
# ❌ Created DeltaToken without email_account_id
token_row = DeltaToken(folder="inbox", delta_token=None)
# Caused: IntegrityError: NOT NULL constraint failed
```

**New System (Fixed):**
```python
# ✅ Properly links DeltaToken to account
token_row = DeltaToken(
    email_account_id=account_uuid,
    folder="inbox",
    delta_token=None
)
```

**Benefits:**
- Each account has its own delta token
- Supports multiple accounts per user
- Incremental sync only fetches changes
- No duplicate syncs across accounts

### Bug Fixes

1. **Import Errors**
   - Fixed: `ModuleNotFoundError: No module named 'auth.dependencies'`
   - Solution: Changed to `from auth.service import get_current_user`
   - Updated all endpoints to use `CurrentUser` type annotation

2. **Entity Import Error**
   - Fixed: `ModuleNotFoundError: No module named 'entities.user'`
   - Solution: Changed to `from entities.users import User`

3. **OAuth2 Scope Error**
   - Fixed: `ValueError: You cannot use any scope value that is reserved`
   - Solution: Removed `offline_access` from `MICROSOFT_SCOPES`
   - MSAL adds it automatically

4. **401 Unauthorized on OAuth Authorize**
   - Problem: Browser redirects can't include Authorization headers
   - Solution: Pass JWT token as query parameter
   - Updated endpoint to accept `token: str = Query(...)`

5. **Frontend 404 Errors**
   - Problem: Missing `/api` prefix in API calls
   - Solution: Updated all endpoints in `email-accounts-client.ts`
   - Changed `/email_accounts/` → `/api/email_accounts/`

6. **Database Integrity Error**
   - Problem: Legacy sync endpoint creating `DeltaToken` without `email_account_id`
   - Solution: Disabled old endpoint, created new account-based endpoint

7. **Timezone Comparison Error**
   - Problem: `TypeError: can't compare offset-naive and offset-aware datetimes`
   - Solution: Simplified to always refresh access token (Microsoft caches internally)

### Dependencies Installed

**Backend:**
```bash
uv pip install msal cryptography email-validator
```

**Packages:**
- `msal` - Microsoft Authentication Library
- `cryptography` - Fernet encryption for tokens
- `email-validator` - Pydantic email validation

### Database Migrations

**New Relationships:**
```sql
-- Emails now link to accounts
ALTER TABLE emails 
ADD COLUMN email_account_id UUID 
REFERENCES email_accounts(id) ON DELETE CASCADE;

-- Delta tokens link to accounts
ALTER TABLE delta_tokens
ADD COLUMN email_account_id UUID NOT NULL
REFERENCES email_accounts(id) ON DELETE CASCADE;
```

### Security Considerations

**Token Storage:**
- Refresh tokens encrypted at rest using Fernet
- Access tokens short-lived (1 hour), not stored
- Encryption key stored in environment variable

**OAuth2 Security:**
- State parameter prevents CSRF attacks
- Redirect URI validation
- Scopes limited to necessary permissions
- Token exchange happens server-side only

**Authentication:**
- JWT tokens for API authentication
- Protected routes require valid token
- User can only access their own accounts

### Testing Performed

**OAuth2 Flow:**
- ✅ Connect Outlook account
- ✅ Microsoft authorization
- ✅ Callback handling
- ✅ Token encryption/storage
- ✅ Account appears in dashboard

**Sync Functionality:**
- ✅ First sync (all emails)
- ✅ Incremental sync (only changes)
- ✅ Emails linked to account
- ✅ Delta token saved correctly
- ✅ Statistics returned

**Error Handling:**
- ✅ Invalid account_id
- ✅ Account not found
- ✅ Unauthorized access
- ✅ Expired tokens auto-refresh
- ✅ Microsoft API errors

### Documentation Created

1. **FRONTEND_AUTH_TUTORIAL.md** (3,000+ lines)
   - Complete system architecture
   - Authentication flow explained
   - OAuth2 flow step-by-step
   - Frontend/backend patterns
   - Database schema
   - Implementation guide for sync endpoint

2. **SYNC_IMPLEMENTATION_SUMMARY.md**
   - Implementation details
   - Flow diagrams
   - Testing instructions
   - Troubleshooting guide

3. **SETUP_OAUTH.md**
   - Azure app registration steps
   - Environment variable setup
   - Encryption key generation
   - Redirect URI configuration

### Files Created/Modified

**Backend:**
- ✅ `email_accounts/__init__.py`
- ✅ `email_accounts/schemas.py` - Pydantic models
- ✅ `email_accounts/service.py` - OAuth2 & encryption logic
- ✅ `email_accounts/router.py` - API endpoints
- ✅ `emails/service.py` - Updated `upsert_email()`
- ✅ `emails/router.py` - New sync endpoint
- ✅ `core/config.py` - OAuth2 settings
- ✅ `main.py` - Router registration

**Frontend:**
- ✅ `app/accounts/page.tsx`
- ✅ `app/accounts/oauth-callback/page.tsx`
- ✅ `components/accounts/account-card.tsx`
- ✅ `components/accounts/connect-account-button.tsx`
- ✅ `utils/email-accounts-client.ts`
- ✅ `types/email-account.ts`
- ✅ `app/auth/login/page.tsx` - Updated redirect
- ✅ `app/auth/register/page.tsx` - Updated redirect
- ✅ `components/auth/user-menu.tsx` - Added accounts link

### Architecture Improvements

**Before:**
- Single-user email sync
- Hardcoded credentials in .env
- No account management
- Delta tokens not linked to accounts
- Emails not linked to accounts

**After:**
- Multi-account support per user
- OAuth2 with encrypted token storage
- Full account management UI
- Delta tokens properly linked
- Emails linked to source accounts
- Secure, scalable, production-ready

### Performance Optimizations

- **Delta Sync:** Only fetches changes (not all emails every time)
- **Token Caching:** Microsoft handles access token caching
- **Atomic Commits:** Single database commit per sync
- **Bulk Deletes:** Efficient deletion of multiple emails

### Next Steps

- [ ] Add Gmail OAuth2 support
- [ ] Add IMAP account support
- [ ] Implement email folders (Sent, Drafts, etc.)
- [ ] Add sync status indicators in UI
- [ ] Implement background sync (cron job)
- [ ] Add email search across accounts
- [ ] Implement email threading
- [ ] Add sync conflict resolution
- [ ] Create admin panel for monitoring
- [ ] Add usage analytics

### Notes

This was a comprehensive feature that touched both frontend and backend extensively. The OAuth2 implementation follows Microsoft's best practices, and the token encryption ensures security. The account-based sync architecture is scalable and supports unlimited accounts per user.

Key achievement: Transformed from a single-user, hardcoded credential system to a multi-account, OAuth2-based, production-ready email management platform.


⸻

## Commit 15 - User Registration Documentation

<!-- Nov 23, 2025 -->

git commit -m "docs: Add comprehensive User Registration flow article"

### What I Built

docs: Add comprehensive User Registration flow article


### Overview
Created comprehensive technical article documenting the complete user registration flow in the AI Email Assistant application.

### What Was Built
- **Article**: `Articles/1_USER_REGISTRATION_ARTICLE.md` (744 lines)
- **Diagrams**: 3 custom diagrams showing flow architecture
  - High-level sequence diagram (overview)
  - Frontend architecture diagram (3-layer pattern)
  - Backend architecture diagram (service layer pattern)

### Technical Content Covered

**Frontend Architecture:**
- Three-layer abstraction (UI Component → Context → API Client)
- React Context Provider pattern for global auth state
- Custom hook pattern (`useAuth()`) with detailed explanation
- API client architecture with DRY principle demonstration
- Type safety with TypeScript

**Backend Architecture:**
- Router → Service → Database pattern
- Pydantic schema validation
- bcrypt password hashing (cost factor 12)
- SQLAlchemy ORM with UUID primary keys
- Database transactions and rollback handling

**Security Features:**
- Defense in depth (multiple validation layers)
- Password hashing with automatic salting
- SQL injection prevention via ORM
- JWT token management
- Error handling at every layer

**Special Features:**
- Auto-login after registration for seamless UX
- Token storage in localStorage
- Global state management with Context
- Detailed error scenarios with HTTP status codes

### Key Insights

**Why This Matters:**
This article serves as a technical documentation, demonstrating:
1. Full-stack development expertise (React + FastAPI)
2. Clean architecture principles
3. Security best practices
4. Modern authentication patterns
5. Clear technical communication

**Architecture Decisions Highlighted:**
- **Frontend**: Separation of concerns through layered architecture prevents tight coupling
- **Backend**: Service layer pattern decouples business logic from HTTP concerns
- **Security**: Multiple validation layers provide defense in depth
- **UX**: Auto-login reduces friction in user onboarding

### Code Examples
All code examples are pulled from the actual implementation:
- `webapp/frontend/app/auth/register/page.tsx`
- `webapp/frontend/components/auth/auth-context.tsx`
- `webapp/frontend/utils/auth-client.ts`
- `webapp/backend/auth/router.py`
- `webapp/backend/auth/service.py`
- `webapp/backend/entities/users.py`

### Diagrams Created
1. **Sequence Diagram** - Shows complete flow from user input to database
2. **Frontend Flow** - Illustrates 3-layer frontend architecture pattern
3. **Backend Flow** - Details 3-layer backend architecture pattern

### Future Improvements Noted
- Unit tests for registration flow
- Rate limiting for brute-force prevention
- Email verification before account activation
- Password strength meter
- CAPTCHA for bot prevention


⸻

## Commit 16 - OAuth2 Email Account Connection Documentation

<!-- Nov 24, 2025 -->

git commit -m "docs: Add comprehensive OAuth2 Email Account Connection flow article"

### What I Built

docs: Add comprehensive OAuth2 Email Account Connection flow article

### Overview
Created comprehensive technical article documenting the OAuth2 Authorization Code Flow for securely connecting Microsoft Outlook email accounts with encrypted token storage.

### What Was Built
- **Article**: `Articles/2_OAUTH2_EMAIL_ACCOUNT_CONNECTION_ARTICLE.md`
- **Diagrams**: 4 custom architecture diagrams
  - High-level sequence diagram (OAuth2 flow overview)
  - Frontend architecture diagram (OAuth trigger flow)
  - Backend Part 1 diagram (Authorization URL building)
  - Backend Part 2 diagram (Callback handling)

### Technical Content Covered

**Frontend Architecture:**
- Browser redirection pattern (vs typical API calls)
- JWT token passing via URL parameters
- OAuth callback handling with success/error states
- Auto-redirect UX after OAuth completion
- TypeScript type safety for OAuth responses

**Backend Architecture:**
- OAuth2 Authorization Code Flow implementation
- MSAL (Microsoft Authentication Library) integration
- State parameter generation for CSRF protection
- Token exchange (authorization code → access/refresh tokens)
- Microsoft Graph API integration for user profile

**Security Features:**
- **CSRF Protection**: State parameter with user_id + timestamp + nonce
- **Encryption at Rest**: Fernet symmetric encryption for refresh tokens
- **Token Rotation**: Automatic refresh token updates from Microsoft
- **Scope Minimization**: Only requesting necessary permissions
- **State Expiration**: 10-minute timeout for OAuth state

**Database Design:**
- `EmailAccount` entity with encrypted token storage
- Provider-specific token fields (`ms_refresh_token_encrypted`, `google_refresh_token_encrypted`)
- Access token expiration tracking
- Cascade deletion relationships

**Error Handling:**
- Graceful redirect on all failure paths
- Specific error codes (auth_failed, invalid_state, callback_failed)
- Frontend error display with auto-redirect
- Duplicate account detection

**Key Implementation Details:**
- Refresh token encryption using Fernet (AES-128-CBC)
- Microsoft Graph `/me` endpoint for email address retrieval
- Redirect URI validation
- Environment variable configuration
- Token decryption service for sync operations

### Design Strengths Documented
1. ✅ State parameter validation (CSRF protection)
2. ✅ Error handling with RedirectResponse throughout
3. ✅ HTTPS requirement (OAuth 2.0 spec compliance)
4. ✅ Duplicate account checking before save

### Potential Issues Identified
1. ⚠️ Synchronous HTTP call blocking event loop
2. ⚠️ Access token not stored (requires immediate refresh)
3. ⚠️ State token lifetime not explicitly enforced
4. ⚠️ No retry logic for transient Microsoft Graph failures

### Article Structure
1. **Introduction** - OAuth2 overview and security importance
2. **System Overview** - Three-party interaction (User, Backend, Microsoft)
3. **Part 1: Initiating the Flow** - Frontend trigger and authorization URL
4. **Part 2: Handling the Callback** - State verification and token exchange
5. **Part 3: Secure Storage** - Fernet encryption implementation
6. **Part 4: Frontend Feedback** - Success/error handling
7. **Security Checklist** - Comprehensive security review
8. **Common Pitfalls** - Real-world issues and solutions
9. **Design Strengths & Issues** - Critical analysis
10. **Conclusion** - Foundation for Delta Sync

### Related Code Files
- `webapp/backend/email_accounts/router.py` (OAuth endpoints)
- `webapp/backend/email_accounts/service.py` (Token encryption, MSAL)
- `webapp/backend/entities/email_account.py` (Database model)
- `webapp/frontend/components/accounts/connect-account-button.tsx` (OAuth trigger)
- `webapp/frontend/app/accounts/oauth-callback/page.tsx` (Callback handler)

### Future Improvements Noted
- Implement async httpx for non-blocking Graph API calls
- Store access token with expiration for immediate use (maybe, but not needed)
- Add explicit state timeout enforcement
- Implement retry logic with exponential backoff
- Add OAuth flow monitoring/logging
- Support for Google OAuth (similar pattern)



