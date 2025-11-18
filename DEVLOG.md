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
