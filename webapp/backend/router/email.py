'''
Router (API Layer)
- What endpoints clients call and how they behave

'''

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import inspect
from db.database import get_db, engine, Base

from models.email import Email, EmailClassification # SQLAlchemy model
from schemas.email import EmailResponse, EmailClassificationResponse  # Pydantic schema

from email_mock import MOCK_EMAILS
import os
import json

from dotenv import load_dotenv
# Load environment variables
load_dotenv()
import sys
# Add the project root to Python path only if src is not already importable
try:
    import src
except ImportError:
    project_root = os.getenv('PROJECT_ROOT')
    if project_root and project_root not in sys.path:
        sys.path.insert(0, project_root)

from src.ai_email_coach.state import State
from src.ai_email_coach.graph import graph  # LangGraph graph


from fastapi.concurrency import run_in_threadpool
from core.outlook import OutlookClient, transform_graph_message_to_email_record
from dotenv import load_dotenv



router = APIRouter(prefix="/emails", tags=["Emails"])

# 1. When the first time /emails/ is hit:
# 	•	SQLAlchemy checks if the table exists → creates it if not.
# 	•	Checks if the table has data → populates it from MOCK_EMAILS if empty.
# 2. Returns all emails from the database.
# 3. Subsequent calls just query the database.
@router.get("/", response_model=list[EmailResponse])
def list_emails(db: Session = Depends(get_db)):
    """
    - (X) Lazily create the emails table (Removed (see 1), tables now create at app startup in main (see ensure_tables_exist()))
    - Checks if table exists and populate it with mock emails
    if it is empty.
    """
    # inspector = inspect(engine)

    # # 1️. Create tables if they don't exist
    # if "emails" not in inspector.get_table_names():
    #     Base.metadata.create_all(bind=engine)

    # 2️. Check if table already has data
    emails = db.query(Email).all()

    ## Fetch from Mock Emails --
    # if not emails:
    #     # Populate the table with mock emails
    #     for item in MOCK_EMAILS:
    #         email = Email(
    #             author=item["author"],
    #             to=item["to"],
    #             subject=item["subject"],
    #             email_thread=item["email_thread"]
    #         )
    #         db.add(email)
    #     db.commit()
    #     emails = db.query(Email).all()

    return emails


# -----------------------------------------------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------------------------------------


# @router.get("/{email_id}")
# def get_email(email_id: int):
#     email = next((e for e in MOCK_EMAILS if e["id"] == email_id), None)
#     if not email:
#         raise HTTPException(status_code=404, detail="Email not found")
#     return email

