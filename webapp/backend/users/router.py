"""
User router - API endpoints for user management operations
"""

from typing import Annotated
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from . import schemas
from . import service
from auth.service import CurrentUser
from db.database import get_db

# Type alias for database session dependency
DbSession = Annotated[Session, Depends(get_db)]

router = APIRouter(
    prefix='/users',
    tags=['users']
)


@router.get("/me", response_model=schemas.UserResponse)
async def get_current_user_profile(
    current_user: CurrentUser,
    db: DbSession
):
    """
    Get current authenticated user's profile
    
    Requires valid JWT token in Authorization header
    """
    user = service.get_user_by_id(db, current_user.get_uuid())
    if not user:
        from exceptions import AuthenticationError
        raise AuthenticationError("User not found")
    
    return user


@router.put("/me", response_model=schemas.UserResponse)
async def update_current_user_profile(
    update_data: schemas.UpdateUserRequest,
    current_user: CurrentUser,
    db: DbSession
):
    """
    Update current user's profile
    
    - **first_name**: Optional - Update first name
    - **last_name**: Optional - Update last name
    - **email**: Optional - Update email (must be unique)
    
    Requires valid JWT token in Authorization header
    """
    user = service.update_user_profile(db, current_user.get_uuid(), update_data)
    return user


@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_current_user_password(
    password_data: schemas.ChangePasswordRequest,
    current_user: CurrentUser,
    db: DbSession
):
    """
    Change current user's password
    
    - **current_password**: Current password for verification
    - **new_password**: New password to set
    
    Requires valid JWT token in Authorization header
    """
    service.change_user_password(db, current_user.get_uuid(), password_data)
    return None


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_user_account(
    current_user: CurrentUser,
    db: DbSession
):
    """
    Delete current user's account
    
    WARNING: This will permanently delete the user account and all associated data:
    - All EmailAccounts
    - All Emails
    - All EmailClassifications
    
    This action cannot be undone.
    
    Requires valid JWT token in Authorization header
    """
    service.delete_user_account(db, current_user.get_uuid())
    return None
