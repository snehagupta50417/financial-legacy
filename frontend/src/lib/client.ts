"use client";

/** Session-scoped fetch wrapper. The session key lives in localStorage and is
 * sent as x-session-id; server-side queries are always scoped by it. */
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem("finlegacy_session");
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem("finlegacy_session", id);
  }
  return id;
}

export class ApiError extends Error {
  status: number;
  /** Machine-readable reason some routes add, e.g. "ai_consent_required". */
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let refresh: Promise<boolean> | null = null;
let expectedAccount: string | null | undefined;
function accountHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  if (expectedAccount === undefined) expectedAccount = window.localStorage.getItem("keeper.account");
  return expectedAccount ? { "x-keeper-account": expectedAccount } : {};
}
async function request<T>(url: string, init?: RequestInit, retried = false): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "x-session-id": getSessionId(),
      ...accountHeader(),
    },
  });
  if (res.status === 401 && !retried) {
    refresh ??= fetch("/api/auth/session", { cache: "no-store" }).then(r => r.ok).catch(() => false).finally(() => { refresh = null; });
    if (await refresh) return request<T>(url, init, true);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error || `Request failed (${res.status})`, res.status, (data as { code?: string }).code);
  }
  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown, options?: { signal?: AbortSignal }) =>
    request<T>(url, {
      signal: options?.signal,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    }),
  put: <T>(url: string, body?: unknown) =>
    request<T>(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    }),
  delete: <T>(url: string, body?: unknown) => request<T>(url, { method: "DELETE", ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) }),
  upload: <T>(url: string, form: FormData) => request<T>(url, { method: "POST", body: form }),
};
