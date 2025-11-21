"""
User service layer - handles business logic for user operations
"""

from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from entities.users import User
from . import schemas
from exceptions import AuthenticationError, UserAlreadyExistsError
from auth.service import verify_password, get_password_hash
from datetime import datetime, timezone
import logging


def get_user_by_id(db: Session, user_id: UUID) -> User | None:
    """Get user by ID"""
    user =  db.query(User).filter(User.id == user_id).first()
    if not user:
        logging.warning(f"User not found with ID: {user_id}")
        raise UserNotFoundError(user_id)
    logging.info(f"Successfully retrieved user with ID: {user_id}")
    
    return user


def update_user_profile(
    db: Session,
    user_id: UUID,
    update_data: schemas.UpdateUserRequest
) -> User:
    """
    Update user profile information
    Returns updated User object
    Raises UserAlreadyExistsError if email is already taken
    """
    user = get_user_by_id(db, user_id)
    if not user:
        raise AuthenticationError("User not found")
    
    try:
        # Only update fields that are provided
        if update_data.first_name is not None:
            user.first_name = update_data.first_name
        if update_data.last_name is not None:
            user.last_name = update_data.last_name
        if update_data.email is not None:
            user.email = update_data.email
        
        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(user)
        
        logging.info(f"Updated profile for user: {user.email}")
        return user
        
    except IntegrityError:
        db.rollback()
        logging.warning(f"Attempted to update user with existing email: {update_data.email}")
        raise UserAlreadyExistsError("Email already in use")
    except Exception as e:
        db.rollback()
        logging.error(f"Failed to update user profile: {str(e)}")
        raise


def change_user_password(
    db: Session,
    user_id: UUID,
    password_data: schemas.ChangePasswordRequest
) -> None:
    """
    Change user password
    Raises AuthenticationError if current password is incorrect or passwords don't match
    """
    user = get_user_by_id(db, user_id)
    if not user:
        raise AuthenticationError("User not found")
    
    # Validate new passwords match
    if not password_data.validate_passwords_match():
        raise AuthenticationError("New passwords do not match")
    
    # Verify current password
    if not verify_password(password_data.current_password, user.password_hash):
        logging.warning(f"Failed password change attempt for user: {user.email}")
        raise AuthenticationError("Current password is incorrect")
    
    try:
        # Update to new password
        user.password_hash = get_password_hash(password_data.new_password)
        user.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        logging.info(f"Password changed for user: {user.email}")
        
    except Exception as e:
        db.rollback()
        logging.error(f"Failed to change password: {str(e)}")
        raise


def delete_user_account(db: Session, user_id: UUID) -> None:
    """
    Delete user account and all associated data
    Cascade deletes will handle EmailAccounts, Emails, etc.
    """
    user = get_user_by_id(db, user_id)
    if not user:
        raise AuthenticationError("User not found")
    
    try:
        email = user.email
        db.delete(user)
        db.commit()
        
        logging.info(f"Deleted user account: {email}")
        
    except Exception as e:
        db.rollback()
        logging.error(f"Failed to delete user account: {str(e)}")
        raise
