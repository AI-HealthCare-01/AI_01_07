import { apiClient, unwrap } from './client.js';

export const onboardingApi = {
  run(payload) {
    return unwrap(apiClient.post('/v1/onboarding/run', payload));
  },
  async hasCompleted() {
    const profile = await unwrap(apiClient.get('/v1/users/me/profile-overview'));
    if (typeof profile?.onboarding_completed === 'boolean') {
      return profile.onboarding_completed;
    }
    return Boolean(profile?.bmi);
  },
};
