from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Optional, List


BASE_DIR = Path(__file__).resolve().parent.parent   # backend/
# 프론트가 backend/ 아래로 들어갔으므로 여기가 기본 정적 경로
DEFAULT_STATIC = (BASE_DIR / "frontend" / "dist").as_posix()
DEFAULT_DB     = (BASE_DIR / "data" / "ecy.db").as_posix()


class Settings(BaseSettings):
    APP_NAME: str = "ECY 알바 API"
    
    # 프론트 정적 파일 빌드 위치(배포 시 사용)
    STATIC_DIR: str = str(DEFAULT_STATIC)  # .env로 덮어쓸 수 있음
    
    # DB 연결 문자열 (로컬 기본값 -> 서버에서 ENV로 덮어쓰기)
    DATABASE_URL: str = f"sqlite:///{DEFAULT_DB}"
    
    # 개발 중 프론트가 다른 포트에서 뜨면 CORS 허용
    CORS_ORIGINS: list[str] = []
    
    # 간단 관리자 보호용 헤더 코드(없으면 무효)
    ADMIN_CODE: Optional[str] = None

    class Config:
        # 절대경로로 지정해서 어디서 실행해도 잘 읽힘
        env_file = BASE_DIR / ".env"
        env_file_encoding = "utf-8"

settings = Settings()
