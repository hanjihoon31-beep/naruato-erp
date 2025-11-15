const rawApiBaseInput = (import.meta.env.VITE_API_BASE || "/api").trim();
const sanitizedApiInput = rawApiBaseInput.replace(/\/$/, "");
const apiInputHasProtocol = /^https?:\/\//i.test(sanitizedApiInput);

const resolveApiPath = () => {
  if (apiInputHasProtocol) {
    try {
      const url = new URL(sanitizedApiInput);
      const pathname = url.pathname.replace(/\/$/, "");
      return pathname || "/api";
    } catch {
      return "/api";
    }
  }
  if (!sanitizedApiInput) return "/api";
  return sanitizedApiInput.startsWith("/") ? sanitizedApiInput : `/${sanitizedApiInput}`;
};

const API_PATH_VALUE = resolveApiPath();

const deriveServerOrigin = () => {
  if (import.meta.env.VITE_SERVER_ORIGIN) {
    return import.meta.env.VITE_SERVER_ORIGIN.replace(/\/$/, "");
  }
  if (apiInputHasProtocol) {
    try {
      const url = new URL(sanitizedApiInput);
      return url.origin;
    } catch {
      /* fall through */
    }
  }
  if (typeof window !== "undefined" && window.location.origin) {
    if (import.meta.env.DEV) {
      const { protocol, hostname } = window.location;
      return `${protocol}//${hostname}:3001`;
    }
    return window.location.origin;
  }
  return "http://localhost:3001";
};

export const SERVER_ORIGIN = deriveServerOrigin();
export const API_BASE = apiInputHasProtocol ? sanitizedApiInput : `${SERVER_ORIGIN}${API_PATH_VALUE}`;
export const API_PATH = API_PATH_VALUE;
export const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || "/socket.io";
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || SERVER_ORIGIN;
