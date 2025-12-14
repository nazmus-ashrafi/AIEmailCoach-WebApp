from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

from core.config import settings

# Get database URL from settings
DATABASE_URL = settings.DATABASE_URL

# IMPORTANT: Render provides DATABASE_URL with postgres:// prefix
# but SQLAlchemy requires postgresql:// prefix
# This conversion ensures compatibility
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    print(f"✅ Converted Render DATABASE_URL format: postgres:// → postgresql://")

# Create engine with appropriate settings
# SQLite needs check_same_thread=False for FastAPI
# PostgreSQL doesn't need this parameter
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL and "sqlite" in DATABASE_URL else {},
    echo=False  # Set to True to see SQL queries (useful for debugging)
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    Dependency function for FastAPI routes.
    Creates a new database session for each request and closes it after.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """
    Creates all tables defined in entity models.
    
    Note: This is for MVP/development convenience.
    In production, you should use Alembic migrations instead.
    """
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created/verified")