import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, LogOut, User, Lock } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, ApiError } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";

interface TopBarProps {
  children?: ReactNode;
}

const ACCESS_TOKEN_KEY = "dkfitt-access-token";
const READ_ALERTS_KEY = "dkfitt-read-topbar-alerts";
const PROFILE_ENDPOINTS = ["/api/nutritionist-profile/me", "/nutritionist-profile/me"];

type AlertType = "adherencia" | "peso" | "consumo_adicional" | "inactividad" | "exceso_calorico";

type ApiAlert = {
  id_alerta_sistema: number;
  tipo: AlertType;
  mensaje: string;
  nombre_paciente: string;
  fecha_generacion: string;
  revisada: boolean;
};

type AlertsResponse = {
  success?: boolean;
  data?: ApiAlert[];
  meta?: {
    total?: number;
    sin_revisar?: number;
  };
};

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

function formatAlertDate(value?: string): string {
  if (!value) return "---";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "---";
  return date.toLocaleString("es-EC", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function isToday(value?: string): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
}

function getAlertLabel(type: AlertType): string {
  const labels: Record<AlertType, string> = {
    adherencia: "Adherencia",
    peso: "Peso",
    consumo_adicional: "Consumo adicional",
    inactividad: "Inactividad",
    exceso_calorico: "Exceso calorico",
  };
  return labels[type] ?? "Alerta";
}

function getReadAlertIds(): number[] {
  try {
    const raw = localStorage.getItem(READ_ALERTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : [];
  } catch {
    return [];
  }
}

function saveReadAlertIds(ids: number[]) {
  try {
    localStorage.setItem(READ_ALERTS_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    // Ignore storage errors.
  }
}

export function TopBar({ children }: TopBarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const [sex, setSex] = useState<"M" | "F" | "O" | null>(null);
  const [alerts, setAlerts] = useState<ApiAlert[]>([]);
  const [pendingAlerts, setPendingAlerts] = useState(0);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const lastAlertsLoadRef = useRef(0);

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

  const loadAlerts = async (force = false) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return;
    const now = Date.now();
    if (!force && now - lastAlertsLoadRef.current < 120_000) return;
    lastAlertsLoadRef.current = now;

    setLoadingAlerts(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "8", revisada: "false" });
      const response = await apiRequest<AlertsResponse>(`/alerts?${params.toString()}`, {
        method: "GET",
        accessToken: token,
      });
      const nextAlerts = Array.isArray(response.data) ? response.data : [];
      const readIds = getReadAlertIds();
      const visibleAlerts = nextAlerts.filter((alert) => !readIds.includes(alert.id_alerta_sistema));
      setAlerts(visibleAlerts);
      setPendingAlerts(visibleAlerts.filter((alert) => !alert.revisada).length);
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) return;
      setAlerts([]);
      setPendingAlerts(0);
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    void loadAlerts();
    const intervalId = window.setInterval(() => void loadAlerts(), 600_000);
    let lastFocusLoad = 0;
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastFocusLoad < 60_000) return;
      lastFocusLoad = now;
      void loadAlerts();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const roleLabel = getRoleLabelBySex(sex);
  const todayAlerts = useMemo(() => alerts.filter((alert) => isToday(alert.fecha_generacion)), [alerts]);
  const alertPreview = todayAlerts.length > 0 ? todayAlerts : alerts;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const markAlertRead = (id: number) => {
    saveReadAlertIds([...getReadAlertIds(), id]);
    setAlerts((prev) => prev.filter((alert) => alert.id_alerta_sistema !== id));
    setPendingAlerts((prev) => Math.max(prev - 1, 0));
  };

  return (
    <>
      <header className="flex h-16 min-w-0 items-center justify-between border-b border-border bg-card px-4 shadow-sm md:px-6">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <SidebarTrigger className="relative z-20 shrink-0 text-muted-foreground hover:text-foreground" />
          {children}
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          <DropdownMenu onOpenChange={(open) => { if (open) void loadAlerts(true); }}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                <Bell className="h-5 w-5" />
                {pendingAlerts > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {pendingAlerts > 9 ? "9+" : pendingAlerts}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-96">
              <DropdownMenuLabel className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Notificaciones</p>
                  <p className="text-xs font-normal text-muted-foreground">
                    {pendingAlerts > 0 ? `${pendingAlerts} alertas sin revisar` : "No tienes alertas pendientes"}
                  </p>
                </div>
                {todayAlerts.length > 0 && (
                  <span className="rounded-full bg-accent/15 px-2 py-1 text-[10px] font-semibold text-accent">
                    {todayAlerts.length} hoy
                  </span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {loadingAlerts && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">Cargando alertas...</div>
              )}

              {!loadingAlerts && alertPreview.length === 0 && (
                <div className="px-3 py-6 text-center">
                  <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-primary" />
                  <p className="text-sm font-medium text-foreground">Todo al dia</p>
                  <p className="text-xs text-muted-foreground">No hay alertas pendientes por revisar.</p>
                </div>
              )}

              {!loadingAlerts && alertPreview.length > 0 && (
                <div className="max-h-80 overflow-y-auto py-1">
                  {todayAlerts.length > 0 && (
                    <div className="mx-2 mb-1 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
                      Tienes alertas generadas hoy. Revisa los pacientes que requieren atencion.
                    </div>
                  )}
                  {alertPreview.map((alert) => (
                    <div key={alert.id_alerta_sistema} className="mx-1 rounded-md px-2 py-2 hover:bg-muted/60">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-xs font-semibold text-foreground">{alert.nombre_paciente || "Paciente"}</p>
                            <span className="shrink-0 text-[10px] text-muted-foreground">{formatAlertDate(alert.fecha_generacion)}</span>
                          </div>
                          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">{getAlertLabel(alert.tipo)}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{alert.mensaje}</p>
                          <div className="mt-2 flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => markAlertRead(alert.id_alerta_sistema)}
                            >
                              Marcar como leída
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/alertas")} className="cursor-pointer justify-center text-xs font-medium text-primary">
                Ver todas las alertas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
