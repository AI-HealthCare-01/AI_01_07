import { apiClient, unwrap } from './client.js';

export const onboardingApi = {
  run(payload) {
    return unwrap(apiClient.post('/v1/onboarding/run', payload, { timeout: 20000 }));
  },
  async hasCompleted() {
    try {
      const latest = await unwrap(apiClient.get('/v1/onboarding/latest'));
      if (typeof latest?.has_onboarding === 'boolean') {
        return latest.has_onboarding;
      }
    } catch {
      // fallback to profile-overview for backward compatibility
    }
    const profile = await unwrap(apiClient.get('/v1/users/me/profile-overview'));
    if (typeof profile?.onboarding_completed === 'boolean') return profile.onboarding_completed;
    return Boolean(profile?.bmi);
  },
};
