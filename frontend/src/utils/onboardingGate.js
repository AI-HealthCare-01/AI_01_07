const CURRENT_USER_EMAIL_KEY = 'current_user_email';
const ONBOARDING_DONE_PREFIX = 'onboarding_done:';

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

export function hasCompletedOnboarding(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return localStorage.getItem(`${ONBOARDING_DONE_PREFIX}${normalized}`) === 'true';
}

export function markOnboardingCompleted(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  localStorage.setItem(`${ONBOARDING_DONE_PREFIX}${normalized}`, 'true');
}

