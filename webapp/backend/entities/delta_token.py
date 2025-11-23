'''
The delta token is always treated as its own independent persistence object.
'''

from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from db.database import Base  

class DeltaToken(Base):
    __tablename__ = "delta_tokens"
    __table_args__ = (
        UniqueConstraint('email_account_id', 'folder', name='uq_account_folder'),
    )

    id = Column(Integer, primary_key=True, index=True)
    email_account_id = Column(UUID(as_uuid=True), ForeignKey('email_accounts.id'), nullable=False)
    folder = Column(String, index=True)  # e.g. "inbox"
    delta_token = Column(String, nullable=True)
    
    # Relationship back to EmailAccount
    email_account = relationship("EmailAccount", back_populates="delta_tokens")