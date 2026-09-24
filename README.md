# End Time Soldiers Media Command Center
## Complete AI-powered content engine for Christian Kingdom media ministry

## Overview
The ETS Media Command Center is a full-stack application that automates the entire content pipeline for End Time Soldiers ministry. It transforms raw video/audio into platform-optimized content across 8+ platforms, schedules it, manages approval, publishes it, and tracks performance.

## Architecture
- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **Backend**: FastAPI (Python) + PostgreSQL + Supabase
- **AI**: OpenAI GPT-4o, Whisper for transcription
- **Queue**: Celery + Redis
- **Storage**: Supabase Storage + local file system
- **Containerization**: Docker + Docker Compose

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker + Docker Compose
- FFmpeg installed
- Whisper installed (`pip install openai-whisper`)

### Setup
1. Copy `.env.example` to `.env` and fill in credentials
2. `docker-compose up --build`
3. Or run individually:
   - Backend: `cd backend && pip install -r requirements.txt && uvicorn main:app --reload`
   - Frontend: `cd frontend && npm install && npm run dev`

### Access
- Dashboard: http://localhost:3000
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Project Structure
See `DOCUMENTATION.md` for complete architecture, algorithms, pseudocode, and implementation steps.

## License
End Time Soldiers Ministry - All rights reserved
