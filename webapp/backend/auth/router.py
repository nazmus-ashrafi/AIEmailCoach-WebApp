"""
Authentication router - API endpoints for auth operations
"""

from typing import Annotated
from fastapi import APIRouter, Depends
from starlette import status
from . import schemas
from . import service
from fastapi.security import OAuth2PasswordRequestForm
from db.database import get_db
from sqlalchemy.orm import Session

# Type alias for database session dependency
DbSession = Annotated[Session, Depends(get_db)]

router = APIRouter(
    prefix='/auth',
    tags=['auth']
)


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(
    db: DbSession,
    register_user_request: schemas.RegisterUserRequest
):
    """
    Register a new user
    
    - **email**: Valid email address (must be unique)
    - **first_name**: User's first name
    - **last_name**: User's last name
    - **password**: User's password (will be hashed)
    """
    service.register_user(db, register_user_request)
    return {"message": "User registered successfully"}


@router.post("/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: DbSession
):
    """
    Login to get access token
    
    OAuth2 compatible token login, use username/password to get a JWT token
    - **username**: User's email address
    - **password**: User's password
    
    Returns a bearer token for authentication
    """
    return service.login_for_access_token(form_data, db)


@router.get("/me")
async def get_current_user_info(
    current_user: service.CurrentUser,
    db: DbSession
):
    """
    Get current authenticated user information
    
    Requires valid JWT token in Authorization header
    """
    from entities.users import User
    from exceptions import AuthenticationError
    
    user = db.query(User).filter(User.id == current_user.get_uuid()).first()
    if not user:
        raise AuthenticationError("User not found")
    
    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "created_at": user.created_at
    }
