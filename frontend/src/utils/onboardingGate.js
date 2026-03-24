const CURRENT_USER_EMAIL_KEY = 'current_user_email';
const CURRENT_USER_NAME_KEY = 'current_user_name';
const ONBOARDING_DONE_PREFIX = 'onboarding_done:';
const ONBOARDING_DONE_NOTI_PENDING_PREFIX = 'onboarding_done_notice_pending:';
const ONBOARDING_RISK_PREFIX = 'onboarding_risk:';
const ONBOARDING_BMI_PREFIX = 'onboarding_bmi:';
const ONBOARDING_RISK_FALLBACK_KEY = `${ONBOARDING_RISK_PREFIX}__last__`;
const ONBOARDING_BMI_FALLBACK_KEY = `${ONBOARDING_BMI_PREFIX}__last__`;

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

export function setCurrentUserEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  localStorage.setItem(CURRENT_USER_EMAIL_KEY, normalized);
}

export function getCurrentUserEmail() {
  return localStorage.getItem(CURRENT_USER_EMAIL_KEY) || '';
}

export function clearCurrentUserEmail() {
  localStorage.removeItem(CURRENT_USER_EMAIL_KEY);
}

export function setCurrentUserName(name) {
  const normalized = String(name || '').trim();
  if (!normalized) return;
  localStorage.setItem(CURRENT_USER_NAME_KEY, normalized);
}

export function getCurrentUserName() {
  return localStorage.getItem(CURRENT_USER_NAME_KEY) || '';
}

export function clearCurrentUserName() {
  localStorage.removeItem(CURRENT_USER_NAME_KEY);
}

export function hasCompletedOnboarding(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return localStorage.getItem(`${ONBOARDING_DONE_PREFIX}${normalized}`) === 'true';
}

export function markOnboardingCompleted(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  const doneKey = `${ONBOARDING_DONE_PREFIX}${normalized}`;
  const pendingKey = `${ONBOARDING_DONE_NOTI_PENDING_PREFIX}${normalized}`;
  const wasCompleted = localStorage.getItem(doneKey) === 'true';
  if (!wasCompleted) {
    localStorage.setItem(pendingKey, 'true');
  }
  localStorage.setItem(doneKey, 'true');
}

export function syncOnboardingCompleted(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  localStorage.setItem(`${ONBOARDING_DONE_PREFIX}${normalized}`, 'true');
}

export function hasPendingOnboardingCompletedNotice(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return localStorage.getItem(`${ONBOARDING_DONE_NOTI_PENDING_PREFIX}${normalized}`) === 'true';
}

export function clearPendingOnboardingCompletedNotice(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  localStorage.removeItem(`${ONBOARDING_DONE_NOTI_PENDING_PREFIX}${normalized}`);
}

function toKstIsoDate(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

export function saveOnboardingRiskSnapshot(email, riskProbability) {
  const normalized = normalizeEmail(email);
  const risk = Number(riskProbability);
  if (!Number.isFinite(risk)) return;
  const payload = JSON.stringify({
    date: toKstIsoDate(),
    risk_probability: Math.max(0, Math.min(1, risk)),
  });
  if (normalized) {
    localStorage.setItem(`${ONBOARDING_RISK_PREFIX}${normalized}`, payload);
  }
  localStorage.setItem(ONBOARDING_RISK_FALLBACK_KEY, payload);
}

export function getOnboardingRiskSnapshot(email) {
  const normalized = normalizeEmail(email);
  const raw = normalized
    ? localStorage.getItem(`${ONBOARDING_RISK_PREFIX}${normalized}`) || localStorage.getItem(ONBOARDING_RISK_FALLBACK_KEY)
    : localStorage.getItem(ONBOARDING_RISK_FALLBACK_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const risk = Number(parsed?.risk_probability);
    if (!Number.isFinite(risk)) return null;
    return {
      date: String(parsed?.date || toKstIsoDate()),
      risk_probability: Math.max(0, Math.min(1, risk)),
    };
  } catch {
    return null;
  }
}

export function saveOnboardingBmiSnapshot(email, payload) {
  const normalized = normalizeEmail(email);
  const heightCm = Number(payload?.height_cm);
  const weightKg = Number(payload?.weight_kg);
  const bmi = Number(payload?.bmi);
  if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg) || !Number.isFinite(bmi)) return;
  if (heightCm <= 80 || heightCm > 250 || weightKg <= 20 || weightKg > 300 || bmi <= 0 || bmi > 100) return;
  const data = JSON.stringify({
    height_cm: heightCm,
    weight_kg: weightKg,
    bmi,
  });
  if (normalized) {
    localStorage.setItem(`${ONBOARDING_BMI_PREFIX}${normalized}`, data);
  }
  localStorage.setItem(ONBOARDING_BMI_FALLBACK_KEY, data);
}

export function getOnboardingBmiSnapshot(email) {
  const normalized = normalizeEmail(email);
  const raw = normalized
    ? localStorage.getItem(`${ONBOARDING_BMI_PREFIX}${normalized}`) || localStorage.getItem(ONBOARDING_BMI_FALLBACK_KEY)
    : localStorage.getItem(ONBOARDING_BMI_FALLBACK_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const heightCm = Number(parsed?.height_cm);
    const weightKg = Number(parsed?.weight_kg);
    const bmi = Number(parsed?.bmi);
    if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg) || !Number.isFinite(bmi)) return null;
    return { height_cm: heightCm, weight_kg: weightKg, bmi };
  } catch {
    return null;
  }
}
