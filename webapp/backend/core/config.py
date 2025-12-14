""" This file maps the env variables in a python object,
for purpose of referancing it in our code"""

from typing import List
# pydantic is for python type handling and map data which is not python object into a python object
from pydantic_settings import BaseSettings
from pydantic import field_validator
import os

## -- To Check if .env was detected

from dotenv import load_dotenv

# compute where pydantic will look
env_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env"
)
print("DEBUG: expecting .env here ->", env_path)
print("DEBUG: file exists?", os.path.exists(env_path))

## manually load it to test
load_dotenv(env_path)
# print("DEBUG: OPENAI_API_KEY from manual load ->", os.getenv("OPENAI_API_KEY"))

## -- -- -- -- -- -- -- -- -- -- -- --


class Settings(BaseSettings):
    API_PREFIX: str = "/api"
    DEBUG: bool = False

    DATABASE_URL: str = None
    # DATABASE_URL: Optional[str] = None

    # CORS: Comma-separated list of allowed origins
    # Development: "http://localhost:3000"
    # Production: "http://localhost:3000,https://your-app.vercel.app"
    ALLOWED_ORIGINS: str = ""

    OPENAI_API_KEY: str
    
    # JWT Authentication settings
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Microsoft OAuth2 Settings
    MICROSOFT_CLIENT_ID: str = os.getenv("APPLICATION_ID")
    MICROSOFT_CLIENT_SECRET: str = os.getenv("CLIENT_SECRET")
    MICROSOFT_REDIRECT_URI: str = os.getenv("REDIRECT_URI", "http://localhost:8000/api/email-accounts/oauth/callback")
    MICROSOFT_TENANT_ID: str = os.getenv("TENANT_ID", "consumers")
    # Note: offline_access is automatically added by MSAL, don't include it explicitly
    MICROSOFT_SCOPES: List[str] = ["User.Read", "Mail.ReadWrite", "Mail.Send"]
    
    # Token Encryption (for storing refresh tokens)
    TOKEN_ENCRYPTION_KEY: str = os.getenv("TOKEN_ENCRYPTION_KEY")
    
    # Frontend URL (for OAuth redirects)
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    # def __init__(self, **values):
    #     super().__init__(**values)
    #     if not self.DEBUG:
    #         db_user = os.getenv("DB_USER")
    #         db_password = os.getenv("DB_PASSWORD")
    #         db_host = os.getenv("DB_HOST")
    #         db_port = os.getenv("DB_PORT")
    #         db_name = os.getenv("DB_NAME")
    #         self.DATABASE_URL = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

    @field_validator("ALLOWED_ORIGINS")
    def parse_allowed_origins(cls, v: str) -> List[str]:
        return v.split(",") if v else []

    class Config:
        # env_file = ".env" ## ../.env
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()