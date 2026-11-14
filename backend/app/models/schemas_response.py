from typing import List, Dict, Any
from pydantic import BaseModel


class ChatResponse(BaseModel):
    session_id: str
    question: str
    response: str
    grounding_status: str
    sources_used: int
    sources: List[Dict[str, Any]]
    execution_time_ms: float


class IngestResponse(BaseModel):
    status: str
    filename: str
    pages_loaded: int
    chunks_indexed: int


class MetricsResponse(BaseModel):
    total_queries: int
    grounding_pass_rate: float
    web_fallback_rate: float
    avg_latency_ms: float
    avg_sources_used: float
    