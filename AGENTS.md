# AGENTS.md - End Time Soldiers Media Command Center

## System Architecture Overview

This repository contains the complete source code for the ETS Media Command Center v2.0 - an AI-powered content management system for End Time Soldiers ministry.

## Core Technology Stack

### Frontend
- **Framework**: React 19 + Next.js 15
- **Routing**: TanStack Router (file-based)
- **State Management**: Zustand + TanStack Query
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS v4
- **Build Tool**: Vite
- **AI SDK**: Vercel AI SDK + @ai-sdk/openai

### Backend
- **API Framework**: FastAPI (Python)
- **Database**: PostgreSQL + Supabase
- **AI Processing**: OpenAI GPT-4o + Whisper
- **Vector Database**: pgvector
- **Task Queue**: Celery + Redis
- **Video Processing**: FFmpeg

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **CI/CD**: Docker-based deployment

## Key Directories

### Frontend (`src/`)
- `routes/` - TanStack Router file-based routes
- `components/` - Reusable UI components (app, brand, ui, studio, library, calendar, connections, da, autonomous)
- `lib/` - Core library files (platforms, data, ai.functions, ai-gateway.server)
- `store/` - Zustand state management
- `hooks/` - Custom React hooks
- `integrations/` - Supabase integration files
- `styles/` - Global CSS styles

### Backend (`backend/app/`)
- `api/` - FastAPI route handlers
- `core/` - Configuration, security, exceptions
- `db/` - Database session and connection
- `models/` - SQLAlchemy database models
- `schemas/` - Pydantic validation schemas
- `services/` - Business logic services
- `workers/` - Background task workers

### Supabase
- `migrations/` - Database migration scripts
- `config.toml` - Supabase configuration

## AI System Architecture

### Content Generation Pipeline
1. **Ingestion**: Video upload → FFprobe metadata → FFmpeg thumbnail
2. **Transcription**: Whisper AI generates full transcript with timestamps
3. **Analysis**: GPT-4o identifies Gospel, Teaching, Prayer, Worship moments
4. **Clipping**: 30-90 second clips extracted with confidence scoring
5. **Repurposing**: Platform-specific content generated for each channel
6. **Validation**: Brand compliance, Scripture accuracy, duplicate detection
7. **Scheduling**: Content placed in calendar at optimal times
8. **Publishing**: Auto-publish via platform APIs when approved and scheduled
9. **Analytics**: Performance metrics collected and analyzed

### AI Agents
Each agent operates autonomously at three levels:
- **Assisted**: Human approves each step
- **Semi-Autonomous**: AI proposes, human approves execution
- **Full Autonomous**: AI plans, executes, self-reports

Agents include: Repurpose, Schedule, Publish, Analyze, Scout

### DA/BI Analytics
- KPI tracking across all platforms
- Engagement rate analysis
- Trend detection and pattern analysis
- Automated insight generation
- AI-powered report generation

## Development Workflow

### Local Development
```bash
# Copy environment file
cp .env.example .env

# Start all services
docker-compose up --build

# Or run individually:
# Backend
cd backend && pip install -r requirements.txt && uvicorn main:app --reload

# Frontend
cd frontend && npm install && npm run dev

# Workers
cd backend && celery -A workers.media_engine worker --loglevel=info
```

### Database Migrations
```bash
cd backend && alembic revision --autogenerate -m "message"
cd backend && alembic upgrade head
```

## Security Guidelines
- Never commit API keys or credentials
- Always use .env for configuration
- Supabase RLS protects all data
- Encrypted credential storage
- OAuth-based authentication
- Role-based access control (admin, editor, viewer)

## Content Brand Guidelines
- **NEVER** fabricate Scripture or quotes
- **NEVER** use deceptive clickbait
- **NEVER** add fear-mongering content
- **ALWAYS** verify Bible references
- **ALWAYS** distinguish Scripture from preacher statements
- **ALWAYS** maintain brand integrity

## Quality Assurance
- All AI-generated content goes through validation
- Scripture references are checked against trusted sources
- Brand compliance is verified before approval
- Duplicate detection prevents redundant content
- Quality control checks run before publishing
- Failed publishes are logged and retried

## Contributing
1. Create a feature branch
2. Follow the existing code patterns
3. Add appropriate tests
4. Update documentation
5. Ensure all AI content follows brand guidelines
6. Verify database migrations are correct
7. Test across all platforms

## Contact
For questions or issues, contact the End Time Soldiers media team.

**Tagline**: Raising bold believers ⚔️
**Link**: https://linktr.ee/endtimesoldiers
