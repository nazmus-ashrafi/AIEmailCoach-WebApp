"""
Pydantic schemas for authentication
"""

from uuid import UUID
from pydantic import BaseModel, EmailStr

## Fields needed to register a user
class RegisterUserRequest(BaseModel):
    """Request model for user registration"""
    email: EmailStr
    first_name: str
    last_name: str
    password: str

## Returns a token back to the user for Authentication
class Token(BaseModel):
    """Response model for login token"""
    access_token: str
    token_type: str ## JWT Bearer token

## Given back to user, once we validate token
class TokenData(BaseModel):
    """Data extracted from JWT token"""

    ## JWT tokens can only store JSON-serializable data (strings, numbers, booleans, arrays, objects). 
    ## UUIDs are not directly JSON-serializable
    user_id: str | None = None

    def get_uuid(self) -> UUID | None:
        """Convert user_id string to UUID"""
        if self.user_id:
            return UUID(self.user_id) ## user_id is converted to UUID
        return None