@router.get("/{email_id}", response_model=EmailResponse)
def get_email(email_id: int, db: Session = Depends(get_db)):
    email = db.query(Email).filter(Email.id == email_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    return email


# -----------------------------------------------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------------------------------------



@router.post("/classify_email", response_model=EmailClassificationResponse)
async def classify_email(email_id: int, db: Session = Depends(get_db)):
    # 1️. Fetch the email from the database
    email = db.query(Email).filter(Email.id == email_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    
    # 2️. Check if this email already has a classification (avoid duplicates)
    existing_classification = (
        db.query(EmailClassification)
        .filter(EmailClassification.email_id == email_id)
        .first()
    )
    if existing_classification:
        ## idempotent (it doesn’t recompute if a classification already exists)
        print("Found old classification, returning it")
        return EmailClassificationResponse(
            email_id=email.id,
            classification=existing_classification.classification,
            reasoning=existing_classification.reasoning,
            ai_draft=existing_classification.ai_draft
        )

    # 3️. Build initial state for LangGraph
    state_input = State(email_input={
        "author": email.author,
        "to": email.to,
        "subject": email.subject,
        "email_thread": email.email_thread
    })

    # 4️. Call the LLM graph
    try:
        result = await graph.ainvoke(state_input, config={})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")

    # 5️. Extract classification and reasoning from graph result
    classification = result.get("classification_decision", "")
    reasoning = result.get("reasoning", "")
    ai_draft = result.get("ai_draft", "")


    # 6. Persist the classification result
    new_classification = EmailClassification(
        email_id=email.id,
        classification=classification,
        reasoning=reasoning,
        ai_draft=ai_draft
    )
    db.add(new_classification)
    db.commit()
    db.refresh(new_classification)
    print("Stored newly classified email, with reasoning and ai draft")


    ## Returning classification_decision and reasoning, in memory as JSON
    ## Without loading these results in the table (see 6), the system recomputes the result and loses the previous output after the request ends
    return EmailClassificationResponse(
        email_id=email.id,
        classification=classification,
        reasoning=reasoning,
        ai_draft=ai_draft
    )


# -----------------------------------------------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------------------------------------


@router.post("/{email_id}/generate_draft", response_model=EmailClassificationResponse)
async def generate_draft(
    email_id: int,
    force: bool = Query(False, description="Force regenerate the AI draft even if it exists"),
    db: Session = Depends(get_db)
):
    """
    Generate an AI draft for the given email.
    - If a draft already exists (and force=False), return it immediately.
    - If force=True, re-invoke the LangGraph and update the stored draft.
    """

    # 1. Fetch email from DB
    email = db.query(Email).filter(Email.id == email_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")

    # 2. Check if a classification already exists
    existing_classification = (
        db.query(EmailClassification)
        .filter(EmailClassification.email_id == email_id)
        .first()
    )

    # 3. If draft already exists and not forcing regeneration, return it
    if existing_classification and existing_classification.ai_draft and not force:
        print("Existing draft found, returning cached draft.")
        return EmailClassificationResponse(
            email_id=email.id,
            classification=existing_classification.classification,
            reasoning=existing_classification.reasoning,
            ai_draft=existing_classification.ai_draft
        )

    # 4. Build initial LangGraph state
    state_input = State(email_input={
        "author": email.author,
        "to": email.to,
        "subject": email.subject,
        "email_thread": email.email_thread
    })

    # 5. Call the LLM graph to generate a draft (and classification if needed)
    try:
        result = await graph.ainvoke(state_input, config={})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Draft generation failed: {str(e)}")

    # 6. Extract outputs
    classification = result.get("classification_decision", "")
    reasoning = result.get("reasoning", "")
    ai_draft = result.get("ai_draft", "")

    # 7. Update or create classification record
    if existing_classification:
        existing_classification.classification = classification or existing_classification.classification
        existing_classification.reasoning = reasoning or existing_classification.reasoning
        existing_classification.ai_draft = ai_draft
    else:
        new_classification = EmailClassification(
            email_id=email.id,
            classification=classification,
            reasoning=reasoning,
            ai_draft=ai_draft,
        )
        db.add(new_classification)

    db.commit()

    # 8. Return the response
    return EmailClassificationResponse(
        email_id=email.id,
        classification=classification,
        reasoning=reasoning,
        ai_draft=ai_draft,
    )


# -----------------------------------------------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------------------------------------


@router.post("/sync_outlook")
async def sync_outlook(db: Session = Depends(get_db)):
    """
    Sync emails from Outlook → DB.
    Steps:
      1. Instantiate OutlookClient
      2. Fetch messages from Microsoft Graph
      3. Transform to Email model
      4. Deduplicate by message_id
      5. Save new messages
    """

    # 1. Create client from .env
    APPLICATION_ID = os.getenv("APPLICATION_ID")
    CLIENT_SECRET = os.getenv("CLIENT_SECRET")
    TENANT_ID = os.getenv("TENANT_ID")
    REDIRECT_URI = os.getenv("REDIRECT_URI") or "http://localhost:8000"
    SCOPES = ["User.Read", "Mail.ReadWrite", "Mail.Send"]

    if not APPLICATION_ID or not CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Outlook client credentials missing in environment variables")

    client = OutlookClient(
        client_id=APPLICATION_ID,
        client_secret=CLIENT_SECRET,
        scopes=SCOPES,
        redirect_uri=REDIRECT_URI,
        tenant_id=TENANT_ID,
    )

    # 2. Fetch messages (using threadpool because OutlookClient is sync)
    def fetch_all():
        return list(client.fetch_messages(
            top=25,
            select=["id", "subject", "from", "toRecipients", "bodyPreview", "body", "receivedDateTime"],
            folder="Inbox"
        ))
    
    try:
        messages = await run_in_threadpool(fetch_all)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    created = 0
    skipped = 0

    # 3. Iterate & store to DB
    for msg in messages:
        record = transform_graph_message_to_email_record(msg)
        message_id = record["message_id"]

        # Dedupe by message_id
        existing = db.query(Email).filter(Email.message_id == message_id).first()
        if existing:
            skipped += 1
            continue

        # Convert Outlook fields → my Email model schema
        # new_email = Email(
        #     message_id=record["message_id"],
        #     author=record["from_address"] or "Unknown",
        #     to=", ".join([r.get("address", "") for r in json.loads(record["to_recipients"] or "[]")]),
        #     subject=record["subject"] or "(No subject)",
        #     email_thread=record["body_content"] or record["body_preview"] or "",
        # )

        new_email = Email(
            message_id=record["message_id"],
            author=record["from_address"] or "Unknown",
            to=", ".join([r.get("address", "") for r in json.loads(record["to_recipients"] or "[]")]),
            subject=record["subject"] or "(No subject)",
            email_thread_text=record["body_text"],
            email_thread_html=record["body_html"],
        )

        db.add(new_email)
        created += 1

    db.commit()

    # 4. Return ingest summary
    return {
        "status": "success",
        "outlook_messages_fetched": len(messages),
        "created_in_db": created,
        "skipped_existing": skipped,
    }