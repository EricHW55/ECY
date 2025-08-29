# backend/app/database.py
from pathlib import Path
from typing import Any, Dict
from urllib.parse import urlparse

from sqlmodel import SQLModel, Session, create_engine
from sqlalchemy import text

from .settings import settings, BASE_DIR

DATABASE_URL = settings.DATABASE_URL

# 스킴 판별: 'postgresql+psycopg' -> 'postgresql' 로 정규화
parsed = urlparse(DATABASE_URL)
scheme = parsed.scheme.split("+", 1)[0]
IS_SQLITE = scheme == "sqlite"

# 엔진 옵션
engine_kwargs: Dict[str, Any] = {"pool_pre_ping": True}
if IS_SQLITE:
    # SQLite 전용 스레드 옵션
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Neon(서버리스 PG) 유휴 연결 대비
    engine_kwargs["pool_recycle"] = 300  # 초

engine = create_engine(DATABASE_URL, **engine_kwargs)

# SQLite 파일 경로일 경우만, 로컬 프로젝트 내부 폴더 생성
if IS_SQLITE:
    # urlparse('sqlite:///backend/data/ecy.db').path -> '/backend/data/ecy.db'
    db_path = (BASE_DIR / parsed.path.lstrip("/")).resolve()
    if str(db_path).startswith(str(BASE_DIR)):
        db_path.parent.mkdir(parents=True, exist_ok=True)


def init_db() -> None:
    """앱 시작 시 1회: 테이블/인덱스 생성 (+SQLite만 PRAGMA)"""
    from . import models  # metadata 등록 중요
    SQLModel.metadata.create_all(engine)

    # SQLite에서만 PRAGMA 적용
    if IS_SQLITE:
        with Session(engine) as s:
            s.exec(text("PRAGMA journal_mode=WAL;"))
            s.exec(text("PRAGMA synchronous=NORMAL;"))
            s.commit()

    # 인덱스는 양쪽 DB에서 안전 (Postgres/SQLite 둘 다 IF NOT EXISTS 지원)
    with Session(engine) as s:
        s.exec(text(
            "CREATE INDEX IF NOT EXISTS ix_worksession_started_at ON worksession(started_at)"
        ))
        s.exec(text(
            "CREATE INDEX IF NOT EXISTS ix_worksession_ended_at ON worksession(ended_at)"
        ))
        s.commit()


def get_session():
    """요청 단위 세션"""
    with Session(engine) as session:
        yield session
