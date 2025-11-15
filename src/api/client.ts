// added by new ERP update
import axios from "axios";
import { API_BASE } from "@/utils/env.js";

const sanitizedBaseUrl = (API_BASE || "http://localhost:3001/api").replace(/\/$/, "");

export const client = axios.create({
  baseURL: sanitizedBaseUrl || "http://localhost:3001/api",
  withCredentials: true,
});

export const api = client;
export default client;

client.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("erp_token") || localStorage.getItem("token");
  if (token) {
    cfg.headers = cfg.headers ?? {};
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});
