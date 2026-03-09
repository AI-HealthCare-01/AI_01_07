import secrets
from typing import Annotated
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Cookie, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse as Response
from fastapi.responses import RedirectResponse

from app.core import config
from app.core.config import Env
from app.dtos.auth import (
    FirebaseGoogleLoginRequest,
    FirebaseGoogleLoginResponse,
    LoginRequest,
    LoginResponse,
    SignUpRequest,
    TokenRefreshResponse,
)
from app.services.auth import AuthService
from app.services.firebase_auth import verify_firebase_id_token
from app.services.jwt import JwtService

auth_router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


@auth_router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(
    request: SignUpRequest,
    auth_service: Annotated[AuthService, Depends(AuthService)],
) -> Response:
    await auth_service.signup(request)
    return Response(content={"detail": "회원가입이 성공적으로 완료되었습니다."}, status_code=status.HTTP_201_CREATED)


@auth_router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
async def login(
    request: LoginRequest,
    auth_service: Annotated[AuthService, Depends(AuthService)],
) -> Response:
    user = await auth_service.authenticate(request)
    tokens = await auth_service.login(user)
    resp = Response(
        content=LoginResponse(access_token=str(tokens["access_token"])).model_dump(), status_code=status.HTTP_200_OK
    )
    resp.set_cookie(
        key="refresh_token",
        value=str(tokens["refresh_token"]),
        httponly=True,
        secure=True if config.ENV == Env.PROD else False,
        domain=config.COOKIE_DOMAIN or None,
        expires=tokens["access_token"].payload["exp"],
    )
    return resp


@auth_router.get("/token/refresh", response_model=TokenRefreshResponse, status_code=status.HTTP_200_OK)
async def token_refresh(
    jwt_service: Annotated[JwtService, Depends(JwtService)],
    refresh_token: Annotated[str | None, Cookie()] = None,
) -> Response:
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token is missing.")
    access_token = jwt_service.refresh_jwt(refresh_token)
    return Response(
        content=TokenRefreshResponse(access_token=str(access_token)).model_dump(), status_code=status.HTTP_200_OK
    )


@auth_router.post("/firebase-google", response_model=FirebaseGoogleLoginResponse, status_code=status.HTTP_200_OK)
async def firebase_google_login(
    request: FirebaseGoogleLoginRequest,
    auth_service: Annotated[AuthService, Depends(AuthService)],
) -> Response:
    decoded = verify_firebase_id_token(request.id_token)
    email = decoded.get("email")
    email_verified = decoded.get("email_verified", False)
    name = decoded.get("name")

    if not email or not email_verified:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google 이메일 검증에 실패했습니다.")

    user = await auth_service.login_or_signup_google(email=email, name=name)
    tokens = await auth_service.login(user)
    resp = Response(
        content=FirebaseGoogleLoginResponse(access_token=str(tokens["access_token"]), email=email).model_dump(),
        status_code=status.HTTP_200_OK,
    )
    resp.set_cookie(
        key="refresh_token",
        value=str(tokens["refresh_token"]),
        httponly=True,
        secure=True if config.ENV == Env.PROD else False,
        domain=config.COOKIE_DOMAIN or None,
        expires=tokens["access_token"].payload["exp"],
    )
    return resp


@auth_router.get("/google/login", status_code=status.HTTP_307_TEMPORARY_REDIRECT)
async def google_login() -> RedirectResponse:
    if not config.GOOGLE_CLIENT_ID or not config.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google OAuth 설정이 비어 있습니다."
        )

    state = secrets.token_urlsafe(24)
    params = {
        "client_id": config.GOOGLE_CLIENT_ID,
        "redirect_uri": config.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    }
    url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    resp = RedirectResponse(url=url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    resp.set_cookie(
        key="google_oauth_state",
        value=state,
        httponly=True,
        secure=True if config.ENV == Env.PROD else False,
        domain=config.COOKIE_DOMAIN or None,
        max_age=600,
    )
    return resp


@auth_router.get("/google/callback", status_code=status.HTTP_307_TEMPORARY_REDIRECT)
async def google_callback(
    auth_service: Annotated[AuthService, Depends(AuthService)],
    code: str | None = Query(None),
    state: str | None = Query(None),
    error: str | None = Query(None),
    google_oauth_state: Annotated[str | None, Cookie()] = None,
) -> RedirectResponse:
    if error:
        return RedirectResponse(
            url=f"{config.FRONTEND_URL}/auth/google/callback?error={error}",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )

    if not code or not state or state != google_oauth_state:
        return RedirectResponse(
            url=f"{config.FRONTEND_URL}/auth/google/callback?error=invalid_state_or_code",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            token_resp = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": config.GOOGLE_CLIENT_ID,
                    "client_secret": config.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": config.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
            )
            token_resp.raise_for_status()
            access_token = token_resp.json().get("access_token")
            if not access_token:
                raise ValueError("missing_google_access_token")

            userinfo_resp = await client.get(
                GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"}
            )
            userinfo_resp.raise_for_status()
            userinfo = userinfo_resp.json()
    except Exception:
        return RedirectResponse(
            url=f"{config.FRONTEND_URL}/auth/google/callback?error=google_exchange_failed",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )

    email = userinfo.get("email")
    if not email or not userinfo.get("email_verified", False):
        return RedirectResponse(
            url=f"{config.FRONTEND_URL}/auth/google/callback?error=email_not_verified",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )

    user = await auth_service.login_or_signup_google(email=email, name=userinfo.get("name"))
    tokens = await auth_service.login(user)
    redirect_url = f"{config.FRONTEND_URL}/auth/google/callback?" + urlencode(
        {"access_token": str(tokens["access_token"]), "email": email}
    )
    resp = RedirectResponse(url=redirect_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    resp.set_cookie(
        key="refresh_token",
        value=str(tokens["refresh_token"]),
        httponly=True,
        secure=True if config.ENV == Env.PROD else False,
        domain=config.COOKIE_DOMAIN or None,
        expires=tokens["access_token"].payload["exp"],
    )
    resp.delete_cookie(key="google_oauth_state", domain=config.COOKIE_DOMAIN or None)
    return resp
