import { apiClient, unwrap } from './client.js';

export const adminApi = {
  listUsers({ page = 1, size = 20, q = '' } = {}) {
    return unwrap(apiClient.get('/v1/admin/users', { params: { page, size, q } }));
  },
};

