/* ============================================================
   END TIME SOLDIERS MEDIA COMMAND CENTER v2.0
   Complete System Documentation
   ============================================================

   ╔══════════════════════════════════════════════════════════╗
   ║          ULTIMATE SYSTEM ARCHITECTURE                     ║
   ║    DA/BI + AI/ML + AGENTIC + AUTONOMOUS                  ║
   ╚══════════════════════════════════════════════════════════╝

   === PROJECT OVERVIEW ===
   The ETS Media Command Center v2.0 is a comprehensive AI-powered
   content management system for the End Time Soldiers Christian ministry.
   
   It goes far beyond content scheduling - it includes autonomous AI
   agents, DA/BI analytics, machine learning embeddings, and fully
   autonomous operations that can run without human intervention.

   === CORE MODULES ===

   ┌─────────────────────────────────────────────────────────┐
   │ 1. FRONTEND (Vite + React 19 + TanStack Router + Supabase)│
   │    - Dashboard with DA/BI KPIs                          │
   │    - Media Library with AI-powered organization          │
   │    - AI Studio with agentic content generation           │
   │    - Calendar with autonomous scheduling                 │
   │    - DA/BI Analytics with AI insights                    │
   │    - Autonomous Operations Control Center                │
   │    - Platform Connections                                │
   ├─────────────────────────────────────────────────────────┤
   │ 2. BACKEND (FastAPI + PostgreSQL + Supabase)             │
   │    - Complete database schema with vector embeddings     │
   │    - API routes for all operations                       │
   │    - AI services (OpenAI, Whisper, embeddings)           │
   │    - Content generation and repurposing                  │
   │    - Publishing dispatch                                 │
   │    - Scheduling engine                                   │
   │    - Analytics collection                                │
   ├─────────────────────────────────────────────────────────┤
   │ 3. AI/ML SYSTEM                                         │
   │    - GPT-4o for content generation                       │
   │    - Whisper for video transcription                     │
   │    - Text embeddings for semantic search                 │
   │    - AI analysis of video content                        │
   │    - Automatic Scripture verification                    │
   │    - Content quality scoring                             │
   ├─────────────────────────────────────────────────────────┤
   │ 4. AGENTIC SYSTEM (Autonomous AI Agents)                 │
   │    - Content Repurpose Agent                             │
   │    - Schedule Optimizer Agent                            │
   │    - Publish Dispatch Agent                              │
   │    - Analytics Scout Agent                               │
   │    - Content Scout Agent                                 │
   │    - Three autonomy levels: Assisted, Semi, Full         │
   │    - Agent execution history and tracking                │
   ├─────────────────────────────────────────────────────────┤
   │ 5. DA/BI SYSTEM (Data Analytics / Business Intelligence) │
   │    - KPI tracking and visualization                      │
   │    - Engagement analytics per platform                   │
   │    - Content performance rankings                        │
   │    - Trend detection and pattern analysis                │
   │    - Automated insight generation                        │
   │    - Customizable dashboards                             │
   │    - AI-powered reports                                  │
   ├─────────────────────────────────────────────────────────┤
   │ 6. AUTONOMOUS OPERATIONS                                │
   │    - Agent scheduling with cron                          │
   │    - Automatic content generation cycles                 │
   │    - Self-publishing when approved                       │
   │    - Auto-retry on failures                              │
   │    - Continuous analytics collection                     │
   │    - Self-healing operations                             │
   │    - Automation logs and audit trail                     │
   ├─────────────────────────────────────────────────────────┤
   │ 7. SUPABASE BACKEND                                     │
   │    - PostgreSQL with pgvector for AI                     │
   │    - Row Level Security (RLS)                            │
   │    - Real-time subscriptions                            │
   │    - Authentication and authorization                    │
   │    - Storage for videos and assets                       │
   │    - Edge functions                                      │
   └─────────────────────────────────────────────────────────┘

   === DATABASE TABLES ===
   - users (authentication)
   - videos (uploaded media)
   - clips (identified moments from videos)
   - platforms (connected social media accounts)
   - platform_content (generated posts per platform)
   - calendar (scheduled posts)
   - ai_tasks (AI processing queue)
   - embeddings (vector embeddings for search)
   - ai_models_registry (available AI models)
   - agents (autonomous agent definitions)
   - agent_executions (agent run history)
   - analytics_events (raw analytics data)
   - da_dashboards (customizable DA/BI dashboards)
   - da_reports (generated reports)
   - kpis (key performance indicators)
   - insights (AI-generated insights)
   - automations (automation rules)
   - automation_logs (automation execution logs)
   - assets (uploaded media files)

   === AI AGENTS ===
   1. Content Repurpose Agent (autonomous)
      - Analyzes videos for Gospel, Teaching, Prayer, Worship moments
      - Scores content by theological depth
      - Generates platform-specific content
      - NEVER fabricates content

   2. Schedule Optimizer Agent (autonomous)
      - Analyzes engagement patterns
      - Optimizes posting times per platform
      - Balances content pillars
      - Avoids duplicates

   3. Publish Dispatch Agent (autonomous)
      - Publishes approved content at scheduled times
      - Handles errors with retry logic
      - Records publishing results
      - Updates analytics tracking

   4. Analytics Scout Agent (autonomous)
      - Continuously monitors performance
      - Identifies trends and patterns
      - Detects anomalies
      - Generates actionable insights

   5. Content Scout Agent (autonomous)
      - Scans for unprocessed content
      - Identifies content gaps
      - Recommends new angles
      - Suggests calendar improvements

   === AUTONOMY LEVELS ===
   - Assisted: Human approves each AI suggestion before action
   - Semi-Autonomous: AI proposes plans, human approves execution
   - Full Autonomous: AI plans, executes, and self-reports

   === DEPLOYMENT ===
   1. Copy .env.example to .env and fill in credentials
   2. docker-compose up --build
   3. Access Dashboard: http://localhost:5173
   4. Access API: http://localhost:8000
   5. Access API Docs: http://localhost:8000/docs

   === KEY FEATURES ===
   - Upload videos and AI auto-analyzes them
   - AI identifies best moments and creates clips
   - Platform-specific content generation
   - Autonomous scheduling and publishing
   - DA/BI analytics with AI insights
   - Autonomous AI agents that work 24/7
   - Vector search for content discovery
   - Complete audit trail
   - Brand compliance checking
   - Scripture verification
   - Three-tier approval workflow
   - Automated retry and error handling

   === SECURITY ===
   - Supabase Row Level Security
   - Encrypted credentials
   - OAuth-based authentication
   - No plaintext password storage
   - API key rotation support
   - Role-based access control
   - Content validation before publishing

   === BRAND CONSTRAINTS ===
   - Never use deceptive clickbait
   - Never invent Bible verses or quotes
   - Always distinguish Scripture from preacher statements
   - No political/controversial content without approval
   - Truth → Christ → Edification → Reach → Engagement → Kingdom Impact

   === POSTING SCHEDULE ===
   - 6:00 AM: Scripture, Prayer, Worship, Encouragement
   - 12:00 PM: Teaching, Sermon Clips, Insights
   - 6:00 PM: Gospel, Worship, Prayer, YouTube Promotion

   === PLATFORMS ===
   YouTube, YouTube Shorts, TikTok, Instagram, Facebook,
   X/Twitter, Threads, LinkedIn, Telegram, Substack

   === DOCUMENTATION ===
   See DOCUMENTATION.md for complete architecture,
   algorithms, pseudocode, flowcharts, and implementation steps.

   ╔══════════════════════════════════════════════════════════╗
   ║  End Time Soldiers | Raising Bold Believers ⚔️          ║
   ║  Link: https://linktr.ee/endtimesoldiers                 ║
   ╚══════════════════════════════════════════════════════════╝
*/
