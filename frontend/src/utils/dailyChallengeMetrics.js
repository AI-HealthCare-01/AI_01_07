export function progressPercent(value, target) {
  if (!Number.isFinite(target) || target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
}

export function buildDailyChallengeItems(row, targetOverrides = {}) {
  return [
    {
      icon: '💧',
      title: '물 마시기',
      current: Number(row?.water_cups ?? 0),
      target: Number(targetOverrides['물 마시기'] ?? 8),
      unit: '컵',
    },
    {
      icon: '🚶',
      title: '걷기 운동',
      current: Number(row?.steps ?? 0),
      target: Number(targetOverrides['걷기 운동'] ?? 8000),
      unit: '보',
    },
    {
      icon: '🏃',
      title: '운동',
      current: Number(row?.exercise_minutes ?? 0),
      target: Number(targetOverrides.운동 ?? 30),
      unit: '분',
    },
    {
      icon: '🛌',
      title: '수면시간',
      current: Number(row?.sleep_hours ?? 0),
      target: Number(targetOverrides.수면시간 ?? 8),
      unit: '시간',
    },
    {
      icon: '🌙',
      title: '야식 금지',
      current: row?.no_snack ? 1 : 0,
      target: Number(targetOverrides['야식 금지'] ?? 1),
      unit: '달성',
    },
  ];
}

export function getDailyAchievementScore(items) {
  if (!Array.isArray(items) || items.length === 0) return 0;
  const total = items.reduce((sum, item) => sum + progressPercent(item.current, item.target), 0);
  return Math.round(total / items.length);
}
