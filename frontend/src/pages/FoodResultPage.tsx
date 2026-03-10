import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import type { FoodResponse } from "../types/food";

type FoodResultLocationState = {
  data?: FoodResponse;
  previewUrl?: string;
  fileName?: string;
};

const PASTEL_COLORS = ["#FFD6A5", "#BDE0FE", "#CDEAC0"];

export default function FoodResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as FoodResultLocationState | null;
  const data = state?.data ?? null;
  const previewUrl = state?.previewUrl;
  const fileName = state?.fileName;
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [resultData, setResultData] = useState(data);
  const [editing, setEditing] = useState(false);
  const [menuInput, setMenuInput] = useState(data?.chosen.name_ko ?? data?.chosen.label ?? "");
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!resultData) {
    return (
      <section className="panel">
        <h1>음식 분석 결과</h1>
        <div className="error">분석 데이터가 없습니다. 식단 업로드부터 다시 진행해주세요.</div>
        <div className="buttonRow">
          <button className="primary" onClick={() => navigate("/food/upload")}>
            식단 업로드로 이동
          </button>
        </div>
      </section>
    );
  }
  const current = resultData;
  const chartData = current.macro_ratio_kcal
    ? [
        { name: "탄수화물", value: current.macro_ratio_kcal.carb_pct },
        { name: "단백질", value: current.macro_ratio_kcal.protein_pct },
        { name: "지방", value: current.macro_ratio_kcal.fat_pct },
      ]
    : [];

  async function reanalyzeMenu() {
    const menuName = menuInput.trim();
    if (!menuName) {
      setReanalyzeError("메뉴명을 입력해주세요.");
      return;
    }

    setReanalyzeError("");
    setReanalyzing(true);
    try {
      const res = await fetch("/api/v1/food/reanalyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu_name: menuName }),
      });
      if (!res.ok) {
        const text = await res.text();
        setReanalyzeError(text || "재분석에 실패했습니다.");
        return;
      }
      const next = (await res.json()) as FoodResponse;
      setResultData(next);
      setEditing(false);
    } catch (e) {
      setReanalyzeError(e instanceof Error ? e.message : "재분석 중 오류가 발생했습니다.");
    } finally {
      setReanalyzing(false);
    }
  }

  async function saveFood() {
    setSaveMessage("");
    setSaveError("");
    setSaving(true);

    try {
      const res = await fetch("/api/v1/food/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: current.chosen.label,
          name_ko: current.chosen.name_ko,
          kcal: current.nutrition?.kcal ?? null,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        setSaveError(text || "저장에 실패했습니다.");
        return;
      }

      setSaveMessage("오늘 식단 기록으로 저장되었습니다.");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel">
      <h1>음식 분석 결과</h1>

      <div className="card">
        {previewUrl && (
          <div style={{ marginBottom: 10 }}>
            <img
              src={previewUrl}
              alt={fileName ?? "업로드한 식단 사진"}
              style={{
                width: "100%",
                maxHeight: 320,
                objectFit: "cover",
                borderRadius: 12,
                border: "1px solid #d6deeb",
              }}
            />
          </div>
        )}
        <div className="subtitle">
          Top-3: {current.top3.map((x) => `${x.label}(${Math.round(x.confidence * 100)}%)`).join(", ")}
        </div>

        <div className="stage" style={{ marginTop: 8 }}>
          {current.chosen.name_ko ?? current.chosen.label}
        </div>
        <div className="buttonRow" style={{ marginTop: 8 }}>
          <button className="secondary" onClick={() => setEditing((v) => !v)}>
            수정하기
          </button>
          {current.source && (
            <span className="subtitle" style={{ alignSelf: "center" }}>
              분석 소스: {current.source === "db" ? "영양 DB" : "AI 추정"}
            </span>
          )}
        </div>
        {editing && (
          <div className="card" style={{ marginTop: 10 }}>
            <label>
              메뉴명 수정
              <input
                type="text"
                value={menuInput}
                onChange={(e) => setMenuInput(e.target.value)}
                placeholder="예: 방어회, 참치회"
              />
            </label>
            <div className="buttonRow">
              <button className="primary" onClick={reanalyzeMenu} disabled={reanalyzing}>
                {reanalyzing ? "재분석 중..." : "재분석 적용"}
              </button>
            </div>
            {reanalyzeError && <div className="error">{reanalyzeError}</div>}
          </div>
        )}

        {!current.nutrition && (
          <div className="subtitle" style={{ marginTop: 8 }}>
            영양 매핑이 아직 없어요. `nutrition_map.json`에 <b>{current.chosen.label}</b> 키를 추가하면
            원그래프가 나옵니다.
          </div>
        )}

        {current.nutrition && current.macro_ratio_kcal && (
          <>
            <div className="subtitle" style={{ marginTop: 8 }}>
              표준 1인분 kcal: {current.nutrition.kcal} | 탄 {current.nutrition.carb_g}g / 단{" "}
              {current.nutrition.protein_g}g / 지 {current.nutrition.fat_g}g
            </div>

            <div style={{ width: "100%", height: 260, marginTop: 10 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie dataKey="value" data={chartData} innerRadius={60} outerRadius={90} paddingAngle={2}>
                    {chartData.map((entry, index) => (
                      <Cell key={entry.name} fill={PASTEL_COLORS[index % PASTEL_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className={current.recommendation.warning ? "error" : "card"}>
              {current.recommendation.message}
              {current.recommendation.suggestions.length > 0 && (
                <div className="subtitle" style={{ marginTop: 6 }}>
                  추천: {current.recommendation.suggestions.join(", ")}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="buttonRow">
        <button className="secondary" onClick={() => navigate("/food/upload")}>
          다시 분석
        </button>
        <button className="primary" onClick={saveFood} disabled={saving}>
          저장하기
        </button>
      </div>

      {saveMessage && <div className="card">{saveMessage}</div>}
      {saveError && <div className="error">{saveError}</div>}
    </section>
  );
}
