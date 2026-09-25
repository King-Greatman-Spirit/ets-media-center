from celery import Celery
from celery.schedules import crontab
from core.config import settings

celery_app = Celery(
    "ets_media_engine",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.DATABASE_URL
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

celery_app.conf.beat_schedule = {
    'run-media-engine-daily': {
        'task': 'workers.media_engine.run_engine_task',
        'schedule': crontab(minute=0, hour=0),
    },
    'publish-scheduled-posts': {
        'task': 'workers.publish_publisher.publish_scheduled',
        'schedule': crontab(minute='*/5'),
    },
    'collect-analytics-daily': {
        'task': 'workers.analytics_collector.collect_daily',
        'schedule': crontab(minute=0, hour=1),
    },
}


@celery_app.task
def run_engine_task():
    from services.engine_service import run_media_engine
    from db.session import SessionLocal
    db = SessionLocal()
    try:
        return run_media_engine(dry_run=False, db=db)
    finally:
        db.close()


@celery_app.task
def publish_scheduled():
    from services.publish_service import publish_content_item
    from models import PlatformContent, ContentStatus
    from db.session import SessionLocal
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        posts = db.query(PlatformContent).filter(
            PlatformContent.status == ContentStatus.scheduled.value,
            PlatformContent.scheduled_at <= now
        ).all()
        results = []
        for post in posts:
            result = publish_content_item(post, db)
            results.append(result)
        return results
    finally:
        db.close()


@celery_app.task
def collect_daily():
    from models import Analytics, PlatformContent
    from db.session import SessionLocal
    db = SessionLocal()
    try:
        posts = db.query(PlatformContent).filter(
            PlatformContent.status == ContentStatus.published.value
        ).all()
        for post in posts:
            collect_post_analytics(post, db)
        return {"collected": len(posts)}
    finally:
        db.close()


def collect_post_analytics(post: PlatformContent, db: Session):
    pass


@celery_app.task
def process_video_task(video_id: str):
    from services.video_service import process_video
    from db.session import SessionLocal
    from models import VideoStatus
    db = SessionLocal()
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        if video and video.status == VideoStatus.uploaded.value:
            return process_video(video_id, db)
    finally:
        db.close()