# ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
# ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
## SERVICES
## backend/services/email_ingest.py

from sqlalchemy.orm import Session
from entities.email import Email
from typing import Iterable
from dateutil import parser
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


# What's an upsert?
# - Insert if message doesn't exist
# - Update if message already exists

def upsert_email(db: Session, outlook_msg: dict, email_account_id=None) -> Email:
    """
    Insert or update an Email record based on Microsoft Graph message JSON.

    Called during delta sync when a message is new or updated.
    
    Args:
        db: Database session
        outlook_msg: Message data from Microsoft Graph
        email_account_id: Optional UUID of the email account this email belongs to
    """

    message_id = outlook_msg["id"]

    # Lookup existing record
    email = db.query(Email).filter(Email.message_id == message_id).first()

    # Create new record if not found
    if email is None:
        email = Email(message_id=message_id)
        # Link to email account if provided
        if email_account_id:
            email.email_account_id = email_account_id
        db.add(email)

    # -----------------------------
    # Map & normalize fields
    # -----------------------------
    sender = outlook_msg.get("from", {}).get("emailAddress", {}).get("address")
    to = ", ".join(
        [t["emailAddress"]["address"] for t in outlook_msg.get("toRecipients", [])]
    )

    email.author = sender or "unknown"
    email.to = to or ""
    email.subject = outlook_msg.get("subject", "")

    # Ensure received_at is a datetime
    received_dt = outlook_msg.get("received_at")
    if not isinstance(received_dt, datetime):
        received_str = outlook_msg.get("receivedDateTime")
        if received_str:
            received_dt = parser.isoparse(received_str)
        else:
            received_dt = None
    email.received_at = received_dt

    # Text fallback logic
    email.email_thread_text = outlook_msg.get("bodyPreview", "")

    # Full HTML
    email.email_thread_html = outlook_msg.get("body", {}).get("content", "")

    # Outlook timestamp → stored in created_at (must be datetime)
    created_dt = outlook_msg.get("created_at") or outlook_msg.get("receivedDateTime")
    if not isinstance(created_dt, datetime) and created_dt:
        created_dt = parser.isoparse(created_dt)
    email.created_at = created_dt

    return email


def delete_email(db: Session, message_id: str, soft_delete: bool = False) -> bool:
    """
    Delete a single email by message_id.

    Behavior:
      - If soft_delete=True AND the Email model has an `is_deleted` attribute,
        sets `is_deleted=True` and returns True.
      - Otherwise performs a hard delete.

    Returns:
        True if a row was changed/deleted, False if no matching email found.
    """
    email = db.query(Email).filter(Email.message_id == message_id).first()
    if not email:
        logger.debug("delete_email: no email found for message_id=%s", message_id)
        return False

    if soft_delete and hasattr(Email, "is_deleted"):
        email.is_deleted = True
        db.add(email)
        logger.info("Soft-deleted email message_id=%s (id=%s)", message_id, email.id)
        return True

    db.query(Email).filter(Email.message_id == message_id).delete(synchronize_session=False)
    logger.info("Hard-deleted email message_id=%s", message_id)
    return True



# Performance difference:
# - 100 messages deleted individually: ~5 seconds
# - Bulk delete: ~50 milliseconds

def bulk_delete_by_ids(db: Session, message_ids: Iterable[str], soft_delete: bool = False) -> int:
    """
    Efficiently delete many emails at once.

    - If soft_delete=True and model supports `is_deleted`, performs a single UPDATE.
    - Otherwise performs a single bulk DELETE.

    Returns:
        Number of rows affected (int).
    """
    ids = list(set(message_ids))
    if not ids:
        return 0

    if soft_delete and hasattr(Email, "is_deleted"):
        updated_count = db.query(Email).filter(Email.message_id.in_(ids)).update(
            {Email.is_deleted: True}, synchronize_session=False
        )
        logger.info("Soft-deleted %d emails (bulk).", updated_count)
        return updated_count

    deleted_count = db.query(Email).filter(Email.message_id.in_(ids)).delete(synchronize_session=False)
    logger.info("Hard-deleted %d emails (bulk).", deleted_count)
    return deleted_count

# ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
# ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
