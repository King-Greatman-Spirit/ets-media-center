import openai
import os
from typing import List, Dict
from sqlalchemy.orm import Session
from models import Clip, PlatformContent, ContentStatus, Platform
from schemas import PlatformContentCreate


def generate_hook(transcript_excerpt: str, platform: str, topic: str) -> str:
    try:
        client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        prompt = f"""Generate a compelling hook for a Christian ministry content piece.

Platform: {platform}
Topic: {topic}
Transcript excerpt: {transcript_excerpt[:500]}

Rules:
- Must capture attention in the first 1-3 seconds
- Must be accurate to the source material - never invent words
- Must be truthful and edifying
- Should be emotionally engaging but not clickbait
- Maximum 2 sentences
- Must include or reference Scripture if present

Return just the hook text."""
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return "A powerful message awaits - watch to the end"


def generate_caption(core_message: str, platform: str, topic: str, cta: str) -> str:
    try:
        client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        prompt = f"""Write a social media caption for End Time Soldiers ministry.

Platform: {platform}
Topic: {topic}
Core message: {core_message}
Call to action: {cta}

Brand: End Time Soldiers | Raising bold believers ⚔️
Link: https://linktr.ee/endtimesoldiers

Rules:
- Write naturally and clearly
- Include the brand tagline
- Include the linktr.ee link
- Add appropriate hashtags at the end
- Keep it authentic, not corporate
- Maximum platform-appropriate length
- Never invent Scripture or quotes

Return the caption only."""
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
            temperature=0.5
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return core_message[:200]


def generate_hashtags(topic: str, platform: str, count: int = 10) -> List[str]:
    base_hashtags = [
        "#EndTimeSoldiers", "#KingdomArmyTV", "#RaisingBoldBelievers",
        "#Scripture", "#Faith", "#ChristianTeaching", "#Gospel",
        "#Prayer", "#Worship", "#Bible"
    ]
    topic_hashtags = {
        "Gospel": ["#Gospel", "#Salvation", "#JesusSaves", "#GoodNews"],
        "Teaching": ["#BibleStudy", "#Teaching", "#Scripture"],
        "Prayer": ["#Prayer", "#IntercessoryPrayer", "#PrayWithoutCeasing"],
        "Worship": ["#Worship", "#PraiseGod", "#JesusIsLord"],
        "Evangelism": ["#Evangelism", "#SpreadTheWord", "#ShareTheGospel"],
        "Discipleship": ["#Discipleship", "#GrowInFaith", "#BiblicalLiving"]
    }

    all_hashtags = base_hashtags[:5]
    if topic in topic_hashtags:
        all_hashtags.extend(topic_hashtags[topic][:3])
    all_hashtags.extend(base_hashtags[5:8])

    return all_hashtags[:count]


def generate_cta(platform: str, topic: str) -> str:
    ctas = {
        "youtube": "Subscribe and hit the bell for daily encouragement",
        "tiktok": "Follow for daily bold faith content ⚔️",
        "instagram": "Follow @KingdomArmyTV for daily Scripture and prayer",
        "facebook": "Share this with someone who needs encouragement today",
        "x_twitter": "Retweet to spread this message",
        "threads": "What verse speaks to you today? Comment below",
        "linkedin": "Connect with us for Christian leadership insights",
        "telegram": "Join our broadcast channel for daily encouragement"
    }
    return ctas.get(platform, "Follow for more bold faith content")


def generate_on_screen_text(transcript_excerpt: str, platform: str) -> str:
    text = transcript_excerpt[:200].replace('\n', ' ')
    if len(text) > 200:
        text = text[:200] + '...'
    return text


def generate_subtitle_instructions(transcript_excerpt: str, platform: str) -> str:
    return f"Generate accurate subtitles for the following text: {transcript_excerpt[:300]}. Format as SRT or VTT."


def generate_thumbnail_concept(topic: str, platform: str) -> str:
    concepts = {
        "youtube": f"Bold gold text on obsidian background: '{topic}' with ETS logo and crown/kingdom imagery",
        "tiktok": f"Eye-catching gold text on dark background with fire/light effects for '{topic}'",
        "instagram": f"Clean gold and black design with Scripture-style typography for '{topic}'",
        "facebook": f"Warm gold banner with Scripture text for '{topic}'",
    }
    return concepts.get(platform, f"Professional graphic for '{topic}' in gold and obsidian")


def generate_platform_content(clip_id, platforms: List[str], db: Session) -> dict:
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if not clip:
        return {"error": "Clip not found"}

    results = []
    for platform_name in platforms:
        platform = db.query(Platform).filter(Platform.name == platform_name).first()
        if not platform:
            continue

        hook = generate_hook(
            clip.transcript_excerpt or "",
            platform_name,
            clip.topic or "General"
        )

        cta = generate_cta(platform_name, clip.topic or "General")
        hashtags = generate_hashtags(clip.topic or "General", platform_name, 10)
        caption = generate_caption(
            clip.description or clip.transcript_excerpt or "",
            platform_name,
            clip.topic or "General",
            cta
        )
        on_screen_text = generate_on_screen_text(
            clip.transcript_excerpt or "",
            platform_name
        )
        subtitle_instructions = generate_subtitle_instructions(
            clip.transcript_excerpt or "",
            platform_name
        )
        thumbnail_concept = generate_thumbnail_concept(
            clip.topic or "General",
            platform_name
        )

        content = PlatformContent(
            clip_id=clip_id,
            platform_id=platform.id,
            content_type="video",
            title=clip.title,
            caption=caption,
            hook=hook,
            hashtags=hashtags,
            cta=cta,
            on_screen_text=on_screen_text,
            subtitle_instructions=subtitle_instructions,
            thumbnail_concept=thumbnail_concept,
            format_type="portrait" if platform_name in ["tiktok", "instagram", "facebook"] else "landscape",
            status="draft"
        )
        db.add(content)
        results.append(content)

    db.commit()
    return {"generated": len(results), "content_ids": [r.id for r in results]}


def generate_ai_analysis(text: str, task: str) -> dict:
    try:
        client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": f"Task: {task}\n\nContent: {text[:5000]}"}],
            max_tokens=1000,
            temperature=0.5
        )
        return {"analysis": response.choices[0].message.content.strip()}
    except Exception:
        return {"analysis": "Unable to generate analysis"}
