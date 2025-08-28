# backend/app/database.py
from pathlib import Path
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text

# 프로젝트 루트 기준으로 절대 경로 안전하게
BASE_DIR = Path(__file__).resolve().parent.parent  # backend/app/ → backend/
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)                      # 폴더 없으면 생성
DB_PATH = DATA_DIR / "ecy.db"                      # 파일명 마음대로

DATABASE_URL = f"sqlite:///{DB_PATH}"

# SQLite는 기본적으로 스레드 제한이 있어서 이 옵션을 켭니다.
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    pool_pre_ping=True,
)

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
