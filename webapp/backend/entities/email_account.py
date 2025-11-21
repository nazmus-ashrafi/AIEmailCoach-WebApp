# webapp/backend/entities/email_account.py
'''
EmailAccount represents a specific email the user registered with.

'''

from uuid import UUID


from sqlalchemy import (
    Column,
    String,
    Enum,
    DateTime,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
import enum

from db.database import Base


class ProviderEnum(enum.Enum):
    outlook = "outlook"
    google = "google"
    imap = "imap"


class EmailAccount(Base):
    __tablename__ = "email_accounts"

    # UUIDs id for user-facing entities
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # FK to User
    user_id = Column(
        UUID(as_uuid=True),
        ## ondelete="CASCADE" = automatically deletes child records when the parent record is deleted
        ## ie. if User is deleted, database automatically deletes all EmailAccount under the User
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )


    # Which provider manages this email account
    provider = Column(Enum(ProviderEnum), nullable=False)

    # Example: "professor@university.edu"
    email_address = Column(String, nullable=False, index=True)

    # Encrypted refresh tokens
    ms_refresh_token_encrypted = Column(String, nullable=True)
    google_refresh_token_encrypted = Column(String, nullable=True)

    # Access token expiration timestamp
    access_token_expires_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # --- Relationships ---
    # One EmailAccount → Many DeltaTokens
    delta_tokens = relationship(
        "DeltaToken",
        back_populates="email_account",
        cascade="all, delete-orphan",
    )

    ## Relationship ------------- ------------- ------------- -------------

    # One EmailAccount → Many Emails
    emails = relationship(
        "Email",
        back_populates="email_account",
        cascade="all, delete-orphan",
    )

    # Backref to User (user.email_accounts)
    user = relationship(
        "User", 
        back_populates="email_accounts", ##  the attribute name inside the "User" class
    )

    ## ------------- ------------- ------------- ------------- -------------
    

    def __repr__(self):
        return (
            f"<EmailAccount(email='{self.email_address}', "
            f"provider='{self.provider.value}', "
            f"user_id='{self.user_id}')>"
        )