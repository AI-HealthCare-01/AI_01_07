from app.dtos.base import BaseSerializerModel


class FirebaseClientConfigResponse(BaseSerializerModel):
    api_key: str
    auth_domain: str
    project_id: str
    app_id: str
    configured: bool
