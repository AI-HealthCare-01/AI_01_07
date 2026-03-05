async function loadOverview() {
  const res = await fetch("/api/v1/dashboard/overview");
  const data = await res.json();

  // 1) Risk
  document.getElementById("riskLevel").innerText = data.risk.risk_level.toUpperCase();
  document.getElementById("riskProb").innerText =
    `전당뇨확률 ${(data.risk.p_prediabetes*100).toFixed(0)}% | 당뇨확률 ${(data.risk.p_diabetes*100).toFixed(0)}%`;

  const factors = document.getElementById("riskFactors");
  factors.innerHTML = "";
  data.risk.top_factors.forEach(f => {
    const span = document.createElement("span");
    span.className = "chip";
    span.innerText = f;
    factors.appendChild(span);
  });

  // 2) Calories
  document.getElementById("kcalToday").innerText = `${data.calories.today_kcal} kcal`;
  document.getElementById("kcalGoal").innerText =
    `목표 ${data.calories.goal_kcal} / 남음 ${data.calories.remaining_kcal}`;

  // 3) Trend
  document.getElementById("trendText").innerText =
    data.trend_7d.map(p => `${p.date} | pre:${p.p_prediabetes.toFixed(2)} | kcal:${p.kcal}`).join("\n");
}

loadOverview();