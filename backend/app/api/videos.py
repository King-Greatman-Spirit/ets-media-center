from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from db.session import get_db
from core.security import verify_token
from models import Video, VideoStatus
from schemas import VideoCreate, VideoResponse, VideoUpdate as VideoUpdateSchema
from services.video_service import process_video, generate_thumbnail, extract_metadata

router = APIRouter()


@router.post("/upload", response_model=VideoResponse)
def upload_video(
    file: UploadFile = File(...),
    title: str = Body(...),
    description: str = Body(None),
    category: str = Body(None),
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    video = Video(
        user_id=user_id,
        title=title,
        description=description,
        category=category,
        tags=[],
        status=VideoStatus.uploaded.value,
        source_path=file.filename,
        storage_path=f"videos/{file.filename}"
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    return video


@router.get("/", response_model=List[VideoResponse])
def list_videos(
    status: Optional[str] = None,
    skip: int = Query(0),
    limit: int = Query(50),
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    query = db.query(Video).filter(Video.user_id == user_id)
    if status:
        query = query.filter(Video.status == status)
    videos = query.offset(skip).limit(limit).all()
    return videos


@router.get("/{video_id}", response_model=VideoResponse)
def get_video(video_id: UUID, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    return video


@router.post("/{video_id}/process", response_model=dict)
def trigger_processing(video_id: UUID, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    result = process_video(video_id, db)
    return result


@router.delete("/{video_id}")
def delete_video(video_id: UUID, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    video = db.query(Video).filter(Video.id == video_id, Video.user_id == user_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    db.delete(video)
    db.commit()
    return {"message": "Video deleted"}


@router.get("/{video_id}/clips")
def get_clips(video_id: UUID, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video not found")
    return video.clips
