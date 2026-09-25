from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from core.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, echo=False)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)


def execute_query(query: str, params: dict = None):
    with SessionLocal() as db:
        if params:
            result = db.execute(text(query), params)
        else:
            result = db.execute(text(query))
        return result
        db.commit()
