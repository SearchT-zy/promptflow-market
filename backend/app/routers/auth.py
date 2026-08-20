"""账号：注册 / 登录 / 当前用户。"""
import re

from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import error_json, get_current_user
from ..models import User
from ..schemas import LoginIn, RegisterIn
from ..security import create_token, hash_password, verify_password
from ..serializers import user_to_dict

router = APIRouter(prefix="/auth", tags=["auth"])

USERNAME_RE = re.compile(r"^[a-zA-Z0-9_-]{3,50}$")


@router.post("/register", status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if not USERNAME_RE.match(body.username):
        raise error_json("INVALID_USERNAME", "用户名需为 3-50 位字母/数字/下划线/连字符")
    exists = db.execute(
        select(User).where(or_(User.username == body.username, User.email == body.email.lower()))
    ).scalar_one_or_none()
    if exists:
        raise error_json("ACCOUNT_EXISTS", "用户名或邮箱已被注册", http_status=409)
    user = User(
        username=body.username,
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        display_name=body.display_name or body.username,
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": create_token(user.id), "user": user_to_dict(user)}


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    account = body.account.strip()
    user = db.execute(
        select(User).where(
            or_(User.username == account, User.email == account.lower())
        )
    ).scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise error_json("BAD_CREDENTIALS", "账号或密码错误", http_status=401)
    if user.status == "banned":
        raise error_json("BANNED", "账号已被封禁", http_status=403)
    return {"token": create_token(user.id), "user": user_to_dict(user)}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return user_to_dict(user)
