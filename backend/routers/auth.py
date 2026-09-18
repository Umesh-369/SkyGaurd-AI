"""
backend/routers/auth.py
Compatibility wrapper delegating to backend.api.routers.auth.
"""

from backend.api.routers.auth import (
    router,
    LoginRequest,
    UserRegisterRequest,
    TokenResponse,
    create_access_token,
    login,
    register,
    get_current_user,
)

__all__ = [
    "router",
    "LoginRequest",
    "UserRegisterRequest",
    "TokenResponse",
    "create_access_token",
    "login",
    "register",
    "get_current_user",
]
