const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

export type ApiError = { message: string };

function requireApiBaseUrl(): string {
  if (!API_BASE_URL) throw new Error("Missing VITE_API_BASE_URL");
  return API_BASE_URL.replace(/\/+$/, "");
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const base = requireApiBaseUrl();
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (options.token) headers.set("Authorization", `Bearer ${options.token}`);

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const json = (await res.json()) as ApiError;
      if (json?.message) msg = json.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

