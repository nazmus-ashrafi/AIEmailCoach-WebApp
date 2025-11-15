'''
- "SQLAlchemy models" to define how data is structured and persisted
- How data is stored (in memory, SQLite, Postgres, etc.)


'''

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from datetime import datetime, timezone
from db.database import Base
from sqlalchemy.orm import relationship


class Email(Base):
    __tablename__ = "emails"
    
    id = Column(Integer, primary_key=True, index=True)
    author = Column(String, nullable=False)
    to = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    # email_thread = Column(Text, nullable=False) ## Replaced by "email_thread_text" and "email_thread_html"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    ## Relationship to classifications (email.classifications ↔ classification.email)
    ## email.classifications  # list of related EmailClassification objects
    ## classification.email   # the parent Email object
    ## --
    ## Defining a one-to-many relationship between Email and EmailClassification tables
    ## Email → 1 : N ← EmailClassification
    ## One email can have many classifications (for example, re-classifications, feedback revisions, etc.)
    ## ----- Measures to keep database consistent and “clean up” related data automatically ------
    ## cascade="all" means add, update, or delete EmailClassification objects through the email.classifications
    ## will propagate those changes throughout the database
    ## 	delete-orphan means  if classification is  removed using email.classifications, if will not 
    ## attach to any other email
    classifications = relationship(
        "EmailClassification", 
        back_populates="email", 
        cascade="all, delete-orphan",
    )

    ## OUTLOOK -- -- -- --
    ## New field for Outlook ingests - allowing to store real Outlook emails
    ## Outlook messages have a unique stable ID (message_id)
    message_id = Column(String, unique=True, nullable=True, index=True)
    email_thread_text = Column(Text, nullable=True)   # Clean text for LLM + preview
    email_thread_html = Column(Text, nullable=True)   # Raw HTML for full viewer


## Child model to Email
class EmailClassification(Base):
    __tablename__ = "email_classifications"

    id = Column(Integer, primary_key=True, index=True)
    email_id = Column(Integer, ForeignKey("emails.id"), nullable=False)
    classification = Column(String, nullable=True)
    reasoning = Column(Text, nullable=True)
    ai_draft = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    ## Relationship to email (email.classifications ↔ classification.email)
    ## email.classifications  # list of related EmailClassification objects
    ## classification.email   # the parent Email object
    email = relationship("Email", back_populates="classifications")