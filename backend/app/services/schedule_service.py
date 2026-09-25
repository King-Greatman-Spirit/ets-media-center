from typing import List, Dict
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import CalendarPost, PlatformContent, ContentStatus, CalendarStatus, Pillar
from schemas import CalendarPostCreate


PILLAR_PRIORITY = {
    "Scripture & Prayer": {"6AM": 1, "12PM": 0.7, "6PM": 0.5},
    "Teaching & Sermon": {"6AM": 0.3, "12PM": 1, "6PM": 0.6},
    "Gospel & Worship": {"6AM": 0.4, "12PM": 0.5, "6PM": 1},
    "Encouragement": {"6AM": 1, "12PM": 0.6, "6PM": 0.7},
    "Evangelism": {"6AM": 0.5, "12PM": 0.4, "6PM": 1},
    "Discipleship": {"6AM": 0.6, "12PM": 1, "6PM": 0.4},
    "Community": {"6AM": 0.3, "12PM": 0.7, "6PM": 0.8}
}


def schedule_content_items(dates: List[str], pillars: List[str] = None, db: Session = None) -> dict:
    if not db:
        return {"error": "Database session required"}

    approved_content = db.query(PlatformContent).filter(
        PlatformContent.status == ContentStatus.approved.value
    ).all()

    if not approved_content:
        return {"message": "No approved content to schedule"}

    schedule_results = {"scheduled": 0, "failed": 0}

    for date_str in dates:
        time_slots = [("6:00 AM", "06:00"), ("12:00 PM", "12:00"), ("6:00 PM", "18:00")]

        for time_label, time_value in time_slots:
            available_content = [c for c in approved_content if c.status == ContentStatus.approved.value]

            if not available_content:
                break

            selected = select_best_content(available_content, time_label, pillars)
            if selected:
                entry = CalendarPost(
                    post_id=selected.id,
                    date=date_str,
                    time=time_value,
                    platform_id=selected.platform_id,
                    pillar=selected.topic or "General",
                    format_type=selected.format_type,
                    status=CalendarStatus.scheduled.value,
                    scheduled_at=datetime.utcnow()
                )
                db.add(entry)
                selected.status = ContentStatus.scheduled.value
                schedule_results["scheduled"] += 1

    db.commit()
    return schedule_results


def select_best_content(content_list: List, time_slot: str, pillars: List[str] = None):
    if pillars:
        filtered = [c for c in content_list if c.topic in pillars]
    else:
        filtered = content_list

    if not filtered:
        return content_list[0] if content_list else None

    filtered.sort(key=lambda c: get_content_priority(c, time_slot), reverse=True)
    return filtered[0]


def get_content_priority(content, time_slot: str) -> float:
    topic = content.topic or "General"
    priority_map = PILLAR_PRIORITY.get(topic, {"6AM": 0.5, "12PM": 0.5, "6PM": 0.5})
    return priority_map.get(time_slot, 0.5)


def create_daily_schedule(num_days: int = 30, pillars: List[str] = None, db: Session = None) -> dict:
    if not db:
        return {"error": "Database session required"}

    dates = []
    for i in range(num_days):
        date = datetime.now() + timedelta(days=i)
        dates.append(date.strftime("%Y-%m-%d"))

    return schedule_content_items(dates, pillars, db)


def fill_empty_slots(db: Session, dates: List[str]) -> dict:
    existing = db.query(CalendarPost).all()
    existing_dates = {e.date for e in existing}
    empty_dates = [d for d in dates if d not in existing_dates]

    if not empty_dates:
        return {"message": "All dates scheduled"}

    return {"empty_dates": len(empty_dates), "message": f"Need {len(empty_dates)} additional posts"}
