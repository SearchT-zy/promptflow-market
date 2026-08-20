"""Pydantic 请求模型。"""
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]{3,50}$")
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)
    display_name: str | None = Field(default=None, max_length=100)


class LoginIn(BaseModel):
    account: str  # 用户名或邮箱
    password: str


class VariableIn(BaseModel):
    name: str
    label: str | None = None
    description: str | None = None
    var_type: Literal["string", "text", "number", "select", "boolean"] = "string"
    default_value: str | None = None
    options: list[str] | None = None
    required: bool = True
    sort_order: int | None = None


class StepIn(BaseModel):
    title: str = ""
    prompt: str
    model_hint: str | None = None
    temperature: float | None = Field(default=None, ge=0, le=2)
    output_format: Literal["markdown", "json", "text"] = "markdown"


class TemplateIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    summary: str = Field(default="", max_length=500)
    template_type: Literal["single", "chain"] = "single"
    category: str | None = None
    model_tags: list[str] = []
    price_cents: int = Field(default=0, ge=0)
    doc_md: str = ""
    sample_output: str = ""
    steps: list[StepIn]
    variables: list[VariableIn] = []


class PublishVersionIn(BaseModel):
    version: str = Field(pattern=r"^\d+\.\d+\.\d+$")
    changelog: str = Field(min_length=1, max_length=1000)


class RollbackIn(BaseModel):
    version: str
    changelog: str | None = Field(default=None, max_length=1000)


class RenderIn(BaseModel):
    template_id: str
    version: str | None = None
    step: int | None = None
    variables: dict[str, Any] = {}
    context: dict[str, str] | None = None


class ApiBodyIn(BaseModel):
    variables: dict[str, Any] = {}
    context: dict[str, str] | None = None


class ShareIn(BaseModel):
    expires_in_seconds: int | None = Field(default=None, ge=60)
    max_visits: int | None = Field(default=None, ge=1)
    preset_variables: dict[str, Any] | None = None


class ReviewActionIn(BaseModel):
    action: Literal["approve", "reject"]
    reason: str | None = Field(default=None, max_length=1000)


class StatusIn(BaseModel):
    status: Literal["published", "offline"]
    reason: str | None = None


class UserUpdateIn(BaseModel):
    status: Literal["active", "banned"] | None = None
    role: Literal["user", "creator", "enterprise", "admin"] | None = None
    verified: bool | None = None


class CategoryIn(BaseModel):
    slug: str = Field(min_length=1, max_length=50, pattern=r"^[a-z0-9-]+$")
    name: str = Field(min_length=1, max_length=50)
    icon: str | None = None
    sort: int = 0
