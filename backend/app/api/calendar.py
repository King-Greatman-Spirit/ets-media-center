from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from uuid import UUID
from datetime import datetime

from db.session import get_db
from core.security import verify_token
from models import CalendarPost, CalendarStatus, PlatformContent, ContentStatus, Pillar
from schemas import CalendarPostCreate, CalendarPostResponse, EngineReport, EngineStatus
from services.schedule_service import schedule_content_items
from services.engine_service import run_media_engine

router = APIRouter()


@router.get("/", response_model=List[CalendarPostResponse])
def list_calendar(
    date: Optional[str] = None,
    platform_id: Optional[UUID] = None,
    status: Optional[str] = None,
    skip: int = Query(0),
    limit: int = Query(100),
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    query = db.query(CalendarPost)
    if date:
        query = query.filter(CalendarPost.date == date)
    if platform_id:
        query = query.filter(CalendarPost.platform_id == platform_id)
    if status:
        query = query.filter(CalendarPost.status == status)
    posts = query.offset(skip).limit(limit).all()
    return posts


@router.post("/", response_model=CalendarPostResponse)
def create_calendar_entry(
    entry: CalendarPostCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    post = CalendarPost(
        post_id=entry.post_id,
        date=entry.date,
        time=entry.time,
        platform_id=entry.platform_id,
        pillar=entry.pillar,
        format_type=entry.format_type,
        status=entry.status.value if entry.status else CalendarStatus.idea.value,
        scheduled_at=datetime.utcnow()
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.post("/schedule", response_model=dict)
def schedule_content(
    dates: List[str] = Query(...),
    pillars: Optional[List[str]] = Query(None),
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    result = schedule_content_items(dates, pillars, db)
    return result


@router.delete("/{entry_id}")
def delete_calendar_entry(entry_id: UUID, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    entry = db.query(CalendarPost).filter(CalendarPost.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Calendar entry not found")
    db.delete(entry)
    db.commit()
    return {"message": "Calendar entry deleted"}


@router.get("/stats", response_model=dict)
def get_calendar_stats(db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    total = db.query(CalendarPost).count()
    by_status = db.query(CalendarPost.status, db.func.count(CalendarPost.id)).group_by(CalendarPost.status).all()
    by_platform = db.query(CalendarPost.platform_id, db.func.count(CalendarPost.id)).group_by(CalendarPost.platform_id).all()
    by_pillar = db.query(CalendarPost.pillar, db.func.count(CalendarPost.id)).group_by(CalendarPost.pillar).all()
    return {
        "total_posts": total,
        "by_status": dict(by_status),
        "by_platform": dict(by_platform),
        "by_pillar": dict(by_pillar)
    }


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
