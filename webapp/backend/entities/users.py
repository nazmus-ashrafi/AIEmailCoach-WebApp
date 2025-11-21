from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
import uuid
from db.database import Base
from datetime import datetime, timezone
from sqlalchemy.orm import relationship


# (Represents a Signed-up User)
class User(Base):
    __tablename__ = 'users'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4) ## Primary Key
    email = Column(String, unique=True, nullable=False) ## unique
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    ## Relationship ------------- ------------- ------------- -------------
    email_accounts = relationship(
        "EmailAccount",
        back_populates="user", ##  the attribute name inside the "EmailAccount" class
        ## cascade="all, delete-orphan" = When a user is deleted, all their email accounts are automatically deleted
        cascade="all, delete-orphan",
    )

    ## ------------- ------------- ------------- ------------- -------------

    def __repr__(self):
        return (
            f"<User(email='{self.email}', "
            f"first_name='{self.first_name}', "
            f"last_name='{self.last_name}')>"
        )


## Relationships -------------

# User
#   └── EmailAccount (e.g., Outlook, Google)
#         ├── DeltaToken (per folder)
#         └── Email (synced messages)

# ----------------------------
# One User → Many EmailAccounts
