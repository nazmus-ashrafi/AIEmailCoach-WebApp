"""
Pydantic schemas for user operations
"""

from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, EmailStr


## Response model when getting user info
## This is the data the user will be able to retrieve when they log in
class UserResponse(BaseModel):
    """User profile information"""
    id: UUID
    email: EmailStr
    first_name: str
    last_name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True  # Allows creating from ORM models


## Request model for updating user profile
class UpdateUserRequest(BaseModel):
    """Update user profile fields"""
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None


## Request model for changing password
class ChangePasswordRequest(BaseModel):
    """Change user password"""
    current_password: str
    new_password: str
    new_password_confirm: str

    def validate_passwords_match(self) -> bool:
        """Validate that new passwords match"""
        return self.new_password == self.new_password_confirm
