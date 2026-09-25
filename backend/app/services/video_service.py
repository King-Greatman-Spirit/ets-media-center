import subprocess
import json
import os
from datetime import datetime
from sqlalchemy.orm import Session
from models import Video, Clip, VideoStatus
from schemas import ClipCreate


def extract_metadata(video_path: str) -> dict:
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', video_path],
            capture_output=True, text=True, timeout=30
        )
        metadata = json.loads(result.stdout)
        return {
            "duration": float(metadata['format']['duration']),
            "width": int(metadata['streams'][0].get('width', 0)),
            "height": int(metadata['streams'][0].get('height', 0)),
            "codec": metadata['streams'][0].get('codec_name', 'unknown'),
            "audio_rate": metadata['streams'][0].get('sample_rate', 'unknown')
        }
    except Exception as e:
        return {"duration": 0, "width": 0, "height": 0, "codec": "unknown"}


def generate_thumbnail(video_path: str, output_path: str, timestamp: float = 3.0):
    try:
        subprocess.run([
            'ffmpeg', '-y', '-i', video_path, '-ss', str(timestamp),
            '-vframes', '1', '-vf', 'scale=1280:720', output_path
        ], capture_output=True, timeout=15)
        return output_path
    except Exception as e:
        return None


def transcribe_video(video_path: str, model: str = None) -> str:
    if model is None:
        model = "large-v3"
    try:
        result = subprocess.run([
            'whisper', video_path, '--model', model, '--output_format', 'json',
            '--output_dir', '/tmp'
        ], capture_output=True, text=True, timeout=600)
        if result.returncode == 0:
            output_file = os.path.join('/tmp', os.path.basename(video_path).replace('.mp4', '.json'))
            if os.path.exists(output_file):
                with open(output_file) as f:
                    data = json.load(f)
                return data['text']
        return ""
    except Exception as e:
        return ""


def analyze_transcript(transcript: str) -> list:
    try:
        import openai
        client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": """You analyze Christian sermon/transcript transcripts and identify key content moments. For each segment, identify:
- Category: Gospel, Teaching, Prayer, Worship, Quote, Lesson, Testimony, Encouragement
- Strength score: 1-10
- Start time and end time (in seconds)
- A brief title for the moment
- Whether it contains Scripture, a powerful quote, a prayer, or testimony
Return JSON array of identified moments."""},
                {"role": "user", "content": f"Analyze this transcript and identify key content moments:\n\n{transcript[:8000]}"}
            ],
            max_tokens=2000,
            temperature=0.3
        )
        return json.loads(response.choices[0].message.content)
    except Exception:
        return []


def process_video(video_id: UUID, db: Session) -> dict:
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        return {"error": "Video not found"}

    video.status = VideoStatus.processing.value
    video.processing_progress = 10
    db.commit()

    try:
        metadata = extract_metadata(video.source_path or video.storage_path)
        video.duration_sec = metadata["duration"]
        video.duration_formatted = format_duration(metadata["duration"])
        video.processing_progress = 25
        db.commit()

        thumbnail_path = f"/tmp/{video_id}_thumb.jpg"
        generate_thumbnail(video.source_path or video.storage_path, thumbnail_path)
        video.thumbnail_url = thumbnail_path
        video.processing_progress = 40
        db.commit()

        transcript = transcribe_video(video.source_path or video.storage_path)
        video.transcript = transcript
        video.processing_progress = 60
        db.commit()

        if transcript:
            moments = analyze_transcript(transcript)
            for moment in moments:
                clip = Clip(
                    video_id=video_id,
                    title=moment.get('title', 'Untitled'),
                    start_time=moment.get('start_time', 0),
                    end_time=moment.get('end_time', 30),
                    topic=moment.get('category', 'General'),
                    description=moment.get('description', ''),
                    confidence_score=moment.get('strength_score', 5) / 10,
                    transcript_excerpt=moment.get('transcript_excerpt', '')[:500],
                    status='draft'
                )
                db.add(clip)

            video.status = VideoStatus.processed.value
            video.processing_progress = 100

        db.commit()
        return {"success": True, "clips_created": len(moments) if transcript else 0}

    except Exception as e:
        video.status = VideoStatus.failed.value
        video.error_message = str(e)
        db.commit()
        return {"error": str(e)}


def format_duration(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"


def generate_thumbnail_for_clip(clip_video_path: str, clip_start: float) -> str:
    output_path = f"/tmp/clip_{clip_start}_thumb.jpg"
    generate_thumbnail(clip_video_path, output_path, clip_start)
    return output_path
