from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.session import Base

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, default="New Clinical Consultation")
    created_at = Column(DateTime, default=datetime.utcnow)

    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(String, ForeignKey("chat_sessions.id"), index=True)
    role = Column(String, nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    grounding_status = Column(String, nullable=True)
    sources_json = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("ChatSession", back_populates="messages")
    metrics = relationship("QueryMetric", back_populates="message", uselist=False, cascade="all, delete-orphan")


class QueryMetric(Base):
    __tablename__ = "query_metrics"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    message_id = Column(Integer, ForeignKey("chat_messages.id"), unique=True)
    grounding_passed = Column(Boolean, default=True)
    sources_used = Column(Integer, default=0)
    web_fallback_used = Column(Boolean, default=False)
    latency_ms = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    message = relationship("ChatMessage", back_populates="metrics")
