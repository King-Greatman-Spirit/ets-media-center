from typing import Optional, List
from sqlalchemy.orm import Session
from models import Asset, AssetType, Video


def upload_asset(file, asset_type: str, tags: List[str], video_id: Optional, db: Session) -> dict:
    asset = Asset(
        video_id=video_id,
        asset_type=asset_type,
        file_name=file.filename,
        tags=tags,
        file_path=f"assets/{file.filename}"
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return {"success": True, "asset_id": asset.id, "message": "Asset uploaded"}


def list_assets(asset_type: Optional[str], video_id: Optional, skip: int, limit: int, db: Session) -> list:
    query = db.query(Asset)
    if asset_type:
        query = query.filter(Asset.asset_type == asset_type)
    if video_id:
        query = query.filter(Asset.video_id == video_id)
    return query.offset(skip).limit(limit).all()


def generate_graphic(template: str, text: str, asset_type: str, db: Session) -> dict:
    return {
        "success": True,
        "asset_id": "mock_asset_id",
        "template": template,
        "text": text,
        "asset_type": asset_type,
        "message": f"Graphic generated from {template} template"
    }
