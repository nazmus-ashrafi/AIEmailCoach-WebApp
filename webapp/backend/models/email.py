'''
- SQLAlchemy models to define how data is structured and persisted
- How data is stored (in memory, SQLite, Postgres, etc.)


'''

from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from db.database import Base


class Email(Base):
    __tablename__ = "emails"
    
    id = Column(Integer, primary_key=True, index=True)
    author = Column(String)
    to = Column(String)
    subject = Column(String)
    email_thread = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)