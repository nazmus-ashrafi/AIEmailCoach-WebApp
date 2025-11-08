
from fastapi import APIRouter
from email_mock import MOCK_EMAILS


## backend URL/api/emails/...
router = APIRouter(prefix="/emails", tags=["Emails"])

@router.get("/")
async def list_emails():
    return MOCK_EMAILS
