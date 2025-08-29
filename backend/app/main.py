import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .settings import settings
from .database import init_db
from .routers import priority, links, timer
from .admin import setup_admin

app = FastAPI(title=settings.APP_NAME)


# ── Health check (배포 상태 점검용) ─────────────────────────────
@app.get("/healthz")
def healthz():
    return {"ok": True}

# CORS(개발 중 프론트가 다른 포트일 때만 필요)
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.on_event("startup")
def on_start():
    init_db()
    setup_admin(app)

# API 라우터
app.include_router(timer.router)
app.include_router(priority.router)
app.include_router(links.router)


# ── 정적 서빙 + SPA fallback ──────────────────────────────────
# 1) 정적 파일(assets, index.html) 서빙: 디렉토리가 있을 때만 mount
_static_dir = None
if settings.STATIC_DIR:
    # 절대경로로 정규화
    cand = os.path.abspath(settings.STATIC_DIR)
    if os.path.isdir(cand):
        _static_dir = cand
        logging.info(f"Serving SPA from: {_static_dir}")
        # 정적 파일을 루트에 마운트 (파일 경로는 우선 파일 매칭)
        app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
    else:
        logging.warning(f"STATIC_DIR not found: {cand} (mount skipped)")

# 2) SPA fallback: 404이고 GET일 때만 index.html 반환
#    docs/redoc/openapi.json 같은 시스템 경로는 제외
_EXCLUDE_PREFIXES = ("/docs", "/redoc", "/openapi.json")

@app.middleware("http")
async def spa_fallback_on_404(request: Request, call_next):
    response = await call_next(request)
    if (
        response.status_code == 404
        and request.method == "GET"
        and _static_dir is not None
        and not any(request.url.path.startswith(p) for p in _EXCLUDE_PREFIXES)
    ):
        index_path = os.path.join(_static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
    return response