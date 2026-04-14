import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { apiRequest, ApiError } from "@/lib/api";

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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const AUTH_STORAGE_KEY = "dkfitt-auth";
const ACCESS_TOKEN_KEY = "dkfitt-access-token";
const REFRESH_TOKEN_KEY = "dkfitt-refresh-token";

interface LoginResponse {
  success: boolean;
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
    };
  };
}

interface MeResponse {
  success: boolean;
  data: {
    id: number;
    email: string;
    role: string;
    id_perfil: number | null;
    estado: string;
  };
}

const normalizeRole = (role: string | null | undefined): UserRole => {
  if (role === "administrador") return "admin";
  if (role === "admin") return "admin";
  if (role === "nutricionista") return "nutricionista";
  if (role === "paciente") return "paciente";
  return null;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });

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
        setUser(nextUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
      } catch {
        setUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    };

    void hydrateSession();
  }, []);

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
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

      return { success: true, role };
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

    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
