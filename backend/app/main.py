import os
import time
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# MCP Tools
from app.mcp_tools.mcp_retriever import get_medical_retriever
from app.mcp_tools.mcp_search import get_medical_search_tool

# LangGraph Agent App
from app.agent.graph import medical_agent_app


app = FastAPI(
    title="Self-Correcting Medical RAG Agent API",
    version="1.0.0",
    description="FastAPI Backend for Self-Correcting Clinical Guidelines RAG Agent"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request & Response Schemas ---

class ChatRequest(BaseModel):
    question: str = Field(
        ..., 
        example="What are the clinical recommendations for corticosteroids in severe COVID-19?",
        description="Clinical query or patient scenario"
    )

class ChatResponse(BaseModel):
    question: str
    response: str
    grounding_status: str
    sources_used: int
    sources: List[Dict[str, Any]]
    execution_time_ms: float



# --- Endpoints ---

@app.get("/", tags=["Health"])
def root():
    return {"status": "active", "service": "Self-Correcting Medical RAG API"}

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "llm_model": os.getenv("LLM_MODEL", "openai/gpt-oss-20b"),
        "chroma_dir": os.getenv("CHROMA_PERSIST_DIR", "./data/chroma_db")
    }

@app.post("/api/chat", response_model=ChatResponse, tags=["Medical Agent"])
def chat_with_agent(payload: ChatRequest):
    """
    Executes the full 6-node Self-Correcting Agentic RAG workflow:
    - Node 1: Vector Retrieval (ChromaDB)
    - Node 2: Quality Grader (Relevance filtering)
    - Node 3: LLM Generation Engine
    - Node 4: Hallucination & Fact-Grounding Checker
    - Node 5: Query Reformulator (Fallback)
    - Node 6: Web/PubMed Search (Fallback)
    """
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    start_time = time.perf_counter()
    try:
        # Invoke LangGraph Agent
        state_result = medical_agent_app.invoke({"question": payload.question.strip()})
        
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        generation = state_result.get("generation", "No response generated.")
        documents = state_result.get("documents", [])
        
        # Grounding status determination
        grounding = "GROUNDED"
        if state_result.get("retry_count", 0) >= 2:
            grounding = "FALLBACK_SAFETY_DISCLAIMER"

        return ChatResponse(
            question=payload.question,
            response=generation,
            grounding_status=grounding,
            sources_used=len(documents),
            sources=documents,
            execution_time_ms=elapsed_ms
        )

    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Agent Execution Failure: {str(err)}")

