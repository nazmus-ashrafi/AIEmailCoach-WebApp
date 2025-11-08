'''
- The schemas/ folder, in a FastAPI project, contains Pydantic models that define how data is 
validated and serialized at the API layer 
- Each Pydantic model (in the schemas/ folder) usually corresponds one-to-one 
with a SQLAlchemy model (in the models/ folder) 
- Think of these as the “data contracts” between the backend and frontend
'''

from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class EmailBase(BaseModel):
    author: str
    to: str
    subject: str
    email_thread: str

class Email(EmailBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True
