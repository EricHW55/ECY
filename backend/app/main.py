import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .settings import settings
from .database import init_db
from .routers import priority, links, timer
from .admin import setup_admin

app = FastAPI(title=settings.APP_NAME)

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


# 프론트 dist가 있을 때만 mount + SPA fallback
if settings.STATIC_DIR:
    try:
        if os.path.exists(settings.STATIC_DIR):
            app.mount("/", StaticFiles(directory=settings.STATIC_DIR, html=True), name="static")

            @app.get("/{full_path:path}")
            def spa_fallback(full_path: str):
                return FileResponse(os.path.join(settings.STATIC_DIR, "index.html"))
        else:
            logging.warning(f"STATIC_DIR not found: {settings.STATIC_DIR} (mount skipped)")
    except Exception as e:
        logging.exception(f"STATIC_DIR mount failed: {e}")