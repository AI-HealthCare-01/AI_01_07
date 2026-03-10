import { useState } from "react";
import { PieChart, Pie, ResponsiveContainer, Tooltip, Legend } from "recharts";

type FoodResponse = {
  top3: { label: string; confidence: number }[];
  chosen: { label: string; name_ko: string | null };
  nutrition: null | { kcal: number; carb_g: number; protein_g: number; fat_g: number };
  macro_ratio_kcal: null | { carb_pct: number; protein_pct: number; fat_pct: number; total_kcal_from_macros: number };
  recommendation: { warning: boolean; message: string; suggestions: string[] };
};

export default function FoodAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<FoodResponse | null>(null);
  const [error, setError] = useState("");

  async function submit() {
    if (!file) return;
    setError("");
    setData(null);

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/v1/food/analyze", { method: "POST", body: fd });
    if (!res.ok) {
      const t = await res.text();
      setError(t);
      return;
    }
    setData(await res.json());
  }

  const chartData =
    data?.macro_ratio_kcal
      ? [
          { name: "탄수화물", value: data.macro_ratio_kcal.carb_pct },
          { name: "단백질", value: data.macro_ratio_kcal.protein_pct },
          { name: "지방", value: data.macro_ratio_kcal.fat_pct }
        ]
      : [];

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="cardTitle">음식 분석 (사진 1장 / 메뉴 1개)</div>

      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <button className="btn" style={{ marginTop: 10 }} onClick={submit} disabled={!file}>
        분석하기
      </button>

      {error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}

      {data && (
        <div style={{ marginTop: 14 }}>
          <div className="muted">
            Top-3: {data.top3.map((x) => `${x.label}(${Math.round(x.confidence * 100)}%)`).join(", ")}
          </div>

          <div className="big" style={{ marginTop: 8 }}>
            선택: {data.chosen.name_ko ?? data.chosen.label}
          </div>

          {!data.nutrition && (
            <div className="muted" style={{ marginTop: 8 }}>
              영양 매핑이 아직 없어요. nutrition_map.json에 <b>{data.chosen.label}</b> 키를 추가하면 원그래프가 나옵니다.
            </div>
          )}

          {data.nutrition && data.macro_ratio_kcal && (
            <>
              <div className="muted" style={{ marginTop: 6 }}>
                표준 1인분 kcal: {data.nutrition.kcal} | 탄 {data.nutrition.carb_g}g / 단 {data.nutrition.protein_g}g / 지 {data.nutrition.fat_g}g
              </div>

              <div style={{ width: "100%", height: 260, marginTop: 10 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie dataKey="value" data={chartData} innerRadius={60} outerRadius={90} paddingAngle={2} />
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className={data.recommendation.warning ? "error" : "loading"} style={{ marginTop: 10 }}>
                {data.recommendation.message}
                {data.recommendation.suggestions.length > 0 && (
                  <div className="muted" style={{ marginTop: 6 }}>
                    추천: {data.recommendation.suggestions.join(", ")}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
