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

git commit -m "feat[Frontend]: add email classification island with spinner, reasoning, and color-coded result"

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
