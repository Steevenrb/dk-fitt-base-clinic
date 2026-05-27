import { ReactNode, useEffect, useState } from "react";
import { Bell, LogOut, User, Lock } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";

interface TopBarProps {
  children?: ReactNode;
}

const ACCESS_TOKEN_KEY = "dkfitt-access-token";
const PROFILE_ENDPOINTS = ["/api/nutritionist-profile/me", "/nutritionist-profile/me"];

type NutritionistProfilePayload = {
  sexo?: string;
};

type NutritionistProfileResponse = {
  success?: boolean;
  data?: NutritionistProfilePayload;
} & NutritionistProfilePayload;

type RequestWithAuth = Omit<RequestInit, "body"> & { body?: unknown };

async function requestWithFallback<T>(paths: string[], token: string, options: RequestWithAuth): Promise<T> {
  let lastError: unknown;
  for (const path of paths) {
    try {
      return await apiRequest<T>(path, {
        ...options,
        accessToken: token,
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function normalizeSex(value?: string): "M" | "F" | "O" | "" {
  if (!value) return "";
  const raw = value.trim().toLowerCase();
  if (raw === "f" || raw === "femenino") return "F";
  if (raw === "m" || raw === "masculino") return "M";
  if (raw === "o" || raw === "otro") return "O";
  return "";
}

function getRoleLabelBySex(sex?: string | null): string {
  if (sex === "F") return "Nutriologa";
  return "Nutriologo";
}

export function TopBar({ children }: TopBarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const [sex, setSex] = useState<"M" | "F" | "O" | null>(null);

  useEffect(() => {
    let isActive = true;
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return;

    const loadProfile = async () => {
      try {
        const response = await requestWithFallback<NutritionistProfileResponse>(PROFILE_ENDPOINTS, token, { method: "GET" });
        const payload = response.data ?? response;
        const normalized = normalizeSex(payload.sexo);
        if (isActive) {
          setSex(normalized || null);
        }
      } catch {
        if (isActive) {
          setSex(null);
        }
      }
    };

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, []);

  const roleLabel = getRoleLabelBySex(sex);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6 shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />
          {children}
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">5</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-accent/50 transition-colors cursor-pointer">
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                    {user?.avatar || "NK"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium leading-none text-foreground">{user?.name || "Nutricionista Karen"}</p>
                  <p className="text-xs text-muted-foreground">{roleLabel}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium text-foreground">{user?.name || "Nutricionista Karen"}</p>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/mi-perfil")} className="cursor-pointer gap-2">
                <User className="h-4 w-4" /> Mi perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/mi-perfil?tab=security")} className="cursor-pointer gap-2">
                <Lock className="h-4 w-4" /> Cambiar contraseña
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowLogout(true)} className="cursor-pointer gap-2 text-destructive">
                <LogOut className="h-4 w-4" /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Dialog open={showLogout} onOpenChange={setShowLogout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Deseas cerrar sesión?</DialogTitle>
            <DialogDescription>Serás redirigido a la pantalla de inicio de sesión.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogout(false)}>Cancelar</Button>
            <Button onClick={handleLogout} className="bg-primary text-primary-foreground">Cerrar sesión</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
