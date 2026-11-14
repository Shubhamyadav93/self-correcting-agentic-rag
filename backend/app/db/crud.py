import json
import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import ChatSession, ChatMessage, QueryMetric


def get_or_create_session(db: Session, session_id: Optional[str] = None, title: Optional[str] = None) -> ChatSession:
    if session_id:
        existing = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if existing:
            return existing

    new_id = session_id or str(uuid.uuid4())
    session_title = (title[:60] + "...") if title and len(title) > 60 else (title or "Clinical Consultation")
    db_session = ChatSession(id=new_id, title=session_title)
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


def save_message(
    db: Session,
    session_id: str,
    role: str,
    content: str,
    grounding_status: Optional[str] = None,
    sources: Optional[List[Dict[str, Any]]] = None,
) -> ChatMessage:
    sources_str = json.dumps(sources) if sources is not None else None
    db_msg = ChatMessage(
        session_id=session_id,
        role=role,
        content=content,
        grounding_status=grounding_status,
        sources_json=sources_str,
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg


def save_query_metric(
    db: Session,
    message_id: int,
    grounding_status: str,
    sources: List[Dict[str, Any]],
    latency_ms: float,
) -> QueryMetric:
    web_used = any(s.get("type") == "web_fallback" or s.get("source") == "Web" for s in sources)
    passed = grounding_status == "GROUNDED"
    metric = QueryMetric(
        message_id=message_id,
        grounding_passed=passed,
        sources_used=len(sources),
        web_fallback_used=web_used,
        latency_ms=latency_ms,
    )
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric


def get_session_messages(db: Session, session_id: str) -> List[ChatMessage]:
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.timestamp.asc())
        .all()
    )


def get_all_sessions(db: Session, limit: int = 20) -> List[ChatSession]:
    return db.query(ChatSession).order_by(ChatSession.created_at.desc()).limit(limit).all()


def get_aggregated_metrics(db: Session) -> Dict[str, Any]:
    total_queries = db.query(func.count(QueryMetric.id)).scalar() or 0
    if total_queries == 0:
        return {
            "total_queries": 0,
            "grounding_pass_rate": 0.0,
            "web_fallback_rate": 0.0,
            "avg_latency_ms": 0.0,
            "avg_sources_used": 0.0,
        }

    grounded_count = db.query(func.count(QueryMetric.id)).filter(QueryMetric.grounding_passed.is_(True)).scalar() or 0
    web_count = db.query(func.count(QueryMetric.id)).filter(QueryMetric.web_fallback_used.is_(True)).scalar() or 0
    avg_latency = db.query(func.avg(QueryMetric.latency_ms)).scalar() or 0.0
    avg_sources = db.query(func.avg(QueryMetric.sources_used)).scalar() or 0.0

    return {
        "total_queries": total_queries,
        "grounding_pass_rate": round((grounded_count / total_queries) * 100, 2),
        "web_fallback_rate": round((web_count / total_queries) * 100, 2),
        "avg_latency_ms": round(avg_latency, 2),
        "avg_sources_used": round(avg_sources, 2),
    }
