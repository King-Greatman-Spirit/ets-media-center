from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from db.session import get_db
from core.security import verify_token
from models import PlatformContent, ContentStatus, Platform, CalendarPost, CalendarStatus, Pillar
from schemas import PlatformContentUpdate, PlatformContentResponse, CalendarPostCreate, CalendarPostResponse
from services.publish_service import publish_content_item

router = APIRouter()


@router.get("/", response_model=List[PlatformContentResponse])
def list_content(
    status: Optional[str] = None,
    platform_id: Optional[UUID] = None,
    skip: int = Query(0),
    limit: int = Query(100),
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    query = db.query(PlatformContent)
    if status:
        query = query.filter(PlatformContent.status == status)
    if platform_id:
        query = query.filter(PlatformContent.platform_id == platform_id)
    items = query.offset(skip).limit(limit).all()
    return items


@router.get("/{content_id}", response_model=PlatformContentResponse)
def get_content(content_id: UUID, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    item = db.query(PlatformContent).filter(PlatformContent.id == content_id).first()
    if not item:
        raise HTTPException(404, "Content not found")
    return item


@router.put("/{content_id}/approve")
def approve_content(content_id: UUID, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    item = db.query(PlatformContent).filter(PlatformContent.id == content_id).first()
    if not item:
        raise HTTPException(404, "Content not found")
    item.status = ContentStatus.approved.value
    db.commit()
    db.refresh(item)
    return item


@router.put("/{content_id}/reject")
def reject_content(
    content_id: UUID,
    notes: str = Query(""),
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    item = db.query(PlatformContent).filter(PlatformContent.id == content_id).first()
    if not item:
        raise HTTPException(404, "Content not found")
    item.status = ContentStatus.draft.value
    item.error_message = notes
    db.commit()
    db.refresh(item)
    return item


@router.put("/{content_id}/schedule", response_model=PlatformContentResponse)
def schedule_content(
    content_id: UUID,
    scheduled_at: datetime = Body(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    item = db.query(PlatformContent).filter(PlatformContent.id == content_id).first()
    if not item:
        raise HTTPException(404, "Content not found")
    item.status = ContentStatus.scheduled.value
    item.scheduled_at = scheduled_at
    db.commit()
    db.refresh(item)
    return item


@router.post("/{content_id}/publish")
def publish_content(content_id: UUID, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    item = db.query(PlatformContent).filter(PlatformContent.id == content_id).first()
    if not item:
        raise HTTPException(404, "Content not found")
    result = publish_content_item(item, db)
    return result


@router.post("/{content_id}/preview")
def preview_content(content_id: UUID, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    item = db.query(PlatformContent).filter(PlatformContent.id == content_id).first()
    if not item:
        raise HTTPException(404, "Content not found")
    return {
        "title": item.title,
        "hook": item.hook,
        "caption": item.caption,
        "hashtags": item.hashtags,
        "cta": item.cta,
        "on_screen_text": item.on_screen_text,
        "thumbnail_concept": item.thumbnail_concept,
        "subtitle_instructions": item.subtitle_instructions
    }
