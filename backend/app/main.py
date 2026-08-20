"""PromptFlow API 入口。

启动：python -m uvicorn app.main:app --port 8000
"""
import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.exceptions import StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from .config import settings
from .database import Base, SessionLocal, engine
from .routers import admin, auth, creator, export_api, market, me, render_api, share, templates

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("promptflow")

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="带变量的链式工作流 Prompt 模板交易市场（MVP）",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(request, exc: StarletteHTTPException):
    """契约错误格式：{"error": {...}}（PRD 5 错误规范）。"""
    detail = exc.detail
    if isinstance(detail, dict) and "error" in detail:
        return JSONResponse(status_code=exc.status_code, content=detail)
    if isinstance(detail, str):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": "HTTP_ERROR", "message": detail, "details": []}},
        )
    return JSONResponse(status_code=exc.status_code, content={"detail": detail})

API = "/api/v1"
app.include_router(auth.router, prefix=API)
app.include_router(templates.router, prefix=API)
app.include_router(render_api.router, prefix=API)
app.include_router(market.router, prefix=API)
app.include_router(export_api.router, prefix=API)
app.include_router(share.router, prefix=API)
app.include_router(me.router, prefix=API)
app.include_router(creator.router, prefix=API)
app.include_router(admin.router, prefix=API)


@app.on_event("startup")
def startup() -> None:
    data_dir = Path(settings.database_url.split("///")[-1]).parent
    if settings.database_url.startswith("sqlite"):
        data_dir.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    if settings.auto_seed:
        from .seed import seed

        db = SessionLocal()
        try:
            result = seed(db)
            logger.info("种子数据：%s", result)
        finally:
            db.close()


@app.get("/")
def index():
    return RedirectResponse(url="/docs")


@app.get("/api/v1/health")
def health():
    return {"ok": True}


@app.get("/api/v1/meta")
def meta():
    return {
        "app_name": settings.app_name,
        "version": settings.version,
        "marketplace_enabled": settings.marketplace_enabled,
    }
