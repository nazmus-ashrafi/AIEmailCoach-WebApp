"""
Email Accounts Service

Business logic for email account management, OAuth2 flow, and token encryption.
"""

import json
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Tuple
from uuid import UUID

import msal
from cryptography.fernet import Fernet
from sqlalchemy.orm import Session

from core.config import settings
from entities.email_account import EmailAccount, ProviderEnum
from email_accounts.schemas import EmailAccountResponse, OAuthStateData


# ============================================================================
# Token Encryption
# ============================================================================

def get_cipher() -> Fernet:
    """Get Fernet cipher for token encryption/decryption"""
    if not settings.TOKEN_ENCRYPTION_KEY:
        raise ValueError("TOKEN_ENCRYPTION_KEY not set in environment")
    return Fernet(settings.TOKEN_ENCRYPTION_KEY.encode())


def encrypt_token(token: str) -> str:
    """Encrypt a refresh token for secure storage"""
    if not token:
        return None
    cipher = get_cipher()
    encrypted = cipher.encrypt(token.encode())
    return encrypted.decode()


def decrypt_token(encrypted_token: str) -> str:
    """Decrypt a stored refresh token"""
    if not encrypted_token:
        return None
    cipher = get_cipher()
    decrypted = cipher.decrypt(encrypted_token.encode())
    return decrypted.decode()


# ============================================================================
# OAuth2 State Management
# ============================================================================

def create_oauth_state(user_id: UUID) -> str:
    """
    Create a secure state parameter for OAuth2 flow.
    Encodes user_id and timestamp for CSRF protection.
    """
    state_data = OAuthStateData(
        user_id=user_id,
        timestamp=datetime.now(timezone.utc),
        nonce=secrets.token_urlsafe(32)
    )
    # Encode as JSON and return
    return json.dumps({
        "user_id": str(state_data.user_id),
        "timestamp": state_data.timestamp.isoformat(),
        "nonce": state_data.nonce
    })


def verify_oauth_state(state: str, max_age_minutes: int = 10) -> Optional[UUID]:
    """
    Verify OAuth2 state parameter and extract user_id.
    Returns user_id if valid, None if invalid/expired.
    """
    try:
        data = json.loads(state)
        user_id = UUID(data["user_id"])
        timestamp = datetime.fromisoformat(data["timestamp"])
        
        # Check if state is expired
        age = datetime.now(timezone.utc) - timestamp
        if age > timedelta(minutes=max_age_minutes):
            return None
            
        return user_id
    except (json.JSONDecodeError, KeyError, ValueError):
        return None


# ============================================================================
# Microsoft OAuth2 Flow
# ============================================================================

def get_msal_app() -> msal.ConfidentialClientApplication:
    """Create MSAL application instance"""
    authority = f"https://login.microsoftonline.com/{settings.MICROSOFT_TENANT_ID}"
    return msal.ConfidentialClientApplication(
        client_id=settings.MICROSOFT_CLIENT_ID,
        client_credential=settings.MICROSOFT_CLIENT_SECRET,
        authority=authority
    )


def create_authorization_url(user_id: UUID) -> str:
    """
    Generate Microsoft OAuth2 authorization URL.
    
    Args:
        user_id: Current user's ID (embedded in state for CSRF protection)
        
    Returns:
        Authorization URL to redirect user to
    """
    app = get_msal_app()
    state = create_oauth_state(user_id)
    
    auth_url = app.get_authorization_request_url(
        scopes=settings.MICROSOFT_SCOPES,
        state=state,
        redirect_uri=settings.MICROSOFT_REDIRECT_URI
    )
    
    return auth_url


