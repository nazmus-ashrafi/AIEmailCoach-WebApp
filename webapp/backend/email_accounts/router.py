"""
Email Accounts Router

API endpoints for email account management and OAuth2 flow.
"""

import logging
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from auth.service import CurrentUser
from db.database import get_db
from entities.users import User
from entities.email_account import ProviderEnum
from email_accounts import service
from email_accounts.schemas import (
    EmailAccountResponse,
    EmailAccountList,
    OAuthCallbackParams
)
from core.config import settings


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/email-accounts", tags=["Email Accounts"])


# ============================================================================
# OAuth2 Endpoints
# ============================================================================

@router.get("/oauth/authorize")
async def oauth_authorize(
    token: str = Query(..., description="JWT access token"),
    db: Session = Depends(get_db)
):
    """
    Initiate OAuth2 authorization flow for Microsoft Outlook.
    Redirects user to Microsoft login page.
    
    Accepts JWT token as query parameter since this is a browser redirect.
    """
    try:
        # Verify token and get user
        from auth.service import verify_token
        token_data = verify_token(token)
        user_id = token_data.get_uuid()
        
        logger.info(f"Creating OAuth authorization URL for user: {user_id}")
        
        # Create authorization URL with user_id in state
        auth_url = service.create_authorization_url(user_id)
        
        logger.info(f"Successfully created authorization URL, redirecting...")
        # Redirecting the user to the provider’s authentication URL is required so the user can log in, grant permissions, etc.
        return RedirectResponse(url=auth_url)
    except Exception as e:
        logger.exception(f"Failed to create authorization URL: {e}")
        # Redirect to frontend with error
        error_url = f"{settings.FRONTEND_URL}/accounts/oauth-callback?error=auth_failed"
        return RedirectResponse(url=error_url)


@router.get("/oauth/callback")
async def oauth_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    error_description: str = Query(None),
    db: Session = Depends(get_db)
):
    """
    OAuth2 callback endpoint. Microsoft redirects here after user authorization.
    Exchanges code for tokens and creates email account.
    """
    # Handle OAuth errors
    if error:
        logger.error(f"OAuth error: {error} - {error_description}")
        error_url = f"{settings.FRONTEND_URL}/accounts/oauth-callback?error={error}"
        return RedirectResponse(url=error_url)
    
    if not code or not state:
        error_url = f"{settings.FRONTEND_URL}/accounts/oauth-callback?error=missing_params"
        return RedirectResponse(url=error_url)
    
    try:
        # Verify state and extract user_id
        user_id = service.verify_oauth_state(state)
        if not user_id:
            logger.error("Invalid or expired OAuth state")
            error_url = f"{settings.FRONTEND_URL}/accounts/oauth-callback?error=invalid_state"
            return RedirectResponse(url=error_url)
        
        # Exchange code for tokens
        token_response = service.exchange_code_for_tokens(code)
        
        # Extract email address from token (id_token or userinfo)
        # For now, we'll need to call Microsoft Graph to get email
        import httpx
        access_token = token_response["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}
        
        # Get user profile from Microsoft Graph
        graph_response = httpx.get(
            "https://graph.microsoft.com/v1.0/me",
            headers=headers,
            timeout=10.0
        )
        
        if graph_response.status_code != 200:
            raise RuntimeError("Failed to fetch user profile from Microsoft Graph")
        
        user_profile = graph_response.json()
        email_address = user_profile.get("mail") or user_profile.get("userPrincipalName")
        
        if not email_address:
            raise RuntimeError("Could not determine email address from Microsoft profile")
        
        # Check if account already exists
        existing_accounts = service.get_user_email_accounts(db, user_id)
        for account in existing_accounts:
            if account.email_address.lower() == email_address.lower():
                # Account already connected
                success_url = f"{settings.FRONTEND_URL}/accounts/oauth-callback?success=true&existing=true"
                return RedirectResponse(url=success_url)
        
        # Create email account with encrypted refresh token
        from datetime import datetime, timezone, timedelta
        expires_in = token_response.get("expires_in", 3600)
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        
        service.create_email_account(
            db=db,
            user_id=user_id,
            email_address=email_address,
            provider=ProviderEnum.outlook,
            refresh_token=token_response["refresh_token"],
            access_token_expires_at=expires_at
        )
        
        # Redirect to frontend success page
        success_url = f"{settings.FRONTEND_URL}/accounts/oauth-callback?success=true"
        return RedirectResponse(url=success_url)
        
    except Exception as e:
        logger.exception(f"OAuth callback failed: {e}")
        error_url = f"{settings.FRONTEND_URL}/accounts/oauth-callback?error=callback_failed"
        return RedirectResponse(url=error_url)


# ============================================================================
# Email Account Management
# ============================================================================

@router.get("/", response_model=EmailAccountList)
async def list_email_accounts(
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    """
    Get all email accounts for the current user.
    """
    accounts = service.get_user_email_accounts(db, current_user.get_uuid())
    return EmailAccountList(
        accounts=[EmailAccountResponse.model_validate(acc) for acc in accounts]
    )


@router.delete("/{account_id}")
async def delete_email_account(
    account_id: UUID,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    """
    Delete an email account (cascade deletes all associated emails).
    """
    deleted = service.delete_email_account(db, account_id, current_user.get_uuid())
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Email account not found")
    
    return {"message": "Email account deleted successfully"}


@router.post("/{account_id}/sync")
async def sync_email_account(
    account_id: UUID,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    """
    Trigger email sync for a specific account.
    (Placeholder - actual sync logic to be implemented)
    """
    account = service.get_email_account(db, account_id, current_user.get_uuid())
    
    if not account:
        raise HTTPException(status_code=404, detail="Email account not found")
    
    # TODO: Implement actual sync logic
    # For now, just return success
    return {
        "message": "Sync initiated",
        "account_id": str(account_id),
        "email_address": account.email_address
    }
