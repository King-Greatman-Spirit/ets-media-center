from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from api import auth, videos, clips, content, calendar, platforms, analytics, assets
from api import engine as engine_api
from core.config import settings
from db.session import engine as db_engine
from models import Base
from core.exceptions import app_exception_handler


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=db_engine)
    yield
    db_engine.dispose()


app = FastAPI(
    title="ETS Media Command Center",
    description="AI-powered content engine for End Time Soldiers ministry",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(Exception, app_exception_handler)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(videos.router, prefix="/api/videos", tags=["Videos"])
app.include_router(clips.router, prefix="/api/clips", tags=["Clips"])
app.include_router(content.router, prefix="/api/content", tags=["Content"])
app.include_router(calendar.router, prefix="/api/calendar", tags=["Calendar"])
app.include_router(platforms.router, prefix="/api/platforms", tags=["Platforms"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(engine_api.router, prefix="/api/engine", tags=["Engine"])
app.include_router(assets.router, prefix="/api/assets", tags=["Assets"])


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "app": settings.APP_NAME, "version": settings.APP_VERSION}
