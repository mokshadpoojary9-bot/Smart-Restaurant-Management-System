import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("jwt");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// Global silent handler for transient errors so they never trigger the dev error overlay.
// Consumers can still await/catch to react — this just guarantees no unhandled rejection.
api.interceptors.response.use(
  (r) => r,
  (err) => {
    // let callers handle it, but don't let it bubble as unhandled
    return Promise.reject(err);
  }
);

// Prevent CRA's runtime error overlay from surfacing background poll failures.
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e?.reason;
    const msg = String(reason?.message || reason || "");
    if (/status code (401|403|404|502|503|504)/i.test(msg) || /Network Error/i.test(msg)) {
      e.preventDefault();
    }
  });
}

export default api;

