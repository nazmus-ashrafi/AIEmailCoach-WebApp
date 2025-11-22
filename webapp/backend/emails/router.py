'''
Router (API Layer)
- What endpoints clients call and how they behave

'''

from typing import Annotated
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import inspect
from db.database import get_db, engine, Base

from entities.email import Email, EmailClassification # SQLAlchemy model
from emails.schemas import EmailResponse, EmailClassificationResponse  # Pydantic Schema

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

# ---
from webapp.backend.core.outlook import OutlookClient
from webapp.backend.emails.service import upsert_email, bulk_delete_by_ids
from webapp.backend.entities.delta_token import DeltaToken

# ---
from dateutil import parser

# Auth imports
from auth.service import get_current_user
from auth import schemas

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
    emails =  db.query(Email).order_by(Email.created_at.desc()).all()
    ## Order by created_at in descending order (newest first)

    ## Fetch from Mock Emails -- DEPRECATED
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
        # "email_thread": email.email_thread
        "email_thread": email.email_thread_text
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


# ⚠️ Important Note: The old "Sync Outlook" button in the emails page won't work now. This is expected - it needs to be refactored to:

# Accept an email_account_id parameter
# Use the refresh token from the EmailAccount table
# Create DeltaToken with proper email_account_id
# The new OAuth2 flow you just implemented is the correct way forward. Once you connect an account via /accounts, we can update the sync logic to use that.

# Try it now:

# Refresh the accounts page
# You should see the "Connect Outlook Account" button
# Click it to test the OAuth2 flow!

# -----------------------------------------------------------------------------------------------------------------------


# ### Old "/sync_outlook" before Delta Sync
# @router.post("/sync_outlook")
# async def sync_outlook(db: Session = Depends(get_db)):
#     """
#     Sync emails from Outlook → DB.
#     Steps:
#       1. Instantiate OutlookClient
#       2. Fetch messages from Microsoft Graph
#       3. Transform to Email model
#       4. Deduplicate by message_id
#       5. Save new messages
#     """
#     # --------------------------------------------------------
#     # 1. Load credentials
#     # --------------------------------------------------------
#     # 1. Create client from .env
#     ##  Pulling the credentials needed for Microsoft Graph OAuth
#     APPLICATION_ID = os.getenv("APPLICATION_ID")
#     CLIENT_SECRET = os.getenv("CLIENT_SECRET")
#     TENANT_ID = os.getenv("TENANT_ID")
#     REDIRECT_URI = os.getenv("REDIRECT_URI") or "http://localhost:8000"
#     SCOPES = ["User.Read", "Mail.ReadWrite", "Mail.Send"]

#     if not APPLICATION_ID or not CLIENT_SECRET:
#         raise HTTPException(status_code=500, detail="Outlook client credentials missing in environment variables")

#     # --------------------------------------------------------
#     # 2. Create Outlook client
#     # --------------------------------------------------------
#     ## Instantiating the OutlookClient
#     client = OutlookClient(
#         client_id=APPLICATION_ID,
#         client_secret=CLIENT_SECRET,
#         scopes=SCOPES,
#         redirect_uri=REDIRECT_URI,
#         tenant_id=TENANT_ID,
#     )
#      # --------------------------------------------------------
#     # 3. Fetch messages (threadpool because client is sync)
#     # --------------------------------------------------------
#     # Fetch messages (using threadpool because OutlookClient is sync)
#     def fetch_all(): 
#         return list(client.fetch_messages(
#             top=25,
#             select=["id", "subject", "from", "toRecipients", "bodyPreview", "body", "receivedDateTime"],
#             folder="Inbox"
#         ))
    
#     try:
#         messages = await run_in_threadpool(fetch_all)
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

#     created = 0
#     skipped = 0

#     # --------------------------------------------------------
#     # 4. Process each message
#     # --------------------------------------------------------
#     # Iterate & store to DB
#     for msg in messages:
#         record = transform_graph_message_to_email_record(msg)
#         message_id = record["message_id"]

#         # Dedupe by message_id. Prevents inserting the same Outlook email twice
#         existing = db.query(Email).filter(Email.message_id == message_id).first()
#         if existing:
#             skipped += 1
#             continue

