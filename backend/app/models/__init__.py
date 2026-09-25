from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, DateTime, Boolean, Text, Integer, Float, JSON, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, declarative_base
import enum

Base = declarative_base()


class UserRole(str, enum.Enum):
    admin = "admin"
    editor = "editor"
    viewer = "viewer"


class VideoStatus(str, enum.Enum):
    uploaded = "uploaded"
    processing = "processing"
    processed = "processed"
    failed = "failed"


class ContentStatus(str, enum.Enum):
    draft = "draft"
    needs_review = "needs_review"
    approved = "approved"
    scheduled = "scheduled"
    published = "published"
    failed = "failed"


class CalendarStatus(str, enum.Enum):
    idea = "idea"
    draft = "draft"
    needs_review = "needs_review"
    approved = "approved"
    scheduled = "scheduled"
    published = "published"
    failed = "failed"


class Pillar(str, enum.Enum):
    scripture_prayer = "Scripture & Prayer"
    teaching_sermon = "Teaching & Sermon"
    gospel_worship = "Gospel & Worship"
    encouragement = "Encouragement"
    evangelism = "Evangelism"
    discipleship = "Discipleship"
    community = "Community"


class PlatformStatus(str, enum.Enum):
    connected = "connected"
    disconnected = "disconnected"
    error = "error"
    pending = "pending"


class AssetType(str, enum.Enum):
    video = "video"
    image = "image"
    audio = "audio"
    document = "document"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()")
    email = Column(String(255), unique=True, nullable=False)
    display_name = Column(String(100))
    role = Column(SQLEnum(UserRole), default=UserRole.viewer)
    avatar_url = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    settings = Column(JSON, default={})

    videos = relationship("Video", back_populates="user")
    content = relationship("PlatformContent", back_populates="user")
    calendar_posts = relationship("CalendarPost", back_populates="user")
    approval_history = relationship("ApprovalHistory", back_populates="reviewer")


class Video(Base):
    __tablename__ = "videos"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()")
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    source_path = Column(Text)
    storage_path = Column(Text)
    thumbnail_url = Column(Text)
    duration_sec = Column(Integer)
    duration_formatted = Column(String(10))
    category = Column(String(50))
    tags = Column(JSON, default=[])
    transcript = Column(Text)
    status = Column(SQLEnum(VideoStatus), default=VideoStatus.uploaded)
    processing_progress = Column(Float, default=0)
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="videos")
    clips = relationship("Clip", back_populates="video")
    assets = relationship("Asset", back_populates="video")


class Clip(Base):
    __tablename__ = "clips"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()")
    video_id = Column(UUID(as_uuid=True), ForeignKey("videos.id"), nullable=False)
    title = Column(String(300))
    hook = Column(String(500))
    description = Column(Text)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    duration_sec = Column(Integer)
    topic = Column(String(100))
    category = Column(String(50))
    transcript_excerpt = Column(Text)
    on_screen_text = Column(Text)
    subtitle_instructions = Column(Text)
    thumbnail_url = Column(Text)
    confidence_score = Column(Float)
    status = Column(SQLEnum(ContentStatus), default=ContentStatus.draft)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    video = relationship("Video", back_populates="clips")
    platform_contents = relationship("PlatformContent", back_populates="clip")


class Platform(Base):
    __tablename__ = "platforms"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()")
    name = Column(String(50), unique=True, nullable=False)
    display_name = Column(String(50), nullable=False)
    handle = Column(String(100))
    api_provider = Column(String(50))
    credentials = Column(JSON)
    connection_status = Column(SQLEnum(PlatformStatus), default=PlatformStatus.disconnected)
    last_posted = Column(DateTime)
    post_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    content = relationship("PlatformContent", back_populates="platform")
    calendar_posts = relationship("CalendarPost", back_populates="platform")


class PlatformContent(Base):
    __tablename__ = "platform_content"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()")
    clip_id = Column(UUID(as_uuid=True), ForeignKey("clips.id"))
    platform_id = Column(UUID(as_uuid=True), ForeignKey("platforms.id"), nullable=False)
    content_type = Column(String(50), nullable=False)
    title = Column(String(300))
    caption = Column(Text)
    hook = Column(String(500))
    hashtags = Column(JSON, default=[])
    cta = Column(Text)
    on_screen_text = Column(Text)
    subtitle_instructions = Column(Text)
    thumbnail_concept = Column(Text)
    format_type = Column(String(20))
    status = Column(SQLEnum(ContentStatus), default=ContentStatus.draft)
    scheduled_at = Column(DateTime)
    published_at = Column(DateTime)
    platform_post_id = Column(Text)
    published_url = Column(Text)
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    clip = relationship("Clip", back_populates="platform_contents")
    platform = relationship("Platform", back_populates="content")
    user = relationship("User")


class CalendarPost(Base):
    __tablename__ = "calendar_posts"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()")
    post_id = Column(UUID(as_uuid=True), ForeignKey("platform_content.id"), nullable=False)
    date = Column(String(10), nullable=False)
    time = Column(String(5), nullable=False)
    platform_id = Column(UUID(as_uuid=True), ForeignKey("platforms.id"), nullable=False)
    pillar = Column(SQLEnum(Pillar))
    format_type = Column(String(50))
    status = Column(SQLEnum(CalendarStatus), default=CalendarStatus.idea)
    scheduled_at = Column(DateTime)
    published_url = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    platform = relationship("Platform", back_populates="calendar_posts")
    user = relationship("User")


class ApprovalHistory(Base):
    __tablename__ = "approval_history"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()")
    post_id = Column(UUID(as_uuid=True), ForeignKey("platform_content.id"), nullable=False)
    status = Column(String(20), nullable=False)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    reviewed_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text)
    action = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    reviewer = relationship("User", back_populates="approval_history")


class Analytics(Base):
    __tablename__ = "analytics"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()")
    post_id = Column(UUID(as_uuid=True), ForeignKey("platform_content.id"))
    platform_id = Column(UUID(as_uuid=True), ForeignKey("platforms.id"))
    views = Column(Integer, default=0)
    reach = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    saves = Column(Integer, default=0)
    engagement_rate = Column(Float, default=0)
    click_through_rate = Column(Float, default=0)
    watch_time = Column(Integer, default=0)
    retention_rate = Column(Float, default=0)
    impressions = Column(Integer, default=0)
    recorded_at = Column(DateTime, default=datetime.utcnow)


class Asset(Base):
    __tablename__ = "assets"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()")
    video_id = Column(UUID(as_uuid=True), ForeignKey("videos.id"))
    asset_type = Column(SQLEnum(AssetType), nullable=False)
    file_name = Column(String(500))
    file_path = Column(Text)
    storage_path = Column(Text)
    tags = Column(JSON, default=[])
    thumbnail_url = Column(Text)
    duration_sec = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

    video = relationship("Video", back_populates="assets")
