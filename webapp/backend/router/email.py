'''
Router (API Layer)
- What endpoints clients call and how they behave

'''

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import inspect
from db.database import get_db, engine, Base

from models.email import Email # SQLAlchemy model
from schemas.email import EmailResponse  # Pydantic schema
from schemas.email import EmailClassificationResponse # Pydantic schema

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


router = APIRouter(prefix="/emails", tags=["Emails"])

# 1. When the first time /emails/ is hit:
# 	•	SQLAlchemy checks if the table exists → creates it if not.
# 	•	Checks if the table has data → populates it from MOCK_EMAILS if empty.
# 2. Returns all emails from the database.
# 3. Subsequent calls just query the database.
@router.get("/", response_model=list[EmailResponse])
def list_emails(db: Session = Depends(get_db)):
    """
    Lazily create the emails table and populate it with mock emails
    if it is empty.
    """
    inspector = inspect(engine)

    # 1️. Create tables if they don't exist
    if "emails" not in inspector.get_table_names():
        Base.metadata.create_all(bind=engine)

    # 2️. Check if table already has data
    emails = db.query(Email).all()
    if not emails:
        # Populate the table with mock emails
        for item in MOCK_EMAILS:
            email = Email(
                author=item["author"],
                to=item["to"],
                subject=item["subject"],
                email_thread=item["email_thread"]
            )
            db.add(email)
        db.commit()
        emails = db.query(Email).all()

    return emails


# -----------------------------------------------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------------------------------------


@router.get("/{email_id}")
def get_email(email_id: int):
    email = next((e for e in MOCK_EMAILS if e["id"] == email_id), None)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    return email


# -----------------------------------------------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------------------------------------


@router.post("/reply")
async def generate_reply(email_id: int):
    # Find the email
    email = next((e for e in MOCK_EMAILS if e["id"] == email_id), None)
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")

    # For MVP: placeholder AI draft
    ai_reply = (
        f"Hi {email['author'].split()[0]},\n\n"
        "Thank you for reaching out. I appreciate your message and will get back to you shortly.\n\n"
        "Best,\nNazmus"
    )

    # Later, call your LangGraph workflow here:
    # result = await graph.ainvoke({"email_input": email})
    # ai_reply = result["draft"]

    return {
        "email_id": email_id,
        "subject": email["subject"],
        "ai_draft": ai_reply,
    }




@router.post("/classify_email", response_model=EmailClassificationResponse)
async def classify_email(email_id: int, db: Session = Depends(get_db)):
    # 1️. Fetch the email from the database
    email = db.query(Email).filter(Email.id == email_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")

    # 2️. Build initial state for LangGraph
    state_input = State(email_input={
        "author": email.author,
        "to": email.to,
        "subject": email.subject,
        "email_thread": email.email_thread
    })

    # 3️. Call the graph
    try:
        result = await graph.ainvoke(state_input, config={})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")

    # 4️. Extract classification and reasoning from graph result
    classification = result.get("classification_decision", "")
    reasoning = result.get("reasoning", "")

    # # Optional: generate placeholder draft if classified as respond
    # ai_draft = None
    # if classification == "respond":
    #     ai_draft = f"Hi {email.author.split()[0]},\n\nThank you for your email. I will get back to you shortly.\n\nBest,\nNazmus"

    # 5️. Optionally: store classification & reasoning in DB (future step)
    # TODO: Add table/model for classification feedback

    return EmailClassificationResponse(
        email_id=email.id,
        classification=classification,
        reasoning=reasoning,
        # ai_draft=ai_draft
    )