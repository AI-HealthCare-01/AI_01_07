import { useState } from "react";
import { useNavigate } from "react-router-dom";

import type { FoodResponse } from "../types/food";

export default function FoodUploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!file) return;

    setError("");
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/v1/food/analyze", { method: "POST", body: fd });
      if (!res.ok) {
        const text = await res.text();
        setError(text || "분석 요청에 실패했습니다.");
        return;
      }

      const data = (await res.json()) as FoodResponse;
      const previewUrl = URL.createObjectURL(file);
      navigate("/food/result", { state: { data, previewUrl, fileName: file.name } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <h1>식단 사진</h1>
      <p className="subtitle">카메라/사진 업로드 후 분석 (10초 이내 목표)</p>

      <div className="card">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <button className="primary" style={{ marginTop: 12 }} onClick={submit} disabled={!file || loading}>
          {loading ? "분석 중..." : "분석하기"}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="buttonRow">
        <button className="secondary" onClick={() => navigate("/")}>
          홈으로
        </button>
      </div>
    </section>
  );
}
