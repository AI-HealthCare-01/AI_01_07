export type FoodResponse = {
  top3: { label: string; confidence: number }[];
  chosen: { label: string; name_ko: string | null };
  nutrition: null | { kcal: number; carb_g: number; protein_g: number; fat_g: number };
  macro_ratio_kcal: null | {
    carb_pct: number;
    protein_pct: number;
    fat_pct: number;
    total_kcal_from_macros: number;
  };
  recommendation: { warning: boolean; message: string; suggestions: string[] };
  source?: "db" | "llm" | "heuristic" | string;
};
