from fastapi import APIRouter, status
from fastapi.responses import ORJSONResponse as Response

from app.core import config
from app.dtos.public import FirebaseClientConfigResponse

public_router = APIRouter(prefix="/public", tags=["public"])


@public_router.get("/firebase-config", response_model=FirebaseClientConfigResponse, status_code=status.HTTP_200_OK)
async def get_firebase_client_config() -> Response:
    data = FirebaseClientConfigResponse(
        api_key=config.FIREBASE_API_KEY,
        auth_domain=config.FIREBASE_AUTH_DOMAIN,
        project_id=config.FIREBASE_PROJECT_ID,
        app_id=config.FIREBASE_APP_ID,
        configured=all(
            [
                config.FIREBASE_API_KEY,
                config.FIREBASE_AUTH_DOMAIN,
                config.FIREBASE_PROJECT_ID,
                config.FIREBASE_APP_ID,
            ]
        ),
    )
    return Response(content=data.model_dump(), status_code=status.HTTP_200_OK)
