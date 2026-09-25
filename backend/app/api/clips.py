from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from db.session import get_db
from core.security import verify_token
from models import Clip, ClipUpdate, ContentStatus
from schemas import ClipCreate, ClipResponse, ClipUpdate as ClipUpdateSchema
from services.content_service import generate_platform_content

router = APIRouter()


@router.get("/", response_model=List[ClipResponse])
def list_clips(
    status: Optional[str] = None,
    topic: Optional[str] = None,
    skip: int = Query(0),
    limit: int = Query(50),
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    query = db.query(Clip)
    if status:
        query = query.filter(Clip.status == status)
    if topic:
        query = query.filter(Clip.topic == topic)
    clips = query.offset(skip).limit(limit).all()
    return clips


@router.get("/{clip_id}", response_model=ClipResponse)
def get_clip(clip_id: UUID, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(404, "Clip not found")
    return clip


@router.post("/{clip_id}/repurpose")
def repurpose_clip(
    clip_id: UUID,
    platforms: List[str] = Query(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(404, "Clip not found")
    result = generate_platform_content(clip_id, platforms, db)
    return result


@router.put("/{clip_id}/status")
def update_clip_status(
    clip_id: UUID,
    status: str = Body(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(404, "Clip not found")
    clip.status = status
    db.commit()
    db.refresh(clip)
    return clip


@router.get("/{clip_id}/content")
def get_clip_content(clip_id: UUID, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        raise HTTPException(404, "Clip not found")
    return clip.platform_contents
