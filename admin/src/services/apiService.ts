import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const AUTH_TOKEN = import.meta.env.VITE_BEARER_TOKEN;

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${AUTH_TOKEN}`;
  return config;
});

export default api;
