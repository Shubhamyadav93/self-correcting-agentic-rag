from typing import Dict, Any
from sqlalchemy.orm import Session
from app.db import crud


class EvaluationTracker:
    """Wrapper service for recording and querying agent grounding & latency metrics."""

    @staticmethod
    def record_interaction(
        db: Session,
        message_id: int,
        grounding_status: str,
        sources: list,
        latency_ms: float,
    ):
        return crud.save_query_metric(
            db=db,
            message_id=message_id,
            grounding_status=grounding_status,
            sources=sources,
            latency_ms=latency_ms,
        )

    @staticmethod
    def get_summary(db: Session) -> Dict[str, Any]:
        return crud.get_aggregated_metrics(db=db)
    