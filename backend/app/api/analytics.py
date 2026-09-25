from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from uuid import UUID

from db.session import get_db
from core.security import verify_token
from models import Analytics, PlatformContent
from schemas import AnalyticsCreate, AnalyticsResponse

router = APIRouter()


@router.get("/", response_model=List[AnalyticsResponse])
def list_analytics(
    post_id: Optional[UUID] = None,
    platform_id: Optional[UUID] = None,
    days: int = Query(30),
    skip: int = Query(0),
    limit: int = Query(100),
    db: Session = Depends(get_db),
    user_id: str = Depends(verify_token)
):
    query = db.query(Analytics)
    if post_id:
        query = query.filter(Analytics.post_id == post_id)
    if platform_id:
        query = query.filter(Analytics.platform_id == platform_id)
    analytics = query.offset(skip).limit(limit).all()
    return analytics


@router.post("/", response_model=AnalyticsResponse)
def record_analytics(data: AnalyticsCreate, db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    analytic = Analytics(**data.dict())
    db.add(analytic)
    db.commit()
    db.refresh(analytic)
    return analytic


@router.get("/summary", response_model=dict)
def get_analytics_summary(db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    from sqlalchemy import func

    total_posts = db.query(PlatformContent).count()
    published = db.query(PlatformContent).filter(PlatformContent.status == 'published').count()

    analytics_records = db.query(Analytics).all()
    total_views = sum(a.views for a in analytics_records)
    total_engagement = sum(a.likes + a.comments + a.shares for a in analytics_records)

    return {
        "total_posts": total_posts,
        "published_posts": published,
        "total_views": total_views,
        "total_engagement": total_engagement,
        "avg_engagement_rate": total_engagement / max(total_posts, 1),
        "period_days": 30
    }


@router.get("/recommendations", response_model=dict)
def get_recommendations(db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    from sqlalchemy import func

    analytics_records = db.query(Analytics).all()
    content_records = db.query(PlatformContent).filter(PlatformContent.status == 'published').all()

    topic_performance = {}
    for content in content_records:
        matching_analytics = [a for a in analytics_records if a.post_id == content.id]
        if matching_analytics:
            engagement = sum(a.likes + a.comments + a.shares for a in matching_analytics)
            topic = content.topic or "General"
            topic_performance[topic] = topic_performance.get(topic, 0) + engagement

    sorted_topics = sorted(topic_performance.items(), key=lambda x: x[1], reverse=True)

    return {
        "top_topics": sorted_topics[:5],
        "recommended_focus": sorted_topics[:3] if sorted_topics else ["Scripture", "Prayer", "Worship"],
        "content_strategy": "Focus on high-engagement topics while maintaining variety",
        "next_best_opportunities": [t[0] for t in sorted_topics[3:8]] if len(sorted_topics) > 3 else []
    }


@router.get("/top", response_model=dict)
def get_top_performing(db: Session = Depends(get_db), user_id: str = Depends(verify_token)):
    from sqlalchemy import func

    analytics_records = db.query(Analytics).order_by(Analytics.engagement_rate.desc()).limit(10).all()

    return {
        "top_posts": [
            {
                "post_id": a.post_id,
                "views": a.views,
                "engagement_rate": a.engagement_rate,
                "likes": a.likes,
                "comments": a.comments
            }
            for a in analytics_records
        ]
    }
