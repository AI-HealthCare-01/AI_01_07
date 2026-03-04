from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.responses import ORJSONResponse as Response

from app.dependencies.security import get_request_user
from app.dtos.health_record import HealthRecordSaveRequest, HealthRecordTodayResponse
from app.models.users import User
from app.services.health_record import HealthRecordService

health_record_router = APIRouter(prefix="/health-record", tags=["health-record"])


@health_record_router.get("/today", response_model=HealthRecordTodayResponse, status_code=status.HTTP_200_OK)
async def get_today_health_record(
    user: Annotated[User, Depends(get_request_user)],
    health_record_service: Annotated[HealthRecordService, Depends(HealthRecordService)],
) -> Response:
    data = await health_record_service.get_today_record(user)
    return Response(content=data.model_dump(), status_code=status.HTTP_200_OK)


@health_record_router.post("/today", response_model=HealthRecordTodayResponse, status_code=status.HTTP_200_OK)
async def save_today_health_record(
    request: HealthRecordSaveRequest,
    user: Annotated[User, Depends(get_request_user)],
    health_record_service: Annotated[HealthRecordService, Depends(HealthRecordService)],
) -> Response:
    data = await health_record_service.save_today_record(user=user, data=request)
    return Response(content=data.model_dump(), status_code=status.HTTP_200_OK)
