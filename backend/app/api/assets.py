from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from db.session import get_db
from core.security import verify_token
from models import Asset, AssetType
from schemas import AssetCreate, AssetResponse
from services.asset_service import upload_asset, list_assets as list_assets_service, generate_graphic

router = APIRouter()


@router.post("/upload", response_model=AssetResponse)
def upload_asset_endpoint(
    file: UploadFile = File(...),
    asset_type: str = Query(...),
    tags: Optional[List[str]] = Query(None),
    video_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    result = upload_asset(file, asset_type, tags or [], video_id, db)
    return result


@router.get("/", response_model=List[AssetResponse])
def list_assets(
    asset_type: Optional[str] = None,
    video_id: Optional[UUID] = None,
    skip: int = Query(0),
    limit: int = Query(50),
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    result = list_assets_service(asset_type, video_id, skip, limit, db)
    return result


@router.post("/generate")
def generate_graphics(
    template: str = Query(...),
    text: str = Query(...),
    asset_type: str = Query("image"),
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    result = generate_graphic(template, text, asset_type, db)
    return result


@router.delete("/{asset_id}")
def delete_asset(asset_id: UUID, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(404, "Asset not found")
    db.delete(asset)
    db.commit()
    return {"message": "Asset deleted"}
