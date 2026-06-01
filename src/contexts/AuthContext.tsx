import { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from "react";
import { apiRequest, ApiError, getJwtExpirationMs, refreshAccessToken } from "@/lib/api";

export type UserRole = "admin" | "nutricionista" | "paciente" | null;

interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  estado?: string;
  idPerfil?: number | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  requiresPasswordChange: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole; requiresPasswordChange?: boolean }>;
  logout: () => void;
  clearPasswordChangeRequirement: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const AUTH_STORAGE_KEY = "dkfitt-auth";
const ACCESS_TOKEN_KEY = "dkfitt-access-token";
const REFRESH_TOKEN_KEY = "dkfitt-refresh-token";
const FORCE_PASSWORD_CHANGE_KEY = "dkfitt-force-password-change";
const ACTIVITY_KEY = "dkfitt-last-activity";
const SESSION_EXPIRED_KEY = "dkfitt-session-expired";
const INACTIVITY_LIMIT_MS = 15 * 60 * 1000;

interface LoginResponse {
  success: boolean;
  message?: string;
  data?: {
    access_token?: string;
    refresh_token?: string;
    accessToken?: string;
    refreshToken?: string;
    user?: {
      id_usuario?: number;
      id?: number;
      nombres?: string;
      apellidos?: string;
      name?: string;
      correo_institucional?: string;
      correo?: string;
      email?: string;
      rol?: string;
      role?: string;
      estado?: string;
      requiere_cambio_contrasena?: boolean;
      requiereCambioContrasena?: boolean;
      must_change_password?: boolean;
      mustChangePassword?: boolean;
      password_temporal?: boolean;
      passwordTemporal?: boolean;
      temporal_password?: boolean;
      temporalPassword?: boolean;
    };
    requiere_cambio_contrasena?: boolean;
    requiereCambioContrasena?: boolean;
    must_change_password?: boolean;
    mustChangePassword?: boolean;
    password_temporal?: boolean;
    passwordTemporal?: boolean;
    temporal_password?: boolean;
    temporalPassword?: boolean;
  };
}

interface MeResponse {
  success: boolean;
  message?: string;
  data: {
    id: number;
    email: string;
    role: string;
    id_perfil: number | null;
    estado: string;
    requiere_cambio_contrasena?: boolean;
    requiereCambioContrasena?: boolean;
    must_change_password?: boolean;
    mustChangePassword?: boolean;
    password_temporal?: boolean;
    passwordTemporal?: boolean;
    temporal_password?: boolean;
    temporalPassword?: boolean;
  };
}

const normalizeRole = (role: string | null | undefined): UserRole => {
  if (role === "administrador") return "admin";
  if (role === "admin") return "admin";
  if (role === "nutricionista") return "nutricionista";
  if (role === "paciente") return "paciente";
  return null;
};

const shouldForcePasswordChange = (obj: Record<string, unknown> | undefined): boolean => {
  if (!obj) return false;

  const candidates = [
    "requiere_cambio_contrasena",
    "requiereCambioContrasena",
    "must_change_password",
    "mustChangePassword",
    "password_temporal",
    "passwordTemporal",
    "temporal_password",
    "temporalPassword",
  ];

  return candidates.some((key) => obj[key] === true);
};

