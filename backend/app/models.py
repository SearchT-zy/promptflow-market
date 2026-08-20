"""PromptFlow 核心表（PRD 第 4 章，共 17 张）。
UUID 用 String(36) 存储以兼容 SQLite/PostgreSQL；金额一律以「分」为整数；
JSON 字段用 SQLAlchemy JSON 类型（PG 映射 JSONB，SQLite 存 TEXT）。
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid.uuid4())


# ---------- 1. users ----------
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="user")  # user/creator/enterprise/admin
    display_name: Mapped[str | None] = mapped_column(String(100))
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    bio: Mapped[str | None] = mapped_column(String(500))
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    balance_cents: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active/banned
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, onupdate=now_utc
    )


# ---------- 2. categories ----------
class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    sort: Mapped[int] = mapped_column(Integer, default=0)
    icon: Mapped[str | None] = mapped_column(String(20))


# ---------- 3. tags ----------
class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    use_count: Mapped[int] = mapped_column(Integer, default=0)


# ---------- 4. templates ----------
class Template(Base):
    __tablename__ = "templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    author_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    summary: Mapped[str] = mapped_column(String(500), default="")
    category_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("categories.id"))
    cover_url: Mapped[str | None] = mapped_column(String(500))
    template_type: Mapped[str] = mapped_column(String(20), nullable=False)  # single/chain
    # 草稿（工作副本）内容；已发布内容以 template_versions 快照为准
    steps_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    doc_md: Mapped[str] = mapped_column(Text, default="")
    sample_output: Mapped[str] = mapped_column(Text, default="")
    model_tags: Mapped[list] = mapped_column(JSON, default=list)
    price_cents: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft/reviewing/published/rejected/offline
    current_version: Mapped[str] = mapped_column(String(20), default="0.1.0")
    step_count: Mapped[int] = mapped_column(Integer, default=1)
    review_note: Mapped[str | None] = mapped_column(Text)  # 驳回原因等
    sales_count: Mapped[int] = mapped_column(Integer, default=0)
    rating_avg: Mapped[float] = mapped_column(Numeric(3, 2), default=0)
    rating_count: Mapped[int] = mapped_column(Integer, default=0)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    render_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, onupdate=now_utc
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    author: Mapped[User] = relationship()
    category: Mapped[Category | None] = relationship()

    __table_args__ = (
        Index("idx_templates_market", "category_id", "status", "published_at"),
        Index("idx_templates_author", "author_id", "status"),
    )


# ---------- 5. template_versions ----------
class TemplateVersion(Base):
    __tablename__ = "template_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    template_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("templates.id"), nullable=False, index=True
    )
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    # 整个模板不可变快照（title/summary/steps/variables/doc_md/sample_output/model_tags/price 等）
    snapshot_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    changelog: Mapped[str] = mapped_column(String(1000), default="")
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    __table_args__ = (
        UniqueConstraint("template_id", "version", name="uq_version_lookup"),
    )


# ---------- 6. template_variables ----------
class TemplateVariable(Base):
    __tablename__ = "template_variables"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    template_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("templates.id"), nullable=False, index=True
    )
    version: Mapped[str] = mapped_column(String(20), default="draft")  # draft=草稿；发布版本随快照锁定
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(String(100), default="")
    description: Mapped[str] = mapped_column(String(500), default="")
    var_type: Mapped[str] = mapped_column(String(20), default="string")  # string/text/number/select/boolean
    default_value: Mapped[str | None] = mapped_column(Text)
    options_json: Mapped[list | None] = mapped_column(JSON)
    required: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    __table_args__ = (
        UniqueConstraint("template_id", "version", "name", name="uq_template_var"),
    )


# ---------- 7. template_tags ----------
class TemplateTag(Base):
    __tablename__ = "template_tags"

    template_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("templates.id"), primary_key=True
    )
    tag_id: Mapped[int] = mapped_column(Integer, ForeignKey("tags.id"), primary_key=True)


# ---------- 8. orders ----------
class Order(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    order_no: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    buyer_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    template_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("templates.id"))
    order_type: Mapped[str] = mapped_column(String(20), default="buyout")  # buyout/pack/subscribe
    pack_id: Mapped[str | None] = mapped_column(String(36))
    amount_cents: Mapped[int] = mapped_column(Integer, default=0)
    channel: Mapped[str | None] = mapped_column(String(20))  # wechat/alipay
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending/paid/refunded/closed
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


# ---------- 9. purchases ----------
class Purchase(Base):
    __tablename__ = "purchases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    buyer_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    template_id: Mapped[str] = mapped_column(String(36), ForeignKey("templates.id"), nullable=False)
    locked_version: Mapped[str | None] = mapped_column(String(20))
    order_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("orders.id"))
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    __table_args__ = (
        UniqueConstraint("buyer_id", "template_id", name="uq_purchases_bt"),
    )


# ---------- 10. reviews ----------
class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    template_id: Mapped[str] = mapped_column(String(36), ForeignKey("templates.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)  # 1~5
    content: Mapped[str] = mapped_column(String(1000), default="")
    reply: Mapped[str | None] = mapped_column(String(1000))
    status: Mapped[str] = mapped_column(String(20), default="visible")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    __table_args__ = (
        UniqueConstraint("template_id", "user_id", name="uq_reviews_tu"),
    )


# ---------- 11. favorites ----------
class Favorite(Base):
    __tablename__ = "favorites"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    template_id: Mapped[str] = mapped_column(String(36), ForeignKey("templates.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    __table_args__ = (
        UniqueConstraint("user_id", "template_id", name="uq_favorites_ut"),
    )


# ---------- 12. usage_logs ----------
class UsageLog(Base):
    __tablename__ = "usage_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    template_id: Mapped[str] = mapped_column(String(36), ForeignKey("templates.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(20), nullable=False)  # view/render/export_json/export_md/export_api/share
    variables_filled_json: Mapped[dict | None] = mapped_column(JSON)  # 脱敏后
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)


# ---------- 13. revenue_records ----------
class RevenueRecord(Base):
    __tablename__ = "revenue_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    order_id: Mapped[str] = mapped_column(String(36), ForeignKey("orders.id"), nullable=False)
    creator_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    gross_cents: Mapped[int] = mapped_column(Integer, default=0)
    channel_fee_cents: Mapped[int] = mapped_column(Integer, default=0)
    platform_cents: Mapped[int] = mapped_column(Integer, default=0)
    creator_cents: Mapped[int] = mapped_column(Integer, default=0)
    type: Mapped[str] = mapped_column(String(20), default="sale")  # sale/refund
    settled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


# ---------- 14. withdrawals ----------
class Withdrawal(Base):
    __tablename__ = "withdrawals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    creator_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="applying")  # applying/paid/rejected
    bank_info_json: Mapped[dict | None] = mapped_column(JSON)
    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


# ---------- 15. api_keys ----------
class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)  # 仅存哈希
    scope: Mapped[str] = mapped_column(String(20), default="render")  # render/export
    rate_limit: Mapped[int] = mapped_column(Integer, default=60)
    status: Mapped[str] = mapped_column(String(20), default="active")
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


# ---------- 16. share_links ----------
class ShareLink(Base):
    __tablename__ = "share_links"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    template_id: Mapped[str] = mapped_column(String(36), ForeignKey("templates.id"), nullable=False)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    preset_variables_json: Mapped[dict | None] = mapped_column(JSON)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    max_visits: Mapped[int | None] = mapped_column(Integer)
    visit_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="active")  # active/revoked
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


# ---------- 17. admin_audit_logs ----------
class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    admin_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    target_type: Mapped[str | None] = mapped_column(String(30))
    target_id: Mapped[str | None] = mapped_column(String(64))
    detail_json: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
