from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from router import email
from db.database import engine, create_tables
from sqlalchemy import inspect, text



app = FastAPI(
    title="AIEmailCoach-WebApp",
    description="An AI Email Generator which can learn from experiences",
    version="0.1.0",
    docs_url="/docs",
    ## Shows us the routes in FastAPI Docs 
    redoc_url="/redoc", ## http://localhost:8000/redoc
)


@app.on_event("startup")
def ensure_tables_exist():
    """
    On app startup:
    - Verify DB connection
    - Create tables if missing (dev convenience)
    - Ready for Alembic override later
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Database connection OK")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        raise

    # Temporary safeguard for MVP phase
    create_tables()
    print("✅ Tables ensured (for MVP). Will Switch to Alembic at Production.")

# ✅ Add CORS middleware BEFORE registering routers
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Register the router AFTER CORS
app.include_router(email.router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)