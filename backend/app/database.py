from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite precisa disso pra funcionar com FastAPI
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependência do FastAPI — abre a sessão, entrega pro endpoint e fecha certinho no final."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
