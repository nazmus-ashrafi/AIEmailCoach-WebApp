'''
The delta token is always treated as its own independent persistence object.
'''

from sqlalchemy import Column, Integer, String
from db.database import Base  

class DeltaToken(Base):
    __tablename__ = "delta_tokens"

    id = Column(Integer, primary_key=True, index=True)
    folder = Column(String, index=True, unique=True)  # e.g. "inbox"
    delta_token = Column(String, nullable=True)