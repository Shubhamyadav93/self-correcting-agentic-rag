import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.session import init_db
from app.api import routes_chat, routes_ingest, routes_metrics


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database tables on startup
    init_db()
    yield


app = FastAPI(
    title="Self-Correcting Medical RAG Agent API",
    version="1.0.0",
    description="FastAPI Backend for Self-Correcting Clinical Guidelines RAG Agent",
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
app.include_router(routes_chat.router)
app.include_router(routes_ingest.router)
app.include_router(routes_metrics.router)


# --- Health Endpoints ---
@app.get("/", tags=["Health"])
def root():
    return {"status": "active", "service": "Self-Correcting Medical RAG API"}


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "llm_model": os.getenv("LLM_MODEL", "openai/gpt-oss-20b"),
        "chroma_dir": os.getenv("CHROMA_PERSIST_DIR", "./data/chroma_db"),
    }