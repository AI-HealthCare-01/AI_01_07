export type GenderChoice = "male" | "female";
export type TernaryChoice = "yes" | "no" | "unknown";
export type BinaryChoice = "yes" | "no";
export type SmokingChoice = "never" | "former" | "current";
export type DrinkingChoice = "rarely" | "week_1_2" | "week_3_plus";
export type ExerciseChoice = "d0" | "d1_2" | "d3_4" | "d5_plus";
export type FrequencyChoice = "rarely" | "sometimes" | "often";
export type WalkChoice = "always" | "sometimes" | "never";

export type OnboardingSurveyRequest = {
  age: number;
  gender: GenderChoice;
  height_cm: number;
  weight_kg: number;
  family_history: TernaryChoice;
  hypertension: BinaryChoice;
  hyperlipidemia: BinaryChoice;
  smoking_status: SmokingChoice;
  drinking_freq: DrinkingChoice;
  exercise_days_30m: ExerciseChoice;
  sugary_drink_freq: FrequencyChoice;
  late_night_meal_freq: FrequencyChoice;
  post_meal_walk: WalkChoice;
};

export type OnboardingPredictionResponse = {
  survey_id: number;
  risk_group: 0 | 1;
  risk_probability: number;
  risk_stage: "normal" | "borderline" | "high";
  message: string;
  recommended_actions: string[];
};

export async function submitOnboardingSurvey(
  payload: OnboardingSurveyRequest,
): Promise<OnboardingPredictionResponse> {
  const res = await fetch("/api/v1/onboarding/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Onboarding API error ${res.status}: ${text}`);
  }

  return res.json();
}
