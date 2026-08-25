const BASE = import.meta.env["VITE_API_BASE_URL"] ?? "/api";

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(init?.headers as Record<string, string>),
  };
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.message ?? res.statusText, body.error);
  }

  return res.json() as Promise<T>;
}

export { ApiError, request };
