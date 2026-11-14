import time
import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db import crud
from app.agent.graph import medical_agent_app

router = APIRouter(prefix="/api", tags=["Medical Agent"])


class ChatRequest(BaseModel):
    question: str = Field(
        ...,
        example="What are the clinical recommendations for corticosteroids in severe COVID-19?",
        description="Clinical query or patient scenario",
    )
    session_id: Optional[str] = Field(
        default=None,
        example=None,
        description="Optional existing session ID to continue conversation history",
    )


class ChatResponse(BaseModel):
    session_id: str
    question: str
    response: str
    grounding_status: str
    sources_used: int
    sources: List[Dict[str, Any]]
    execution_time_ms: float


@router.post("/chat", response_model=ChatResponse)
def chat_with_agent(payload: ChatRequest, db: Session = Depends(get_db)):
    """
    Executes the full 6-node Self-Correcting Agentic RAG workflow with SQLite persistence.
    """
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    start_time = time.perf_counter()
    try:
        clean_question = payload.question.strip()

        # 1. Get or create chat session
        session = crud.get_or_create_session(
            db=db, session_id=payload.session_id, title=clean_question
        )

        # 2. Save user message in DB
        crud.save_message(
            db=db, session_id=session.id, role="user", content=clean_question
        )

        # 3. Invoke LangGraph Agent
        state_result = medical_agent_app.invoke({"question": clean_question})

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        generation = state_result.get("generation", "No response generated.")
        raw_docs = state_result.get("documents", [])

        # Normalize sources to Dict format
        documents = []
        for idx, doc in enumerate(raw_docs, start=1):
            if hasattr(doc, "page_content"):
                documents.append({
                    "id": idx,
                    "content": doc.page_content[:350],
                    "source": doc.metadata.get("source", "Local Clinical Guideline"),
                    "page": doc.metadata.get("page", "N/A"),
                    "type": doc.metadata.get("type", "vector_store"),
                })
            elif isinstance(doc, dict):
                documents.append(doc)

        # Accurate grounding status determination
        grounding = "GROUNDED"
        if not documents or "could not locate sufficiently verified" in generation.lower():
            grounding = "FALLBACK_SAFETY_DISCLAIMER"

        # 4. Save assistant response & evaluation metrics in DB
        assistant_msg = crud.save_message(
            db=db,
            session_id=session.id,
            role="assistant",
            content=generation,
            grounding_status=grounding,
            sources=documents,
        )
        crud.save_query_metric(
            db=db,
            message_id=assistant_msg.id,
            grounding_status=grounding,
            sources=documents,
            latency_ms=elapsed_ms,
        )

        return ChatResponse(
            session_id=session.id,
            question=payload.question,
            response=generation,
            grounding_status=grounding,
            sources_used=len(documents),
            sources=documents,
            execution_time_ms=elapsed_ms,
        )

    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Agent Execution Failure: {str(err)}")


@router.get("/sessions")
def list_sessions(limit: int = 20, db: Session = Depends(get_db)):
    sessions = crud.get_all_sessions(db=db, limit=limit)
    return [
        {"id": s.id, "title": s.title, "created_at": s.created_at.isoformat()}
        for s in sessions
    ]


@router.get("/sessions/{session_id}/messages")
def get_history(session_id: str, db: Session = Depends(get_db)):
    messages = crud.get_session_messages(db=db, session_id=session_id)
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "grounding_status": m.grounding_status,
            "sources": json.loads(m.sources_json) if m.sources_json else [],
            "timestamp": m.timestamp.isoformat(),
        }
        for m in messages
    ]

