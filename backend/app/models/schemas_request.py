from typing import Optional
from pydantic import BaseModel, Field


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
    