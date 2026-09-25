from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum
from uuid import UUID


# --- User ---
class UserBase(BaseModel):
    email: str
    display_name: Optional[str] = None
    role: Optional[str] = "viewer"


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    settings: Optional[dict] = None


class UserResponse(UserBase):
    id: UUID
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Video ---
class VideoBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = []


class VideoCreate(VideoBase):
    pass


class VideoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None


class VideoResponse(VideoBase):
    id: UUID
    user_id: UUID
    source_path: Optional[str] = None
    storage_path: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration_sec: Optional[int] = None
    duration_formatted: Optional[str] = None
    transcript: Optional[str] = None
    status: str
    processing_progress: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Clip ---
class ClipBase(BaseModel):
    title: str
    hook: Optional[str] = None
    start_time: float
    end_time: float
    topic: Optional[str] = None
    transcript_excerpt: Optional[str] = None
    confidence_score: Optional[float] = None


class ClipCreate(ClipBase):
    video_id: UUID


class ClipUpdate(BaseModel):
    title: Optional[str] = None
    hook: Optional[str] = None
    topic: Optional[str] = None
    status: Optional[str] = None
    on_screen_text: Optional[str] = None
    subtitle_instructions: Optional[str] = None
    thumbnail_url: Optional[str] = None


class ClipResponse(ClipBase):
    id: UUID
    video_id: UUID
    description: Optional[str] = None
    category: Optional[str] = None
    duration_sec: Optional[int] = None
    transcript_excerpt: Optional[str] = None
    confidence_score: Optional[float] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Platform ---
class PlatformBase(BaseModel):
    name: str
    display_name: str
    handle: Optional[str] = None
    api_provider: Optional[str] = None
    credentials: Optional[dict] = None


class PlatformCreate(PlatformBase):
    pass


class PlatformUpdate(BaseModel):
    handle: Optional[str] = None
    credentials: Optional[dict] = None
    connection_status: Optional[str] = None


class PlatformResponse(PlatformBase):
    id: UUID
    connection_status: str
    last_posted: Optional[datetime] = None
    post_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Platform Content ---
class PlatformContentBase(BaseModel):
    clip_id: Optional[UUID] = None
    platform_id: UUID
    content_type: str
    title: Optional[str] = None
    caption: Optional[str] = None
    hook: Optional[str] = None
    hashtags: Optional[List[str]] = []
    cta: Optional[str] = None
    on_screen_text: Optional[str] = None
    subtitle_instructions: Optional[str] = None
    thumbnail_concept: Optional[str] = None
    format_type: Optional[str] = None
    status: Optional[str] = "draft"


class PlatformContentCreate(PlatformContentBase):
    pass


class PlatformContentUpdate(BaseModel):
    title: Optional[str] = None
    caption: Optional[str] = None
    hook: Optional[str] = None
    hashtags: Optional[List[str]] = None
    cta: Optional[str] = None
    status: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    on_screen_text: Optional[str] = None
    subtitle_instructions: Optional[str] = None
    thumbnail_concept: Optional[str] = None


class PlatformContentResponse(PlatformContentBase):
    id: UUID
    platform_post_id: Optional[str] = None
    published_url: Optional[str] = None
    error_message: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Calendar ---
class CalendarPostBase(BaseModel):
    date: str
    time: str
    platform_id: UUID
    pillar: Optional[str] = None
    format_type: Optional[str] = None
    status: Optional[str] = "idea"


class CalendarPostCreate(CalendarPostBase):
    pass


class CalendarPostResponse(CalendarPostBase):
    id: UUID
    post_id: UUID
    scheduled_at: Optional[datetime] = None
    published_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Approval ---
class ApprovalHistoryBase(BaseModel):
    post_id: UUID
    status: str
    notes: Optional[str] = None
    action: Optional[str] = None


class ApprovalHistoryResponse(ApprovalHistoryBase):
    id: UUID
    reviewed_by: Optional[UUID] = None
    reviewed_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# --- Analytics ---
class AnalyticsBase(BaseModel):
    post_id: Optional[UUID] = None
    platform_id: Optional[UUID] = None
    views: Optional[int] = 0
    reach: Optional[int] = 0
    likes: Optional[int] = 0
    comments: Optional[int] = 0
    shares: Optional[int] = 0
    saves: Optional[int] = 0
    engagement_rate: Optional[float] = 0


class AnalyticsCreate(AnalyticsBase):
    pass


class AnalyticsResponse(AnalyticsBase):
    id: UUID
    recorded_at: datetime

    class Config:
        from_attributes = True


# --- Asset ---
class AssetBase(BaseModel):
    video_id: Optional[UUID] = None
    asset_type: str
    file_name: str
    tags: Optional[List[str]] = []


class AssetCreate(AssetBase):
    pass


class AssetResponse(AssetBase):
    id: UUID
    file_path: Optional[str] = None
    storage_path: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration_sec: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Engine ---
class EngineRunRequest(BaseModel):
    dry_run: bool = False


class EngineReport(BaseModel):
    start_time: datetime
    end_time: Optional[datetime] = None
    videos_processed: int = 0
    clips_identified: int = 0
    content_generated: int = 0
    calendar_added: int = 0
    errors: List[str] = []
    summary: str = ""
    recommendations: Optional[dict] = None


class EngineStatus(BaseModel):
    running: bool
    last_run: Optional[datetime] = None
    queue_size: int = 0
    processed_count: int = 0
