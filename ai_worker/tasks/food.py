from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx
from PIL import Image
from transformers import pipeline


def macro_ratio_by_kcal(carb_g: float, protein_g: float, fat_g: float) -> dict[str, float]:
    carb_kcal = max(carb_g, 0.0) * 4.0
    protein_kcal = max(protein_g, 0.0) * 4.0
    fat_kcal = max(fat_g, 0.0) * 9.0
    total = carb_kcal + protein_kcal + fat_kcal
    if total <= 1e-9:
        return {"carb_pct": 0.0, "protein_pct": 0.0, "fat_pct": 0.0, "total_kcal_from_macros": 0.0}
    return {
        "carb_pct": round(carb_kcal / total * 100.0, 1),
        "protein_pct": round(protein_kcal / total * 100.0, 1),
        "fat_pct": round(fat_kcal / total * 100.0, 1),
        "total_kcal_from_macros": round(total, 1),
    }


def recommendation(carb_pct: float) -> dict[str, Any]:
    if carb_pct >= 65.0:
        return {
            "warning": True,
            "message": "탄수화물 비중이 높아요. 다음 끼니는 단백질/식이섬유를 보강해 균형을 맞춰보세요.",
            "suggestions": ["계란", "닭가슴살", "두부/콩류", "생선", "그릭요거트", "채소/샐러드"],
        }
    return {
        "warning": False,
        "message": "탄/단/지 비율이 비교적 균형적이에요. 오늘도 꾸준히 유지해요!",
        "suggestions": ["물", "채소", "단백질 한 가지 추가"],
    }


DEFAULT_NUTRITION_PATH = Path("artifacts/food/nutrition_map.json")
DEFAULT_LOCAL_MODEL_PATH = Path(os.getenv("FOOD_MODEL_PATH", "artifacts/food/kfood_model"))


def _normalize_name(value: str) -> str:
    return re.sub(r"\s+", "", value).strip().lower()


