// The one place that talks to the backend: adds the sign-in token and turns errors into ApiError
// with a message that is safe to show. By default requests go to the same-origin "/api" (the Vite dev
// proxy locally, the rewrite in vercel.json in production); VITE_API_BASE points them at another origin.
const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");

// Files the API serves (reward images) come back as "/api/uploads/..."; add the API origin when it differs.
export function assetUrl(path) {
  if (!path || /^(https?:|blob:|data:)/.test(path)) return path;
  return API_BASE.startsWith("http") ? `${new URL(API_BASE).origin}${path}` : path;
}
const TOKEN_KEY = "vietphonics-token";

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
}

// "Ghi nhớ đăng nhập": a remembered token lives in localStorage, otherwise only in sessionStorage.
export function loadToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY) || window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token, remember = true) {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);
    if (token) (remember ? window.localStorage : window.sessionStorage).setItem(TOKEN_KEY, token);
  } catch {
    // storage blocked: the token stays in memory for this tab
  }
  memoryToken = token || null;
}

let memoryToken = null;
const currentToken = () => memoryToken || loadToken();

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

function messageFrom(body, status) {
  const detail = body?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return "Thông tin chưa hợp lệ, vui lòng kiểm tra lại.";
  if (status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (status === 403) return "Bạn không có quyền thực hiện thao tác này.";
  if (status >= 500) return "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.";
  return "Có lỗi xảy ra. Vui lòng thử lại.";
}

export async function api(path, { method = "GET", body, form, raw = false } = {}) {
  const headers = {};
  const token = currentToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError("Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.");
  }
  if (raw && res.ok) return res;
  let data = null;
  try {
    data = await res.json();
  } catch {
    // empty or non-JSON body
  }
  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith("/auth/login")) onUnauthorized();
    throw new ApiError(messageFrom(data, res.status), res.status);
  }
  return data;
}
