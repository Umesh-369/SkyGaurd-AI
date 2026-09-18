"""
backend/api/routers/auth.py
Thin REST endpoint for JWT Authentication.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
import datetime
import base64
import json
import hmac
import hashlib
from backend.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str
    password: str


class UserRegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    role: str = "operator"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str


def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = data.copy()

    if expires_delta:
        expire = datetime.datetime.now(datetime.timezone.utc) + expires_delta
    else:
        expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload["exp"] = int(expire.timestamp())

    header_bytes = json.dumps(header, separators=(',', ':')).encode('utf-8')
    payload_bytes = json.dumps(payload, separators=(',', ':')).encode('utf-8')

    segments = [
        _base64url_encode(header_bytes),
        _base64url_encode(payload_bytes)
    ]

    signing_input = ".".join(segments).encode('utf-8')
    signature = hmac.new(settings.SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
    segments.append(_base64url_encode(signature))

    return ".".join(segments)


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    if req.username in ["admin", "operator", "analyst"] and req.password in ["admin123", "password", "skyguard"]:
        role = "admin" if req.username == "admin" else "operator"
        token = create_access_token({"sub": req.username, "role": role})
        return TokenResponse(access_token=token, username=req.username, role=role)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password. Try demo credentials: admin / admin123"
    )


@router.post("/register")
async def register(req: UserRegisterRequest):
    token = create_access_token({"sub": req.username, "role": req.role})
    return {
        "message": "User registered successfully",
        "access_token": token,
        "username": req.username,
        "role": req.role
    }


@router.get("/me")
async def get_current_user():
    return {
        "username": "admin",
        "role": "admin",
        "email": "admin@skyguard.ai",
        "organization": "Goa State Weather Monitoring Authority"
    }