#         # Convert Outlook fields → my Email model schema
#         # new_email = Email(
#         #     message_id=record["message_id"],
#         #     author=record["from_address"] or "Unknown",
#         #     to=", ".join([r.get("address", "") for r in json.loads(record["to_recipients"] or "[]")]),
#         #     subject=record["subject"] or "(No subject)",
#         #     email_thread=record["body_content"] or record["body_preview"] or "",
#         # )

#         # Parse Outlook received timestamp
#         received_str = record.get("received_datetime")  # depends on your transform fn
#         try:
#             from dateutil import parser
#             received_dt = parser.isoparse(received_str) if received_str else None
#         except Exception:
#             received_dt = None

#         new_email = Email(
#             message_id=record["message_id"],
#             author=record["from_address"] or "Unknown",
#             to=", ".join([r.get("address", "") for r in json.loads(record["to_recipients"] or "[]")]),
#             subject=record["subject"] or "(No subject)",
#             email_thread_text=record["body_text"],
#             email_thread_html=record["body_html"],
#             created_at=received_dt,  # ⬅ IMPORTANT: real Outlook timestamp

#         )

#         db.add(new_email)
#         created += 1

#     db.commit()

#     # 4. Return ingest summary
#     return {
#         "status": "success",
#         "outlook_messages_fetched": len(messages),
#         "created_in_db": created,
#         "skipped_existing": skipped,
#     }


# -----------------------------------------------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------------------------------------

# ⚠️ Important Note: The old "Sync Outlook" button in the emails page won't work now. This is expected - it needs to be refactored to:

# Accept an email_account_id parameter
# Use the refresh token from the EmailAccount table
# Create DeltaToken with proper email_account_id
# The new OAuth2 flow you just implemented is the correct way forward. Once you connect an account via /accounts, we can update the sync logic to use that.

# Try it now:

# Refresh the accounts page
# You should see the "Connect Outlook Account" button
# Click it to test the OAuth2 flow!

# -----------------------------------------------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------------------------------------

### "sync_outlook.py" (Delta Sync Version) - without account

# @router.post("/sync_outlook")
# async def sync_outlook(db: Session = Depends(get_db)):
#     """
#     Fast, minimal, production-ready Outlook → DB delta sync.

#     Behavior:
#       • On first run: downloads full Inbox once
#       • On later runs: only changes (added/updated/deleted)
#       • Deleted messages removed from DB
#       • Upserts new + updated messages
#       • Delta token stored automatically after each sync
#     """

#     # 1️ Load MS Graph OAuth credentials
#     APPLICATION_ID = os.getenv("APPLICATION_ID")
#     CLIENT_SECRET = os.getenv("CLIENT_SECRET")

#     # tenant_id
#     # None or "common" → Personal Microsoft accounts (Outlook.com, Live.com)
#     # Specific tenant ID → Organization/work accounts
#     TENANT_ID = os.getenv("TENANT_ID") # consumer
#     REDIRECT_URI = os.getenv("REDIRECT_URI") or "http://localhost:8000"

#     # Scopes define permissions:
#     #     User.Read - Access user profile
#     #     Mail.ReadWrite - Read/modify emails
#     #     Mail.Send - Send emails (for replies)
#     SCOPES = ["User.Read", "Mail.ReadWrite", "Mail.Send"]

#     if not APPLICATION_ID or not CLIENT_SECRET:
#         raise HTTPException(500, "Missing Outlook OAuth env vars")

#     # 2️ Outlook client initialization
#         # - Creates MSAL (Microsoft Authentication Library) client
#         # - Configures OAuth authority: `https://login.microsoftonline.com/{tenant_id}`
#         # - Points to stored refresh token: `.tokens/ms_refresh_token.txt`
#     client = OutlookClient(
#         client_id=APPLICATION_ID,
#         client_secret=CLIENT_SECRET,
#         scopes=SCOPES,
#         redirect_uri=REDIRECT_URI, 
#         tenant_id=TENANT_ID,
#     )

