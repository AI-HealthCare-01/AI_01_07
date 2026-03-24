from enum import StrEnum

from pydantic import Field, computed_field

from app.dtos.base import BaseSerializerModel


class GenderChoice(StrEnum):
    MALE = "male"
    FEMALE = "female"


class TernaryChoice(StrEnum):
    YES = "yes"
    NO = "no"
    UNKNOWN = "unknown"


class BinaryChoice(StrEnum):
    YES = "yes"
    NO = "no"


class SmokingChoice(StrEnum):
    NEVER = "never"
    FORMER = "former"
    CURRENT = "current"


class DrinkingChoice(StrEnum):
    RARELY = "rarely"
    WEEK_1_2 = "week_1_2"
    WEEK_3_PLUS = "week_3_plus"


class ExerciseChoice(StrEnum):
    D0 = "d0"
    D1_2 = "d1_2"
    D3_4 = "d3_4"
    D5_PLUS = "d5_plus"


class FrequencyChoice(StrEnum):
    RARELY = "rarely"
    SOMETIMES = "sometimes"
    OFTEN = "often"


class WalkChoice(StrEnum):
    ALWAYS = "always"
    SOMETIMES = "sometimes"
    NEVER = "never"


class RiskStage(StrEnum):
    NORMAL = "normal"
    BORDERLINE = "borderline"
    HIGH = "high"


class OnboardingSurveyRequest(BaseSerializerModel):
    age: int = Field(ge=1, le=120)
    gender: GenderChoice
    height_cm: float = Field(gt=80, le=250)
    weight_kg: float = Field(gt=20, le=300)
    family_history: TernaryChoice
    hypertension: BinaryChoice
    hyperlipidemia: BinaryChoice
    smoking_status: SmokingChoice
    drinking_freq: DrinkingChoice
    exercise_days_30m: ExerciseChoice
    sugary_drink_freq: FrequencyChoice
    late_night_meal_freq: FrequencyChoice
    post_meal_walk: WalkChoice

    @computed_field
    @property
    def bmi(self) -> float:
        h = self.height_cm / 100.0
        return self.weight_kg / (h * h + 1e-9)


class OnboardingPredictionResponse(BaseSerializerModel):
    survey_id: int
    risk_group: int
    risk_probability: float
    risk_stage: RiskStage
    message: str
    recommended_actions: list[str]


class LatestOnboardingProfileResponse(BaseSerializerModel):
    has_onboarding: bool
    height_cm: float | None
    weight_kg: float | None
    bmi: float | None


class OnboardingRiskTrendPoint(BaseSerializerModel):
    date: str
    risk_probability: float