def exchange_code_for_tokens(code: str) -> dict:
    """
    Exchange authorization code for access and refresh tokens.
    
    Args:
        code: Authorization code from OAuth callback
        
    Returns:
        Token response dict with access_token, refresh_token, expires_in
        
    Raises:
        RuntimeError: If token exchange fails
    """
    app = get_msal_app()
    
    result = app.acquire_token_by_authorization_code(
        code=code,
        scopes=settings.MICROSOFT_SCOPES,
        redirect_uri=settings.MICROSOFT_REDIRECT_URI
    )
    
    if "access_token" not in result:
        error = result.get("error_description", result.get("error", "Unknown error"))
        raise RuntimeError(f"Failed to acquire tokens: {error}")
    
    return result


def refresh_access_token(encrypted_refresh_token: str) -> Tuple[str, Optional[str], datetime]:
    """
    Refresh an expired access token using refresh token.
    
    Args:
        encrypted_refresh_token: Encrypted refresh token from database
        
    Returns:
        Tuple of (access_token, new_refresh_token, expires_at)
        
    Raises:
        RuntimeError: If token refresh fails
    """
    refresh_token = decrypt_token(encrypted_refresh_token)
    app = get_msal_app()
    
    result = app.acquire_token_by_refresh_token(
        refresh_token=refresh_token,
        scopes=settings.MICROSOFT_SCOPES
    )
    
    if "access_token" not in result:
        error = result.get("error_description", result.get("error", "Unknown error"))
        raise RuntimeError(f"Failed to refresh token: {error}")
    
    access_token = result["access_token"]
    new_refresh_token = result.get("refresh_token")  # May return new refresh token
    expires_in = result.get("expires_in", 3600)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    
    return access_token, new_refresh_token, expires_at


# ============================================================================
# Email Account CRUD
# ============================================================================

def create_email_account(
    db: Session,
    user_id: UUID,
    email_address: str,
    provider: ProviderEnum,
    refresh_token: str,
    access_token_expires_at: Optional[datetime] = None
) -> EmailAccount:
    """
    Create a new email account with encrypted refresh token.
    
    Args:
        db: Database session
        user_id: Owner user ID
        email_address: Email address
        provider: Email provider (outlook, google, imap)
        refresh_token: Refresh token to encrypt and store
        access_token_expires_at: When access token expires
        
    Returns:
        Created EmailAccount instance
    """
    # Encrypt refresh token
    encrypted_token = encrypt_token(refresh_token)
    
    # Determine which field to use based on provider
    token_field = {}
    if provider == ProviderEnum.outlook:
        token_field["ms_refresh_token_encrypted"] = encrypted_token
    elif provider == ProviderEnum.google:
        token_field["google_refresh_token_encrypted"] = encrypted_token
    
    # Create account
    account = EmailAccount(
        user_id=user_id,
        email_address=email_address,
        provider=provider,
        access_token_expires_at=access_token_expires_at,
        **token_field
    )
    
    db.add(account)
    db.commit()
    db.refresh(account)
    
    return account


def get_user_email_accounts(db: Session, user_id: UUID) -> List[EmailAccount]:
    """Get all email accounts for a user"""
    return db.query(EmailAccount).filter(EmailAccount.user_id == user_id).all()


def get_email_account(db: Session, account_id: UUID, user_id: UUID) -> Optional[EmailAccount]:
    """Get a specific email account (with ownership check)"""
    return db.query(EmailAccount).filter(
        EmailAccount.id == account_id,
        EmailAccount.user_id == user_id
    ).first()


def delete_email_account(db: Session, account_id: UUID, user_id: UUID) -> bool:
    """
    Delete an email account (cascade deletes emails).
    
    Returns:
        True if deleted, False if not found
    """
    account = get_email_account(db, account_id, user_id)
    if not account:
        return False
    
    db.delete(account)
    db.commit()
    return True


def get_decrypted_refresh_token(account: EmailAccount) -> Optional[str]:
    """Get decrypted refresh token for an account"""
    if account.provider == ProviderEnum.outlook:
        return decrypt_token(account.ms_refresh_token_encrypted) if account.ms_refresh_token_encrypted else None
    elif account.provider == ProviderEnum.google:
        return decrypt_token(account.google_refresh_token_encrypted) if account.google_refresh_token_encrypted else None
    return None
