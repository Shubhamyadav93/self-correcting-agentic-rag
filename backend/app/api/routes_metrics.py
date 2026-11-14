from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db import crud

router = APIRouter(prefix="/api", tags=["Evaluation & Metrics"])


@router.get("/metrics")
def get_system_metrics(db: Session = Depends(get_db)):
    return crud.get_aggregated_metrics(db=db)
