const CURRENT_USER_EMAIL_KEY = 'current_user_email';
const ONBOARDING_DONE_PREFIX = 'onboarding_done:';
const ONBOARDING_DONE_NOTI_PENDING_PREFIX = 'onboarding_done_notice_pending:';

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
