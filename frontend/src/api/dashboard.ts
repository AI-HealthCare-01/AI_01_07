export type RiskCard = {
  risk_level: "low" | "medium" | "borderline" | "high" | string;
  p_prediabetes: number;
  p_diabetes: number;
  top_factors: string[];
};

export type CaloriesCard = {
  today_kcal: number;
  goal_kcal: number;
  remaining_kcal: number;
};

export type TrendPoint = {
  date: string; // "YYYY-MM-DD"
  p_prediabetes: number;
  kcal: number;
};

export type DashboardOverview = {
  risk: RiskCard;
  calories: CaloriesCard;
  trend_7d: TrendPoint[];
};

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  const res = await fetch("/api/v1/dashboard/overview");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export type MealCreateRequest = {
  label?: string | null;
  calories_est: number;
};

export async function createMeal(req: MealCreateRequest): Promise<void> {
  const res = await fetch("/api/v1/meals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meal API error ${res.status}: ${text}`);
  }
}

export type DiabetesRunRequest = {
  age_group: string;
  height_cm: number;
  weight_kg: number;
  exercise_days_30m?: string;
  sugary_drink_days?: string;
};

export async function runDiabetesPrediction(req: DiabetesRunRequest): Promise<void> {
  const res = await fetch("/api/v1/predictions/diabetes/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Prediction API error ${res.status}: ${text}`);
  }
}