from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI
from pydantic import BaseModel

# 선택: 실제 모델 파일이 없을 때도 서버는 뜨게(테스트 편함)
try:
    import joblib
except Exception:
    joblib = None

# 선택: autogluon 모델이 있을 때는 실모델 추론 사용
try:
    import pandas as pd
    from autogluon.tabular import TabularPredictor
except Exception:
    pd = None
    TabularPredictor = None

app = FastAPI(title="AI Worker", docs_url="/docs")

MODEL_PATH = Path("artifacts/diabetes/model.joblib")
AUTOML_MODEL_PATH = Path(os.getenv("DIABETES_MODEL_PATH", "artifacts/diabetes/jaram_binary_model"))
_model = None
_tabular_predictor = None


class DiabetesInferRequest(BaseModel):
    age_group: str
    height_cm: float
    weight_kg: float
    exercise_days_30m: str = "3-4"
    sugary_drink_days: str = "1-2"


class DiabetesBinaryInferRequest(BaseModel):
    age: int
    sex: int
    HE_ht: float
    HE_wt: float
    BMI: float
    Family_History: int
    DI1_dg: int
    DI2_dg: int
    Smoke_Status: str
    BD1_11: float
    pa_aerobic: int
    N_SUGAR: float


def bmi(height_cm: float, weight_kg: float) -> float:
    m = height_cm / 100.0
    return float(weight_kg / (m * m + 1e-9))


def load_model():
    global _model, _tabular_predictor
    if _model is not None:
        pass
    elif joblib is not None and MODEL_PATH.exists():
        _model = joblib.load(MODEL_PATH)

    if _tabular_predictor is not None:
        return
    if TabularPredictor is not None and AUTOML_MODEL_PATH.exists():
        try:
            _tabular_predictor = TabularPredictor.load(
                str(AUTOML_MODEL_PATH),
                require_py_version_match=False,
            )
        except Exception:
            # 모델 로드 실패 시에도 워커가 죽지 않게 fallback 모드 유지
            _tabular_predictor = None


@app.on_event("startup")
def _startup():
    load_model()


@app.post("/infer/diabetes")
def infer_diabetes(req: DiabetesInferRequest) -> Dict[str, Any]:
    # 1) 모델 파일이 있으면 모델로 예측
    if _model is not None:
        x = {
            "age_group": req.age_group,
            "exercise_days_30m": req.exercise_days_30m,
            "sugary_drink_days": req.sugary_drink_days,
            "bmi": bmi(req.height_cm, req.weight_kg),
        }
        proba = _model.predict_proba([x])[0]  # (p0, p1, p2) 가정
        p_pre = float(proba[1])
        p_dm = float(proba[2])
    else:
        # 2) 모델이 아직 없으면(또는 로드 실패) 임시 규칙 기반 fallback
        b = bmi(req.height_cm, req.weight_kg)
        p_pre = min(max(0.15 + (b - 23) * 0.03, 0.0), 1.0)
        p_dm = min(max(p_pre - 0.25, 0.0), 1.0)

    if p_dm >= 0.70:
        level = "high"
    elif p_pre >= 0.40 and p_dm < 0.70:
        level = "borderline"
    elif p_pre >= 0.25:
        level = "medium"
    else:
        level = "low"

    return {
        "risk_level": level,
        "p_prediabetes": p_pre,
        "p_diabetes": p_dm,
        "top_factors": ["bmi", "exercise_days_30m", "sugary_drink_days"],
    }


@app.post("/infer/diabetes/binary")
def infer_diabetes_binary(req: DiabetesBinaryInferRequest) -> Dict[str, Any]:
    # 1) AutoGluon 모델이 있으면 실제 모델 추론
    if _tabular_predictor is not None and pd is not None:
        try:
            input_df = pd.DataFrame(
                [
                    {
                        "age": req.age,
                        "sex": req.sex,
                        "HE_ht": req.HE_ht,
                        "HE_wt": req.HE_wt,
                        "BMI": req.BMI,
                        "Family_History": req.Family_History,
                        "DI1_dg": req.DI1_dg,
                        "DI2_dg": req.DI2_dg,
                        "Smoke_Status": req.Smoke_Status,
                        "BD1_11": req.BD1_11,
                        "pa_aerobic": req.pa_aerobic,
                        "N_SUGAR": req.N_SUGAR,
                    }
                ]
            )
            risk_group = int(_tabular_predictor.predict(input_df).iloc[0])
            proba = _tabular_predictor.predict_proba(input_df)
            risk_probability = float(proba.iloc[0][1])
            return {
                "risk_group": risk_group,
                "risk_probability": risk_probability,
                "backend": "autogluon",
            }
        except Exception:
            # 모델 추론 실패 시 fallback 점수식으로 지속 서비스
            pass

    # 2) fallback: 가벼운 점수식(서비스 연속성용)
    score = 0.0
    score += max(0.0, (req.BMI - 22.0) * 0.04)
    score += 0.15 if req.Family_History == 1 else 0.0
    score += 0.10 if req.DI1_dg == 1 else 0.0
    score += 0.08 if req.DI2_dg == 1 else 0.0
    score += 0.08 if req.Smoke_Status == "Current" else 0.03 if req.Smoke_Status == "Past" else 0.0
    score += 0.05 if req.pa_aerobic == 0 else 0.0
    score += min(req.N_SUGAR / 30.0, 0.12)
    risk_probability = min(max(0.05 + score, 0.0), 0.99)
    risk_group = 1 if risk_probability >= 0.5 else 0
    return {
        "risk_group": risk_group,
        "risk_probability": risk_probability,
        "backend": "fallback",
    }