#     # 3️ Load delta token (create on first run)
#     ## Delta Token is a checkpoint URL from Microsoft Graph
#     ## Example: https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta?$skiptoken=abc123xyz
#     token_row = db.query(DeltaToken).filter(DeltaToken.folder == "inbox").first()
#     if token_row is None:
#         token_row = DeltaToken(folder="inbox", delta_token=None)
#         db.add(token_row)
#         db.commit()
#         db.refresh(token_row)

#     # 4️ Run delta sync (threadpool because OutlookClient is sync, but FastAPI route is async)
#     def run_delta():
#         return client.delta_messages(folder="Inbox", delta_token=token_row.delta_token)

#     try:
#         ## run_in_threadpool() prevents blocking the FastAPI's async event loop
#         ## Allows other requests to be processed during sync
#         changes, new_delta = await run_in_threadpool(run_delta)

#         # ## Example return by run_delta
#         # changes = [
#         #     {"id": "msg1", "subject": "Welcome", "receivedDateTime": "2025-01-01T10:00:00Z"},
#         #     {"id": "msg2", "subject": "Invoice", "receivedDateTime": "2025-01-02T11:00:00Z"},
#         #     # ... all 500 emails in Inbox
#         # ]
#     except Exception as e:
#         raise HTTPException(500, f"Delta sync failed: {e}")

#     inserted = 0
#     updated = 0
#     deleted_ids = []

#     # 5️ Apply delta changes to DB
#     for item in changes:

#         # --- A. Deleted messages ---
#         if "@removed" in item:
#             deleted_ids.append(item["id"])
#             continue

#         # --- B. Convert date string → datetime ---
#         ## Database expects Python datetime objects
#         ## Graph API datetime format:  "receivedDateTime": "2025-11-19T14:30:00Z"
#         ## After parsisng: item["received_at"] = datetime(2025, 11, 19, 14, 30, 0, tzinfo=timezone.utc)
#         received_str = item.get("receivedDateTime")
#         received_dt = parser.isoparse(received_str) if received_str else None
#         item["received_at"] = received_dt  # For upsert_email

#         # --- C. Upsert new/updated messages ---
#         existing = db.query(Email).filter(Email.message_id == item["id"]).first()
#         if existing:
#             updated += 1
#         else:
#             inserted += 1

#         upsert_email(db, item)  # Handles both insert & update
#         ## Upsert inserts the updated value if the if already exists in the table

#     # Bulk delete deleted messages
#     deleted = bulk_delete_by_ids(db, deleted_ids) if deleted_ids else 0

#     # 6️ Persist new delta token
#     if new_delta:
#         token_row.delta_token = new_delta

#     # 7️ Commit DB changes once (Atomic Commit)
#     # What gets committed?
#         # New/updated Email records (from upsert_email())
#         # Deleted Email records (from bulk_delete_by_ids())
#         # Updated DeltaToken (new checkpoint)
#     # Why single commit at the end?
#         # Atomicity: All changes succeed or all fail
#         # Performance: One disk write vs. hundreds
#     db.commit()

#     # 8️ Return result (Statistics)
#     return {
#         "status": "ok",
#         "inserted": inserted,
#         "updated": updated,
#         "deleted": deleted,
#         "new_delta_token_saved": bool(new_delta),
#     }


# -----------------------------------------------------------------------------------------------------------------------
# NEW ACCOUNT-BASED SYNC ENDPOINT
# -----------------------------------------------------------------------------------------------------------------------

