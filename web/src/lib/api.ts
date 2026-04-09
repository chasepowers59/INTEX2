const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

export type ApiError = {
  message?: string;
  log?: string[];
  requiresTwoFactor?: boolean;
  [key: string]: unknown;
};

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

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw new Error(
      "Network error (Failed to fetch). Check API URL, HTTPS, and CORS settings on the API (App Service).",
    );
  }

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    let details: ApiError | null = null;
    try {
      details = (await res.json()) as ApiError;
      if (details?.message) msg = details.message;
      if (details?.log?.length) msg += `\n\n${details.log.join("\n")}`;
    } catch {
      // ignore
    }

    const error = new Error(msg) as Error & ApiError & { status?: number };
    error.status = res.status;
    if (details) {
      Object.assign(error, details);
    }
    throw error;
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
