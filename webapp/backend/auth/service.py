"""
Authentication service layer - handles business logic for auth operations
"""

from datetime import timedelta, datetime, timezone
from typing import Annotated
from uuid import UUID, uuid4
from fastapi import Depends
from passlib.context import CryptContext
import jwt
from jwt import PyJWTError
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from entities.users import User
from . import schemas
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from exceptions import AuthenticationError, UserAlreadyExistsError
from core.config import settings
import logging

oauth2_bearer = OAuth2PasswordBearer(tokenUrl='api/auth/token')
## Database passwords are stores as bcript hash
bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password"""
    return bcrypt_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a plain password"""
    return bcrypt_context.hash(password)


def authenticate_user(email: str, password: str, db: Session) -> User | bool:
    """
    Authenticate a user by email and password
    Returns User object if successful, False otherwise
    """
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        logging.warning(f"Failed authentication attempt for email: {email}")
        return False
    return user


def create_access_token(email: str, user_id: UUID, expires_delta: timedelta) -> str:
    """Create a JWT access token"""
    encode = {
        'sub': email,
        'id': str(user_id),
        'exp': datetime.now(timezone.utc) + expires_delta
    }
    return jwt.encode(encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_token(token: str) -> schemas.TokenData:
    """
    Verify a JWT token and extract user data
    Raises AuthenticationError if token is invalid
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get('id')
        if user_id is None:
            raise AuthenticationError()
        return schemas.TokenData(user_id=user_id)
    except PyJWTError as e:
        logging.warning(f"Token verification failed: {str(e)}")
        raise AuthenticationError()


def register_user(db: Session, register_user_request: schemas.RegisterUserRequest) -> None:
    """
    Register a new user
    Raises UserAlreadyExistsError if email is already registered
    """
    try:
        create_user_model = User(
            id=uuid4(),
            email=register_user_request.email,
            first_name=register_user_request.first_name,
            last_name=register_user_request.last_name,
            password_hash=get_password_hash(register_user_request.password)
        )    
        db.add(create_user_model)
        db.commit()
        logging.info(f"Successfully registered user: {register_user_request.email}")
    except IntegrityError:
        db.rollback()
        logging.warning(f"Attempted to register existing user: {register_user_request.email}")
        raise UserAlreadyExistsError()
    except Exception as e:
        db.rollback()
        logging.error(f"Failed to register user: {register_user_request.email}. Error: {str(e)}")
        raise


def get_current_user(token: Annotated[str, Depends(oauth2_bearer)]) -> schemas.TokenData:
    """Dependency to get the current authenticated user from token"""
    return verify_token(token)


# Type alias for dependency injection
CurrentUser = Annotated[schemas.TokenData, Depends(get_current_user)]


def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session
) -> schemas.Token:
    """
    Login endpoint - authenticates user and returns access token
    Raises AuthenticationError if credentials are invalid
    """
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise AuthenticationError("Incorrect email or password")
    
    token = create_access_token(
        user.email, 
        user.id, 
        timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return schemas.Token(access_token=token, token_type='bearer')
