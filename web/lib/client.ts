"use client";

// Browser-side calls to the Django API through this site's /api proxy.
// Login is a session cookie; Django also wants its CSRF token on writes.

export class ApiError extends Error {
  constructor(public status: number, message: string, public data: unknown = null) {
    super(message);
  }
}

function csrfToken() {
  return document.cookie.match(/(?:^|; )csrftoken=([^;]+)/)?.[1] ?? "";
}

async function ensureCsrf() {
  if (!csrfToken()) await fetch("/api/auth/csrf/", { credentials: "same-origin" });
  return csrfToken();
}

function messageFrom(data: unknown, status: number) {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.detail === "string") return d.detail;
    const first = Object.values(d)[0];
    if (first) return [first].flat().join(" ");
  }
  if (status === 429) return "ძალიან ბევრი მცდელობა. სცადეთ ცოტა ხანში.";
  return "რაღაც შეცდომა მოხდა. სცადეთ თავიდან.";
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; json?: unknown; form?: FormData } = {},
): Promise<T> {
  const method = options.method ?? (options.json || options.form ? "POST" : "GET");
  const headers: Record<string, string> = {};
  if (method !== "GET") headers["X-CSRFToken"] = await ensureCsrf();
  if (options.json !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`/api/${path}`, {
    method,
    headers,
    credentials: "same-origin",
    body: options.form ?? (options.json !== undefined ? JSON.stringify(options.json) : undefined),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, messageFrom(data, res.status), data);
  return data as T;
}

export type Me = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  organization: { id: number; name: string; code: string; is_dealer: boolean; is_leasing: boolean } | null;
};

/** Where a user lands after login. */
export function homeFor(me: Me) {
  if (me.organization?.is_dealer) return "/dealer/cars";
  if (me.organization?.is_leasing) return "/leasing";
  if (me.is_staff) return "/overview";
  return "/";
}
