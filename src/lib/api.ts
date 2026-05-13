const RAW_API_BASE_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "https://dk-fitt-api.onrender.com/api").replace(/\/+$/, "");
const WITH_API_SUFFIX = RAW_API_BASE_URL.endsWith("/api") ? RAW_API_BASE_URL : `${RAW_API_BASE_URL}/api`;
export const API_BASE_URL = WITH_API_SUFFIX;

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

  const normalizedPath = (() => {
    if (API_BASE_URL.endsWith("/api") && path.startsWith("/api/")) {
      return path.slice(4);
    }
    return path;
  })();

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

  const response = await fetch(`${API_BASE_URL}${normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`}`, {
    ...rest,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const shouldForceLogout = response.status === 401;
    if (shouldForceLogout && !path.includes("/auth/login")) {
      try {
        localStorage.removeItem("dkfitt-auth");
        localStorage.removeItem("dkfitt-access-token");
        localStorage.removeItem("dkfitt-refresh-token");
        localStorage.removeItem("dkfitt-force-password-change");
        localStorage.setItem("dkfitt-session-expired", "token");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("dkfitt-auth-expired"));
        }
      } catch {
        // Ignore storage errors.
      }

      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.assign("/login?reason=token");
      }
    }

    const message = (parsed as { message?: string } | null)?.message || response.statusText || "Error de API";
    throw new ApiError(message, response.status, parsed);
  }

  return parsed as T;
}