const hasPasswordChangeRequirement = (value: unknown): boolean => {
  const queue: unknown[] = [value];
  const visited = new Set<unknown>();

  const keyPattern = /(must.*change.*password|change.*password|required.*password|requiere.*contras|contras.*temporal|password.*temporal|first.*login|primer.*login)/i;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);

    for (const [key, raw] of Object.entries(current as Record<string, unknown>)) {
      if (raw === true && keyPattern.test(key)) return true;
      if (typeof raw === "string") {
        const lower = raw.toLowerCase();
        if (keyPattern.test(key) && (lower === "true" || lower.includes("temporal") || lower.includes("required") || lower.includes("obligatoria"))) {
          return true;
        }
        if ((key === "message" || key === "mensaje") && (lower.includes("cambiar") && lower.includes("contrase") && lower.includes("temporal"))) {
          return true;
        }
      }

      if (raw && typeof raw === "object") {
        queue.push(raw);
      }
    }
  }

  return false;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [requiresPasswordChange, setRequiresPasswordChange] = useState<boolean>(() => {
    return localStorage.getItem(FORCE_PASSWORD_CHANGE_KEY) === "true";
  });
  const lastActivityRef = useRef<number>(Date.now());
  const activityTimeoutRef = useRef<number | undefined>(undefined);
  const lastRefreshAttemptRef = useRef<number>(0);

  const clearSession = useCallback(() => {
    setUser(null);
    setRequiresPasswordChange(false);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(FORCE_PASSWORD_CHANGE_KEY);
  }, []);

  const forceLogout = useCallback(() => {
    localStorage.setItem(SESSION_EXPIRED_KEY, "inactive");
    clearSession();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.assign("/login?reason=inactive");
    }
  }, [clearSession]);

  useEffect(() => {
    const hydrateSession = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) return;

      try {
        const res = await apiRequest<MeResponse>("/api/auth/me", { method: "GET", accessToken: token });
        const normalizedRole = normalizeRole(res.data.role);
        const current = user;
        const nextUser: User = {
          id: res.data.id,
          name: current?.name || res.data.email,
          email: res.data.email,
          role: normalizedRole,
          avatar: current?.avatar || (res.data.email?.[0]?.toUpperCase() || "U"),
          estado: res.data.estado,
          idPerfil: res.data.id_perfil,
        };
        const requiresChange = shouldForcePasswordChange(res.data as unknown as Record<string, unknown>);
        setUser(nextUser);
        setRequiresPasswordChange(requiresChange);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
        localStorage.setItem(FORCE_PASSWORD_CHANGE_KEY, String(requiresChange));
      } catch {
        clearSession();
      }
    };

    void hydrateSession();
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiRequest<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: {
          correo_institucional: email,
          contrasena: password,
        },
      });

      const accessToken = res.data?.access_token || res.data?.accessToken;
      const refreshToken = res.data?.refresh_token || res.data?.refreshToken;
      const apiUser = res.data?.user;

      if (!accessToken || !refreshToken || !apiUser) {
        return { success: false, error: "La respuesta de login no incluyó sesión válida (tokens)." };
      }

      const role = normalizeRole(apiUser.rol || apiUser.role);
      let requiresChange =
        shouldForcePasswordChange(res.data as unknown as Record<string, unknown>)
        || shouldForcePasswordChange(apiUser as unknown as Record<string, unknown>)
        || hasPasswordChangeRequirement(res)
        || hasPasswordChangeRequirement(res.data)
        || hasPasswordChangeRequirement(apiUser);

      if (role === "paciente") {
        return { success: false, error: "Esta plataforma web es solo para administradores y nutricionistas." };
      }

      const fullName = `${apiUser.nombres || ""} ${apiUser.apellidos || ""}`.trim();
      const resolvedName = fullName || apiUser.name || apiUser.email || apiUser.correo_institucional || email;
      const resolvedEmail = apiUser.correo_institucional || apiUser.correo || apiUser.email || email;
      const avatarSeed = fullName || resolvedEmail;

      const nextUser: User = {
        id: Number(apiUser.id_usuario ?? apiUser.id ?? 0),
        name: resolvedName,
        email: resolvedEmail,
        role,
        avatar: `${avatarSeed?.[0] || ""}`.toUpperCase() || "U",
        estado: apiUser.estado,
      };

      setUser(nextUser);
      setRequiresPasswordChange(requiresChange);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      localStorage.setItem(FORCE_PASSWORD_CHANGE_KEY, String(requiresChange));

      // Some backends only expose this flag in /auth/me, not in /auth/login.
      try {
        const me = await apiRequest<MeResponse>("/api/auth/me", { method: "GET", accessToken });
        const meRequiresChange =
          shouldForcePasswordChange(me.data as unknown as Record<string, unknown>)
          || hasPasswordChangeRequirement(me)
          || hasPasswordChangeRequirement(me.data);
        if (meRequiresChange !== requiresChange) {
          requiresChange = meRequiresChange;
          setRequiresPasswordChange(meRequiresChange);
          localStorage.setItem(FORCE_PASSWORD_CHANGE_KEY, String(meRequiresChange));
        }
      } catch {
        // Keep login successful even if /me verification fails.
      }

      return { success: true, role, requiresPasswordChange: requiresChange };
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          return { success: false, error: "Credenciales inválidas." };
        }
        if (error.status === 403) {
          return { success: false, error: "Cuenta suspendida o inactiva." };
        }
        if (error.status === 429) {
          return { success: false, error: "Demasiados intentos. Intenta nuevamente en unos minutos." };
        }
      }
      return { success: false, error: "No se pudo iniciar sesión. Verifica la conexión con la API." };
    }
  }, []);

  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      void apiRequest("/api/auth/logout", {
        method: "POST",
        body: { refresh_token: refreshToken },
      }).catch(() => {
        // Si falla logout remoto, limpiamos sesión local igualmente.
      });
    }

    clearSession();
  }, [clearSession]);

  useEffect(() => {
    const handleExpired = () => {
      clearSession();
    };

    window.addEventListener("dkfitt-auth-expired", handleExpired as EventListener);
    return () => window.removeEventListener("dkfitt-auth-expired", handleExpired as EventListener);
  }, [clearSession]);

  useEffect(() => {
    if (!user) return undefined;

    const markActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      localStorage.setItem(ACTIVITY_KEY, String(now));
      if (activityTimeoutRef.current) {
        window.clearTimeout(activityTimeoutRef.current);
      }
      activityTimeoutRef.current = window.setTimeout(() => {
        forceLogout();
      }, INACTIVITY_LIMIT_MS);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === ACTIVITY_KEY && event.newValue) {
        const parsed = Number(event.newValue);
        if (Number.isFinite(parsed) && parsed > lastActivityRef.current) {
          lastActivityRef.current = parsed;
        }
      }
    };

    const refreshIfNeeded = () => {
      const now = Date.now();
      const recentlyActive = now - lastActivityRef.current < 2 * 60 * 1000;
      const enoughTimeSinceLastAttempt = now - lastRefreshAttemptRef.current > 30 * 1000;
      if (!recentlyActive || !enoughTimeSinceLastAttempt) return;

      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      const expiresAt = getJwtExpirationMs(token);
      if (!expiresAt) return;

      const expiresSoon = expiresAt - now < 90 * 1000;
      if (!expiresSoon) return;

      lastRefreshAttemptRef.current = now;
      void refreshAccessToken();
    };

    const intervalId = window.setInterval(() => {
      const last = lastActivityRef.current;
      if (Date.now() - last >= INACTIVITY_LIMIT_MS) {
        forceLogout();
        return;
      }
      refreshIfNeeded();
    }, 30_000);

    const activityEvents: Array<keyof DocumentEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "touchmove",
      "wheel",
      "pointerdown",
      "pointermove",
      "scroll",
      "visibilitychange",
    ];

    activityEvents.forEach((evt) => document.addEventListener(evt, markActivity, { passive: true }));
    window.addEventListener("focus", markActivity, { passive: true });
    window.addEventListener("storage", handleStorage);
    markActivity();
    refreshIfNeeded();

    return () => {
      activityEvents.forEach((evt) => document.removeEventListener(evt, markActivity));
      window.removeEventListener("focus", markActivity);
      window.removeEventListener("storage", handleStorage);
      window.clearInterval(intervalId);
      if (activityTimeoutRef.current) {
        window.clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [user, forceLogout]);

  const clearPasswordChangeRequirement = useCallback(() => {
    setRequiresPasswordChange(false);
    localStorage.setItem(FORCE_PASSWORD_CHANGE_KEY, "false");
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, requiresPasswordChange, login, logout, clearPasswordChangeRequirement }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
