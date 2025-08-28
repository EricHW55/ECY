from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Optional, List


BASE_DIR = Path(__file__).resolve().parent.parent   # backend/
ROOT_DIR = BASE_DIR.parent                          # 프로젝트 루트
DEFAULT_STATIC = ROOT_DIR / "frontend" / "dist"     # Vite 기준


class Settings(BaseSettings):
    APP_NAME: str = "ECY 알바 API"
    # 프론트 정적 파일 빌드 위치(배포 시 사용)
    STATIC_DIR: str = str(DEFAULT_STATIC)  # .env로 덮어쓸 수 있음
    # 개발 중 프론트가 다른 포트에서 뜨면 CORS 허용
    CORS_ORIGINS: list[str] = []
    # 간단 관리자 보호용 헤더 코드(없으면 무효)
    ADMIN_CODE: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()
