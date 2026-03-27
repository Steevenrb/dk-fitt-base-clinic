import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export type UserRole = "admin" | "nutricionista" | null;

interface User {
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("dkfitt-auth");
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback((email: string, password: string) => {
    if (email === "admin" && password === "admin") {
      const u: User = { name: "Administrador", email: "admin@dkfitt.com", role: "admin", avatar: "AD" };
      setUser(u);
      localStorage.setItem("dkfitt-auth", JSON.stringify(u));
      return { success: true };
    }
    if (email === "nutri" && password === "nutri") {
      const u: User = { name: "Nutricionista Karen", email: "karen@dkfitt.com", role: "nutricionista", avatar: "NK" };
      setUser(u);
      localStorage.setItem("dkfitt-auth", JSON.stringify(u));
      return { success: true };
    }
    return { success: false, error: "Credenciales incorrectas. Verifica tu correo y contraseña." };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("dkfitt-auth");
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