@dataclass
class FoodPredictor:
    model_name: str = os.getenv("FOOD_MODEL_NAME", "nateraw/food")
    top_k: int = 3
    nutrition_path: Path = DEFAULT_NUTRITION_PATH
    local_model_path: Path = DEFAULT_LOCAL_MODEL_PATH
    clf: Any = None
    nutrition_map: dict[str, dict[str, Any]] | None = None

    def load(self) -> None:
        if self.clf is None:
            model_ref = str(self.local_model_path) if self.local_model_path.exists() else self.model_name
            self.clf = pipeline("image-classification", model=model_ref)
        if self.nutrition_map is None:
            if self.nutrition_path.exists():
                self.nutrition_map = json.loads(self.nutrition_path.read_text(encoding="utf-8"))
            else:
                self.nutrition_map = {}

    def predict_topk(self, img: Image.Image) -> list[dict[str, Any]]:
        self.load()
        preds = self.clf(img, top_k=self.top_k)
        return [{"label": p["label"], "confidence": float(p["score"])} for p in preds]

    def lookup_nutrition(self, label: str) -> dict[str, Any] | None:
        self.load()
        assert self.nutrition_map is not None
        return self.nutrition_map.get(label)

    def lookup_by_user_name(self, menu_name: str) -> tuple[str | None, dict[str, Any] | None]:
        self.load()
        assert self.nutrition_map is not None

        raw = menu_name.strip()
        if not raw:
            return None, None

        if raw in self.nutrition_map:
            return raw, self.nutrition_map[raw]

        target = _normalize_name(raw)
        for key, value in self.nutrition_map.items():
            if _normalize_name(key) == target:
                return key, value
            name_ko = str(value.get("name_ko", "")).strip()
            if name_ko and _normalize_name(name_ko) == target:
                return key, value
        return None, None

    def _heuristic_nutrition(self, menu_name: str) -> dict[str, Any]:
        name = menu_name.strip()
        n = _normalize_name(name)
        if any(k in n for k in ["회", "사시미", "육회"]):
            carb_g, protein_g, fat_g = 8.0, 36.0, 12.0
        elif any(k in n for k in ["찌개", "탕", "국"]):
            carb_g, protein_g, fat_g = 24.0, 18.0, 14.0
        elif any(k in n for k in ["면", "라면", "국수"]):
            carb_g, protein_g, fat_g = 74.0, 16.0, 12.0
        elif any(k in n for k in ["밥", "비빔밥", "볶음밥"]):
            carb_g, protein_g, fat_g = 82.0, 18.0, 16.0
        elif any(k in n for k in ["구이", "불고기", "삼겹살"]):
            carb_g, protein_g, fat_g = 16.0, 32.0, 26.0
        else:
            carb_g, protein_g, fat_g = 48.0, 20.0, 18.0
        kcal = round(carb_g * 4 + protein_g * 4 + fat_g * 9, 1)
        return {
            "name_ko": name,
            "kcal": kcal,
            "carb_g": carb_g,
            "protein_g": protein_g,
            "fat_g": fat_g,
            "source": "heuristic",
        }

    def llm_estimate_nutrition(self, menu_name: str) -> dict[str, Any]:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return self._heuristic_nutrition(menu_name)

        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        system = (
            "You are a nutrition assistant. Return only JSON with keys: "
            "name_ko, kcal, carb_g, protein_g, fat_g."
        )
        user = f"메뉴명: {menu_name}. 일반적인 1인분 기준 영양소를 추정해줘."
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }
        try:
            res = httpx.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json=payload,
                timeout=20.0,
            )
            res.raise_for_status()
            content = res.json()["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            return {
                "name_ko": str(parsed.get("name_ko") or menu_name),
                "kcal": float(parsed.get("kcal", 0)),
                "carb_g": float(parsed.get("carb_g", 0)),
                "protein_g": float(parsed.get("protein_g", 0)),
                "fat_g": float(parsed.get("fat_g", 0)),
                "source": "llm",
            }
        except Exception:
            return self._heuristic_nutrition(menu_name)

    def reanalyze_menu(self, menu_name: str) -> dict[str, Any]:
        chosen_label, nut = self.lookup_by_user_name(menu_name)
        source = "db"
        if nut is None:
            nut = self.llm_estimate_nutrition(menu_name)
            chosen_label = menu_name
            source = nut.get("source", "llm")

        carb_g = float(nut.get("carb_g", 0))
        protein_g = float(nut.get("protein_g", 0))
        fat_g = float(nut.get("fat_g", 0))
        kcal = float(nut.get("kcal", 0))
        ratio = macro_ratio_by_kcal(carb_g, protein_g, fat_g)
        rec = recommendation(ratio["carb_pct"])

        return {
            "top3": [],
            "chosen": {"label": chosen_label, "name_ko": nut.get("name_ko") or menu_name},
            "nutrition": {"kcal": kcal, "carb_g": carb_g, "protein_g": protein_g, "fat_g": fat_g},
            "macro_ratio_kcal": ratio,
            "recommendation": rec,
            "source": source,
        }

    def analyze(self, img: Image.Image) -> dict[str, Any]:
        top3 = self.predict_topk(img)
        best = top3[0]["label"]

        chosen_label = best
        nut = self.lookup_nutrition(chosen_label)
        if nut is None:
            for p in top3[1:]:
                candidate = p["label"]
                candidate_nut = self.lookup_nutrition(candidate)
                if candidate_nut is not None:
                    chosen_label = candidate
                    nut = candidate_nut
                    break

        if nut is None:
            return {
                "top3": top3,
                "chosen": {"label": best, "name_ko": None},
                "nutrition": None,
                "macro_ratio_kcal": None,
                "recommendation": {
                    "warning": False,
                    "message": "영양 DB 매핑이 아직 없어요. (nutrition_map.json에 이 label을 추가하면 원그래프가 나와요)",
                    "suggestions": [],
                },
            }

        carb_g = float(nut.get("carb_g", 0))
        protein_g = float(nut.get("protein_g", 0))
        fat_g = float(nut.get("fat_g", 0))
        kcal = float(nut.get("kcal", 0))

        ratio = macro_ratio_by_kcal(carb_g, protein_g, fat_g)
        rec = recommendation(ratio["carb_pct"])

        return {
            "top3": top3,
            "chosen": {"label": chosen_label, "name_ko": nut.get("name_ko")},
            "nutrition": {"kcal": kcal, "carb_g": carb_g, "protein_g": protein_g, "fat_g": fat_g},
            "macro_ratio_kcal": ratio,
            "recommendation": rec,
        }
