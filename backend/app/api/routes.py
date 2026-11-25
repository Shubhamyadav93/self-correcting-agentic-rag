"""
Consolidated API Routes for Telemedicine & Clinical Triage
Re-exports routes from app.api.routes_triage
"""
from app.api.routes_triage import router

__all__ = ["router"]
