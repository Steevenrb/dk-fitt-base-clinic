export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://dk-fitt-api.onrender.com").replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  accessToken?: string;
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, accessToken, headers, ...rest } = options;

  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string> | undefined),
  };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`, {
    ...rest,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = (parsed as { message?: string } | null)?.message || response.statusText || "Error de API";
    throw new ApiError(message, response.status, parsed);
  }

  return parsed as T;
}
