import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.session import init_db
from app.api import routes_chat, routes_ingest, routes_metrics, routes_triage, routes_auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database tables & seed doctor profiles on startup
    init_db()
    yield


app = FastAPI(
    title="ClinGuard Telehealth API",
    version="1.0.0",
    description="FastAPI Backend for ClinGuard Telehealth • Verified Clinical AI & Telemedicine Platform",
    lifespan=lifespan,
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Modular API Routers
app.include_router(routes_auth.router)
app.include_router(routes_chat.router)
app.include_router(routes_ingest.router)
app.include_router(routes_metrics.router)
app.include_router(routes_triage.router)


# --- Health Endpoints ---
@app.get("/", tags=["Health"])
def root():
    return {"status": "active", "service": "ClinGuard Telehealth API"}


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "llm_model": os.getenv("LLM_MODEL", "openai/gpt-oss-20b"),
        "chroma_dir": os.getenv("CHROMA_PERSIST_DIR", "./data/chroma_db"),
    }
