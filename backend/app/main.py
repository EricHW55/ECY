from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

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

# 프론트 정적 파일 서빙(배포 시)
app.mount("/", StaticFiles(directory=settings.STATIC_DIR, html=True), name="static")
