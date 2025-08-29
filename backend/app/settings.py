from __future__ import annotations

import json
from pathlib import Path
from typing import Optional, List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
DEFAULT_STATIC = (BASE_DIR / "frontend" / "dist").as_posix()
DEFAULT_DB     = (BASE_DIR / "data" / "ecy.db").as_posix()


class Settings(BaseSettings):
    # pydantic-settings v2 스타일 설정
    model_config = SettingsConfigDict(
        env_file=(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    APP_NAME: str = "ECY 알바 API"

    # 프론트 정적 파일 (상대경로 허용: backend 기준으로 보정)
    STATIC_DIR: str = DEFAULT_STATIC

    # DB URL (예: sqlite:///data/ecy.db / 절대경로도 OK)
    DATABASE_URL: str = f"sqlite:///{DEFAULT_DB}"

    # 개발 중 CORS 허용 오리진
    # - JSON 배열: ["http://localhost:5173","https://foo"]
    # - 콤마 문자열: http://localhost:5173,https://foo
    # - 빈 값/누락: 비활성화
    CORS_ORIGINS: Optional[List[str]] = None

    # 간단 관리자 보호용 헤더 코드
    ADMIN_CODE: Optional[str] = None

    # ---- Validators -------------------------------------------------

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _coerce_cors(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, list):
            return [str(x) for x in v]
        if isinstance(v, str):
            s = v.strip()
            if not s:
                return None
            # JSON 배열 시도
            try:
                parsed = json.loads(s)
                if isinstance(parsed, list):
                    return [str(x) for x in parsed]
            except Exception:
                pass
            # 콤마 구분 문자열 허용
            return [p.strip() for p in s.split(",") if p.strip()]
        return None

    @field_validator("STATIC_DIR", mode="before")
    @classmethod
    def _abs_static(cls, v: str) -> str:
        if not v:
            return DEFAULT_STATIC
        p = Path(v)
        if not p.is_absolute():
            p = BASE_DIR / p  # backend 기준 상대경로 보정
        return p.resolve().as_posix()

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def _normalize_sqlite(cls, v: str) -> str:
        # sqlite:///상대경로  → backend 기준 절대경로로 변환
        # sqlite:////절대경로 → 그대로 사용
        if not isinstance(v, str):
            return v
        prefix = "sqlite:///"
        if v.startswith(prefix) and not v.startswith("sqlite:////"):
            rel = v[len(prefix):]
            abs_path = (BASE_DIR / rel).resolve().as_posix()
            return f"sqlite:///{abs_path}"
        return v


settings = Settings()
