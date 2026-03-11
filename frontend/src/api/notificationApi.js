import { apiClient, unwrap } from './client.js';

export const notificationApi = {
  list(limit = 50) {
    return unwrap(apiClient.get('/v1/notifications', { params: { limit } }));
  },
  markRead(notificationId) {
    return unwrap(apiClient.patch(`/v1/notifications/${notificationId}/read`));
  },
  markAllRead() {
    return unwrap(apiClient.patch('/v1/notifications/read-all'));
  },
};
