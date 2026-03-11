import { apiClient, unwrap } from './client.js';

export function getTodayChallenge() {
  return unwrap(apiClient.get('/v1/challenges/today'));
}

export function saveTodayChallenge(payload) {
  return unwrap(apiClient.post('/v1/challenges/daily', payload));
}

export function getChallengeTrend(days = 7) {
  return unwrap(apiClient.get(`/v1/challenges/trend?days=${days}`));
}
