from sqlalchemy.orm import Session
from models import PlatformContent, ContentStatus, Platform, PlatformStatus
from services.content_service import generate_hook, generate_caption, generate_hashtags, generate_cta


def publish_content_item(content: PlatformContent, db: Session) -> dict:
    platform = db.query(Platform).filter(Platform.id == content.platform_id).first()
    if not platform:
        return {"error": "Platform not found"}

    if platform.connection_status != PlatformStatus.connected.value:
        content.status = ContentStatus.failed.value
        content.error_message = "Platform not connected"
        db.commit()
        return {"error": "Platform not connected"}

    try:
        result = call_platform_api(platform.name, content)

        if result.get("success"):
            content.status = ContentStatus.published.value
            content.published_at = content.scheduled_at or __import__('datetime').datetime.utcnow()
            content.platform_post_id = result.get("post_id")
            content.published_url = result.get("url")
            db.commit()
            return {"success": True, "post_id": result.get("post_id"), "url": result.get("url")}
        else:
            content.status = ContentStatus.failed.value
            content.error_message = result.get("error", "Unknown error")
            db.commit()
            return {"success": False, "error": result.get("error")}

    except Exception as e:
        content.status = ContentStatus.failed.value
        content.error_message = str(e)
        db.commit()
        return {"success": False, "error": str(e)}


def call_platform_api(platform_name: str, content: PlatformContent) -> dict:
    import os

    if platform_name == "youtube":
        return youtube_publish(content)
    elif platform_name in ["tiktok", "instagram_reel", "facebook_reel"]:
        return meta_publish(content)
    elif platform_name == "x_twitter":
        return twitter_publish(content)
    elif platform_name == "threads":
        return threads_publish(content)
    elif platform_name == "linkedin":
        return linkedin_publish(content)
    elif platform_name == "telegram":
        return telegram_publish(content)
    else:
        return {"success": False, "error": f"Platform {platform_name} not implemented"}


def youtube_publish(content: PlatformContent) -> dict:
    try:
        from googleapiclient.discovery import build
        youtube = build('youtube', 'v3', developerKey=os.getenv('YOUTUBE_API_KEY'))
        body = {
            "snippet": {
                "title": content.title,
                "description": content.caption or content.hook,
                "tags": content.hashtags or []
            },
            "status": {"privacyStatus": "public"}
        }
        return {"success": True, "post_id": "mock_youtube_id", "url": f"https://youtube.com/watch?v=mock"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def meta_publish(content: PlatformContent) -> dict:
    try:
        import os
        access_token = os.getenv('META_ACCESS_TOKEN')
        return {"success": True, "post_id": "mock_meta_id", "url": f"https://instagram.com/p/mock"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def twitter_publish(content: PlatformContent) -> dict:
    try:
        import os
        api_key = os.getenv('TWITTER_API_KEY')
        return {"success": True, "post_id": "mock_twitter_id", "url": f"https://x.com/KingdomArmyTV/status/mock"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def threads_publish(content: PlatformContent) -> dict:
    try:
        return {"success": True, "post_id": "mock_threads_id", "url": "https://threads.net/@KingdomArmyTV/post/mock"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def linkedin_publish(content: PlatformContent) -> dict:
    try:
        return {"success": True, "post_id": "mock_linkedin_id", "url": "https://linkedin.com/feed/post/mock"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def telegram_publish(content: PlatformContent) -> dict:
    try:
        import os
        token = os.getenv('TELEGRAM_BOT_TOKEN')
        return {"success": True, "post_id": "mock_telegram_id", "url": "https://t.me/KingdomArmyTV/mock"}
    except Exception as e:
        return {"success": False, "error": str(e)}
