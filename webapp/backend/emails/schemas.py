'''
- The "Pydantic schemas" / folder, in a FastAPI project, contains Pydantic models that define how data is 
validated and serialized at the API layer 
- Each Pydantic model (in the schemas/ folder) usually corresponds one-to-one 
with a SQLAlchemy model (in the models/ folder) 
- Think of these as the “data contracts” between the backend and frontend
'''

from datetime import datetime
from pydantic import BaseModel, Field
from typing import Literal, List, Dict, Optional


## In FastAPI projects, Pydantic schemas are often organized in pairs like Create / Response (and sometimes Update) 
## Create: Used for incoming requests, e.g., the body of a POST request when creating a new email. 
## Response: Used for outgoing responses, e.g., what the API returns. It includes id, timestamps, or any read-only fields.


# ----------------- Load from DB -----------------
class EmailBase(BaseModel):
    author: str
    to: str
    subject: str
    # email_thread: str
    email_thread_text: Optional[str] = None
    email_thread_html: Optional[str] = None

class Email(EmailBase):
    id: int
    created_at: datetime
    message_id: Optional[str] = None
    conversation_id: Optional[str] = None

    class Config:
        orm_mode = True # allows conversion from SQLAlchemy object

# -----------------------------------------------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------------------------------------



# ----------------- Response -----------------
class EmailResponse(BaseModel):
    id: int
    author: str
    to: str
    subject: str
    # email_thread: str
    created_at: datetime
    received_at: Optional[datetime] = None

    email_thread_text: Optional[str]
    email_thread_html: Optional[str]
    message_id: Optional[str]
    conversation_id: Optional[str]

    class Config:
        orm_mode = True

# -----------------------------------------------------------------------------------------------------------------------
# -----------------------------------------------------------------------------------------------------------------------


# ----------------- Response -----------------
class EmailClassificationResponse(BaseModel):
    email_id: int
    classification: Literal["ignore", "respond", "notify"]
    reasoning: str
    ai_draft: str | None = None  # optional if we want to include draft later


# ----------------- Conversation Group Response -----------------
class ConversationGroupResponse(BaseModel):
    conversation_id: Optional[str]  # None for emails without conversation_id
    subject: str
    message_count: int
    most_recent_email_id: int
    most_recent_date: datetime
    participants: List[str]  # Unique email addresses involved
    preview_text: Optional[str]
    classification: Optional[Literal["ignore", "respond", "notify"]] = None
    account_email: str  # Email account this conversation belongs to
    
    class Config:
        orm_mode = True
