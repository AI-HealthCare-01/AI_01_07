import { apiClient, unwrap } from './client.js';

export const onboardingApi = {
  run(payload) {
    return unwrap(apiClient.post('/v1/onboarding/run', payload));
  },
};
