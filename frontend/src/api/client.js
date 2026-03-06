import axios from 'axios';

const defaultBaseUrl = `${window.location.protocol}//${window.location.hostname}:8000/api`;
const baseURL = import.meta.env.VITE_API_BASE_URL || defaultBaseUrl;

export const apiClient = axios.create({
  baseURL,
  timeout: 5000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function unwrap(promise) {
  const response = await promise;
  return response.data;
}
