from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from db.session import get_db
from core.security import verify_token
from schemas import EngineReport, EngineStatus
from services.engine_service import run_media_engine

router = APIRouter()


@router.post("/run", response_model=EngineReport)
def run_engine(dry_run: bool = False, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    report = run_media_engine(dry_run=dry_run, db=db)
    return report


@router.get("/status", response_model=EngineStatus)
def get_engine_status(db: Session = Depends(get_db)):
    return EngineStatus(
        running=False,
        last_run=None,
        queue_size=0,
        processed_count=0
    )
