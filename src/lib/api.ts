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
  skipAuthRefresh?: boolean;
};

const ACCESS_TOKEN_KEY = "dkfitt-access-token";
const REFRESH_TOKEN_KEY = "dkfitt-refresh-token";
const AUTH_STORAGE_KEY = "dkfitt-auth";
const FORCE_PASSWORD_CHANGE_KEY = "dkfitt-force-password-change";
const SESSION_EXPIRED_KEY = "dkfitt-session-expired";

type RefreshResponse = {
  data?: {
    access_token?: string;
    accessToken?: string;
    refresh_token?: string;
    refreshToken?: string;
  };
  access_token?: string;
  accessToken?: string;
  refresh_token?: string;
  refreshToken?: string;
};

let refreshPromise: Promise<string | null> | null = null;

const normalizePath = (path: string) => {
  if (API_BASE_URL.endsWith("/api") && path.startsWith("/api/")) {
    return path.slice(4);
  }
  return path;
};

const buildUrl = (path: string) => {
  const normalizedPath = normalizePath(path);
  return `${API_BASE_URL}${normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`}`;
};

const clearStoredSession = (reason: "token" | "inactive" = "token") => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(FORCE_PASSWORD_CHANGE_KEY);
    localStorage.setItem(SESSION_EXPIRED_KEY, reason);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dkfitt-auth-expired"));
    }
  } catch {
    // Ignore storage errors.
  }
};

const redirectToLogin = (reason: "token" | "inactive" = "token") => {
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.assign(`/login?reason=${reason}`);
  }
};

const forceLogoutForExpiredToken = () => {
  clearStoredSession("token");
  redirectToLogin("token");
};

const parseJsonSafely = (text: string) => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const extractRefreshTokens = (payload: RefreshResponse | null) => {
  const accessToken = payload?.data?.access_token || payload?.data?.accessToken || payload?.access_token || payload?.accessToken || null;
  const refreshToken = payload?.data?.refresh_token || payload?.data?.refreshToken || payload?.refresh_token || payload?.refreshToken || null;
  return { accessToken, refreshToken };
};

const requestTokenRefresh = async () => {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  const refreshPaths = ["/auth/refresh", "/auth/refresh-token"];
  let lastError: unknown = null;

  for (const path of refreshPaths) {
    try {
      const response = await fetch(buildUrl(path), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken, refreshToken }),
      });

      const parsed = parseJsonSafely(await response.text()) as RefreshResponse | null;
      if (!response.ok) {
        lastError = new ApiError(response.statusText || "No se pudo refrescar la sesion", response.status, parsed);
        continue;
      }

      const tokens = extractRefreshTokens(parsed);
      if (!tokens.accessToken) {
        lastError = new ApiError("La respuesta de refresh no incluyo access token", response.status, parsed);
        continue;
      }

      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
      if (tokens.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
      return tokens.accessToken;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

export const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = requestTokenRefresh()
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

export const getJwtExpirationMs = (token: string | null) => {
  if (!token) return null;
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
    const decoded = JSON.parse(atob(padded));
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, accessToken, headers, skipAuthRefresh, ...rest } = options;

  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string> | undefined),
  };

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const isStringBody = typeof body === "string";
  const shouldJsonEncode = body !== undefined && !isFormData && !isStringBody;

  if (body !== undefined && !isFormData && !isStringBody) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const isLoginRequest = path.includes("/auth/login");
  const storedToken = !isLoginRequest ? accessToken || localStorage.getItem(ACCESS_TOKEN_KEY) || undefined : undefined;

  if (storedToken) {
    requestHeaders.Authorization = `Bearer ${storedToken}`;
  }

  const response = await fetch(buildUrl(path), {
    ...rest,
    headers: requestHeaders,
    body: body === undefined ? undefined : shouldJsonEncode ? JSON.stringify(body) : (body as BodyInit),
  });

  const text = await response.text();
  const parsed = parseJsonSafely(text);

  if (!response.ok) {
    const canRefresh =
      response.status === 401
      && !skipAuthRefresh
      && !path.includes("/auth/login")
      && !path.includes("/auth/refresh")
      && !path.includes("/auth/logout")
      && !!localStorage.getItem(REFRESH_TOKEN_KEY);

    if (canRefresh) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return apiRequest<T>(path, {
          ...rest,
          body,
          headers,
          accessToken: newToken,
          skipAuthRefresh: true,
        });
      }
    }

    if (response.status === 401 && !path.includes("/auth/login")) {
      forceLogoutForExpiredToken();
    }

    const message = (parsed as { message?: string } | null)?.message || response.statusText || "Error de API";
    throw new ApiError(message, response.status, parsed);
  }

  return parsed as T;
}
