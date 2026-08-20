"""PromptFlow 配置。环境变量均可在 backend/.env 覆盖，默认值面向本地开发。"""
import os
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except Exception:  # dotenv 可选
    pass

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings:
    app_name: str = "PromptFlow"
    version: str = "1.0.0"

    # 数据库：开发/自部署 SQLite，生产可切 PostgreSQL（SQLAlchemy URL 即可）
    database_url: str = os.getenv(
        "DATABASE_URL", f"sqlite:///{(BASE_DIR / 'data' / 'promptflow.db').as_posix()}"
    )

    jwt_secret: str = os.getenv("JWT_SECRET", "promptflow-dev-secret-change-me")
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", str(60 * 24 * 7)))

    # 双模式开关：false 时关闭交易相关模块（订单/提现/评价/企业），仅保留模板库+编辑器+导出
    marketplace_enabled: bool = os.getenv("MARKETPLACE_ENABLED", "true").lower() not in (
        "0",
        "false",
        "no",
    )

    # 公开站点地址（用于导出物里的来源链接）
    public_base_url: str = os.getenv("PUBLIC_BASE_URL", "https://promptflow.example.com")

    cors_origins: list[str] = [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if o.strip()
    ]

    # 首次启动自动建表+种子（自部署体验友好）；生产可置 false 手动执行
    auto_seed: bool = os.getenv("AUTO_SEED", "true").lower() not in ("0", "false", "no")


settings = Settings()
