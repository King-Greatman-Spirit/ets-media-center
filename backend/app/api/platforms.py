from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from db.session import get_db
from core.security import verify_token
from models import Platform, PlatformStatus
from schemas import PlatformCreate, PlatformUpdate, PlatformResponse

router = APIRouter()


@router.get("/", response_model=List[PlatformResponse])
def list_platforms(skip: int = Query(0), limit: int = Query(20), db: Session = Depends(get_db)):
    platforms = db.query(Platform).offset(skip).limit(limit).all()
    return platforms


@router.get("/{platform_id}", response_model=PlatformResponse)
def get_platform(platform_id: UUID, db: Session = Depends(get_db)):
    platform = db.query(Platform).filter(Platform.id == platform_id).first()
    if not platform:
        raise HTTPException(404, "Platform not found")
    return platform


@router.post("/", response_model=PlatformResponse)
def connect_platform(platform_data: PlatformCreate, db: Session = Depends(get_db)):
    platform = Platform(
        name=platform_data.name,
        display_name=platform_data.display_name,
        handle=platform_data.handle,
        api_provider=platform_data.api_provider,
        credentials=platform_data.credentials or {},
        connection_status=PlatformStatus.pending.value
    )
    db.add(platform)
    db.commit()
    db.refresh(platform)
    return platform


@router.put("/{platform_id}/connect")
def update_connection(
    platform_id: UUID,
    credentials: dict = Body(default={}),
    status: str = Query("connected"),
    db: Session = Depends(get_db)
):
    platform = db.query(Platform).filter(Platform.id == platform_id).first()
    if not platform:
        raise HTTPException(404, "Platform not found")
    platform.credentials = credentials
    platform.connection_status = PlatformStatus(status).value
    platform.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(platform)
    return platform


@router.delete("/{platform_id}")
def disconnect_platform(platform_id: UUID, db: Session = Depends(get_db)):
    platform = db.query(Platform).filter(Platform.id == platform_id).first()
    if not platform:
        raise HTTPException(404, "Platform not found")
    platform.connection_status = PlatformStatus.disconnected.value
    db.commit()
    return {"message": f"Platform {platform.display_name} disconnected"}


@router.get("/{platform_id}/status")
def platform_status(platform_id: UUID, db: Session = Depends(get_db)):
    platform = db.query(Platform).filter(Platform.id == platform_id).first()
    if not platform:
        raise HTTPException(404, "Platform not found")
    return {
        "platform": platform.display_name,
        "status": platform.connection_status.value,
        "last_posted": platform.last_posted,
        "post_count": platform.post_count,
        "connected": platform.connection_status == PlatformStatus.connected.value
    }