@router.post("/sync_outlook/{account_id}")
async def sync_outlook(
    account_id: str,
    current_user: Annotated[schemas.TokenData, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Sync emails from a specific Outlook account using delta sync.
    
    This endpoint:
    - Uses the stored encrypted refresh token for the account
    - Performs incremental delta sync (only fetches changes)
    - Links all synced emails to the email_account_id
    - Stores delta token per account for efficient syncing
    
    Args:
        account_id: UUID of the email account to sync
        current_user: Authenticated user (from JWT)
        db: Database session
    
    Returns:
        Sync statistics (inserted, updated, deleted counts)
    """
    from uuid import UUID
    from datetime import datetime, timezone, timedelta
    from entities.email_account import ProviderEnum
    from email_accounts.service import get_email_account, get_decrypted_refresh_token, refresh_access_token, encrypt_token
    
    # Convert account_id to UUID
    try:
        account_uuid = UUID(account_id)
    except ValueError:
        raise HTTPException(400, "Invalid account_id format")
    
    # 1. Get and verify email account
    account = get_email_account(db, account_uuid, current_user.get_uuid())
    if not account:
        raise HTTPException(404, "Email account not found")
    if account.provider != ProviderEnum.outlook:
        raise HTTPException(400, "Only Outlook accounts supported")
    
    # 2. Get decrypted refresh token
    refresh_token = get_decrypted_refresh_token(account)
    if not refresh_token:
        raise HTTPException(400, "No refresh token found for this account")
    
    # 3. Get fresh access token (always refresh to be safe)
    # Note: We always refresh because it's safer and Microsoft handles caching
    access_token, new_refresh_token, new_expires_at = refresh_access_token(
        account.ms_refresh_token_encrypted
    )
    
    # Update token expiration in database
    account.access_token_expires_at = new_expires_at
    if new_refresh_token:
        # Microsoft returned a new refresh token, update it
            account.ms_refresh_token_encrypted = encrypt_token(new_refresh_token)
    db.commit()
    
    # 4. Load or create delta token for this account
    token_row = db.query(DeltaToken).filter(
        DeltaToken.email_account_id == account_uuid,
        DeltaToken.folder == "inbox"
    ).first()
    
    if token_row is None:
        token_row = DeltaToken(
            email_account_id=account_uuid,  # ✅ Properly linked to account
            folder="inbox",
            delta_token=None
        )
        db.add(token_row)
        db.commit()
        db.refresh(token_row)
    
    # 5. Perform delta sync using Microsoft Graph API directly
    # Since OutlookClient uses file-based tokens, we'll use httpx directly
    import httpx
    
    # Build delta URL
    if token_row.delta_token:
        # Use existing delta token (incremental sync)
        delta_url = token_row.delta_token
    else:
        # First sync - get all messages
        delta_url = "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta"
    
    all_changes = []
    new_delta_link = None
    
    try:
        with httpx.Client(timeout=60.0) as client:
            next_url = delta_url
            
            while next_url:
                headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json"
                }
                
                resp = client.get(next_url, headers=headers)
                
                if resp.status_code != 200:
                    raise HTTPException(500, f"Microsoft Graph API error: {resp.text}")
                
                data = resp.json()
                all_changes.extend(data.get("value", []))
                
                # Check for next page or delta link
                next_url = data.get("@odata.nextLink")
                
                if data.get("@odata.deltaLink"):
                    new_delta_link = data["@odata.deltaLink"]
                    break
    except Exception as e:
        raise HTTPException(500, f"Delta sync failed: {str(e)}")
    
    # 6. Process changes
    inserted = 0
    updated = 0
    deleted_ids = []
    
    for item in all_changes:
        # Handle deleted messages
        if "@removed" in item:
            deleted_ids.append(item["id"])
            continue
        
        # Parse received datetime
        received_str = item.get("receivedDateTime")
        received_dt = parser.isoparse(received_str) if received_str else None
        item["received_at"] = received_dt
        
        # Check if email exists
        existing = db.query(Email).filter(Email.message_id == item["id"]).first()
        if existing:
            updated += 1
        else:
            inserted += 1
        
        # Upsert with email_account_id
        upsert_email(db, item, email_account_id=account_uuid)
    
    # 7. Bulk delete removed emails
    deleted = bulk_delete_by_ids(db, deleted_ids) if deleted_ids else 0
    
    # 8. Update delta token
    if new_delta_link:
        token_row.delta_token = new_delta_link
    
    # 9. Commit all changes atomically
    db.commit()
    
    # 10. Return statistics
    return {
        "status": "ok",
        "account_id": str(account_uuid),
        "email_address": account.email_address,
        "inserted": inserted,
        "updated": updated,
        "deleted": deleted,
        "new_delta_token_saved": bool(new_delta_link),
    }