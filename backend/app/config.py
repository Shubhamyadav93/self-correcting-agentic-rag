import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    APP_NAME: str = "Self-Correcting Medical RAG Agent"
    APP_VERSION: str = "1.0.0"

    # API Keys
    GROQ_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    TAVILY_API_KEY: str = ""

    # Storage & Database Paths
    DATA_DIR: str = str(BASE_DIR / "data")
    CHROMA_DB_DIR: str = str(BASE_DIR / "data" / "chroma_db")
    RAW_DOCS_DIR: str = str(BASE_DIR / "data" / "raw_documents")
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'data' / 'clinical_agent.db'}"

    # Model Configuration
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    LLM_MODEL: str = "llama-3.3-70b-versatile"

    class Config:
        env_file = str(BASE_DIR / ".env")
        extra = "ignore"


settings = Settings()

