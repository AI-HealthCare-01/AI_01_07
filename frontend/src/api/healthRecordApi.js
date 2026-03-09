import { apiClient, unwrap } from './client.js';

export const healthRecordApi = {
  getToday() {
    return unwrap(apiClient.get('/v1/health-record/today'));
  },
  saveToday(payload) {
    return unwrap(apiClient.post('/v1/health-record/today', payload));
  },
};
