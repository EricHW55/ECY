# backend/app/database.py
import os
from pathlib import Path
from urllib.parse import urlparse
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text
from .settings import settings, BASE_DIR


DATABASE_URL = settings.DATABASE_URL

# SQLite는 기본적으로 스레드 제한이 있어서 이 옵션을 켭니다.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)


# sqlite + 프로젝트 내부 상대경로일 때만 폴더 생성(서버 절대경로는 건드리지 않음)
try:
    parsed = urlparse(DATABASE_URL)
    if parsed.scheme == "sqlite":
        db_path = Path(parsed.path)
        if db_path.is_relative_to(BASE_DIR):
            db_path.parent.mkdir(parents=True, exist_ok=True)
except Exception:
    pass



def init_db() -> None:
    """앱 시작 시 1회 호출 → 파일/테이블/인덱스 생성 + PRAGMA 튜닝"""
    # 1) 테이블 생성
    from . import models  # 중요: 모델을 import해야 metadata에 등록됨
    SQLModel.metadata.create_all(engine)

    # 2) 선택: 인덱스/PRAGMA 등 1회 보강
    with Session(engine) as s:
        # 조회 성능용 인덱스(이미 있으면 건너뜀)
        s.exec(text("CREATE INDEX IF NOT EXISTS ix_worksession_started_at ON worksession(started_at)"))
        s.exec(text("CREATE INDEX IF NOT EXISTS ix_worksession_ended_at ON worksession(ended_at)"))
        # 동시성/성능 개선 (WAL)
        s.exec(text("PRAGMA journal_mode=WAL;"))
        s.exec(text("PRAGMA synchronous=NORMAL;"))
        s.commit()

def get_session():
    """요청마다 세션 열고 닫기 (FastAPI Depends에서 사용)"""
    with Session(engine) as session:
        yield session
