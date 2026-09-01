import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  res => res,
  err => {
    const message =
      err.response?.data?.message ||
      err.response?.data?.errors?.[0]?.msg ||
      err.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;
