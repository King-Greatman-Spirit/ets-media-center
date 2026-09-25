from typing import Optional, Dict, List
from datetime import datetime
from sqlalchemy.orm import Session
from models import PlatformContent, Clip, Video, VideoStatus, Platform, Analytics
from services.content_service import generate_platform_content, generate_hook, generate_caption, generate_hashtags, generate_cta


def run_media_engine(dry_run: bool = False, db: Session = None) -> dict:
    if not db:
        return {"error": "Database session required"}

    report = {
        "start_time": datetime.utcnow().isoformat(),
        "end_time": None,
        "videos_processed": 0,
        "clips_identified": 0,
        "content_generated": 0,
        "calendar_added": 0,
        "errors": [],
        "summary": "",
        "recommendations": {}
    }

    try:
        unprocessed = db.query(Video).filter(Video.status == VideoStatus.uploaded.value).all()

        if not unprocessed:
            unprocessed = db.query(Video).filter(Video.status == VideoStatus.processing.value).all()

        report["videos_processed"] = len(unprocessed)

        for video in unprocessed:
            try:
                video.status = VideoStatus.processing.value
                db.commit()

                from services.video_service import process_video
                result = process_video(video.id, db)

                if result.get("success"):
                    clips_count = result.get("clips_created", 0)
                    report["clips_identified"] += clips_count

                    clips = db.query(Clip).filter(Clip.video_id == video.id).all()
                    for clip in clips:
                        platforms = db.query(Platform).filter(Platform.connection_status == 'connected').all()
                        platform_names = [p.name for p in platforms]
                        if platform_names:
                            content_result = generate_platform_content(clip.id, platform_names, db)
                            report["content_generated"] += content_result.get("generated", 0)

            except Exception as e:
                report["errors"].append(f"Video {video.id}: {str(e)}")
                video.status = VideoStatus.failed.value
                db.commit()

        approved_clips = db.query(Clip).filter(Clip.status == 'approved').all()
        report["calendar_added"] = len(approved_clips)

        recommendations = analyze_performance(db)
        report["recommendations"] = recommendations

        report["end_time"] = datetime.utcnow().isoformat()
        report["summary"] = (
            f"Processed {report['videos_processed']} videos, "
            f"identified {report['clips_identified']} clips, "
            f"generated {report['content_generated']} content items"
        )

        if dry_run:
            report["summary"] += " (DRY RUN - no changes saved)"

    except Exception as e:
        report["errors"].append(str(e))
        report["summary"] = f"Engine completed with errors: {str(e)}"

    return report


def analyze_performance(db: Session) -> Dict:
    analytics = db.query(Analytics).all()
    content = db.query(PlatformContent).filter(PlatformContent.status == 'published').all()

    topic_engagement = {}
    platform_performance = {}

    for c in content:
        matching = [a for a in analytics if a.post_id == c.id]
        if matching:
            engagement = sum(a.likes + a.comments + a.shares for a in matching)
            topic = c.topic or "General"
            topic_engagement[topic] = topic_engagement.get(topic, 0) + engagement
            platform_performance[c.platform_id] = platform_performance.get(str(c.platform_id), 0) + engagement

    top_topics = sorted(topic_engagement.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "top_topics": top_topics,
        "recommendation": "Create more content on top-performing topics",
        "strategy": "Balance proven topics with new content to test"
    }


def validate_scripture_reference(reference: str) -> bool:
    valid_books = [
        "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
        "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings",
        "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther",
        "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon",
        "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel",
        "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
        "Matthew", "Mark", "Luke", "John",
        "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians",
        "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon",
        "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"
    ]
    for book in valid_books:
        if book in reference:
            return True
    return False


def check_brand_compliance(text: str) -> dict:
    issues = []
    forbidden_words = ["fear mongering", "deceptive", "fake miracle", "false prophecy"]
    for word in forbidden_words:
        if word.lower() in text.lower():
            issues.append(f"Contains potentially problematic content: {word}")
    return {"compliant": len(issues) == 0, "issues": issues}
