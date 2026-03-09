from fastapi import HTTPException, status

from app.core import config

_firebase_initialized = False


def _initialize_firebase() -> None:
    global _firebase_initialized
    if _firebase_initialized:
        return

    try:
        import firebase_admin
        from firebase_admin import credentials
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="firebase-admin 패키지가 설치되지 않았습니다.",
        ) from exc

    try:
        firebase_admin.get_app()
    except ValueError:
        if config.FIREBASE_CREDENTIALS_PATH:
            cred = credentials.Certificate(config.FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()

    _firebase_initialized = True


def verify_firebase_id_token(id_token: str) -> dict:
    _initialize_firebase()

    try:
        from firebase_admin import auth
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="firebase-admin 패키지가 설치되지 않았습니다.",
        ) from exc

    try:
        return auth.verify_id_token(id_token, check_revoked=False)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 Firebase ID 토큰입니다.",
        ) from exc

