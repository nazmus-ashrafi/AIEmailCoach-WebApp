"""
Email Accounts Schemas

Pydantic models for email account management and OAuth2 flow.
"""

from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List
from uuid import UUID


class EmailAccountResponse(BaseModel):
    """User-facing email account information (no sensitive tokens)"""
    id: UUID
    provider: str  # "outlook", "google", "imap"
    email_address: str
    created_at: datetime
    access_token_expires_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class EmailAccountList(BaseModel):
    """List of user's email accounts"""
    accounts: List[EmailAccountResponse]


class EmailAccountCreate(BaseModel):
    """Manual email account creation (for IMAP)"""
    provider: str = Field(..., pattern="^(outlook|google|imap)$")
    email_address: EmailStr
    # For IMAP only
    imap_server: Optional[str] = None
    imap_port: Optional[int] = None
    imap_username: Optional[str] = None
    imap_password: Optional[str] = None


class OAuthStateData(BaseModel):
    """Data stored in OAuth state parameter"""
    user_id: UUID
    timestamp: datetime
    nonce: str


class OAuthCallbackParams(BaseModel):
    """OAuth callback query parameters"""
    code: Optional[str] = None
    state: Optional[str] = None
    error: Optional[str] = None
    error_description: Optional[str] = None
