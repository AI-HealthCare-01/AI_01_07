const ACTIVE_CHALLENGE_KEY = 'active_challenge_items';
const CHALLENGE_TARGETS_KEY = 'challenge_target_overrides';

export function saveActiveChallenge(challenge) {
  const items = loadActiveChallenges();
  const nextItems = [challenge, ...items.filter((item) => item.title !== challenge.title)];
  localStorage.setItem(ACTIVE_CHALLENGE_KEY, JSON.stringify(nextItems));
}

export function loadActiveChallenge() {
  return loadActiveChallenges()[0] || null;
}

export function loadActiveChallenges() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACTIVE_CHALLENGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadChallengeTargetOverrides() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CHALLENGE_TARGETS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveChallengeTargetOverride(title, target) {
  const next = { ...loadChallengeTargetOverrides(), [title]: target };
  localStorage.setItem(CHALLENGE_TARGETS_KEY, JSON.stringify(next));
  return next;
}
