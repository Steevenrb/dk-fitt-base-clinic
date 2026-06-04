import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, AlertTriangle, Bell, Flame, Scale, Timer, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ACCESS_TOKEN_KEY = "dkfitt-access-token";

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
};

type TabAlertasProps = {
  patientId: number;
  profileId?: number | null;
  patientName?: string;
};

const typeConfig: Record<AlertType, { label: string; icon: ElementType; className: string }> = {
  adherencia: { label: "Adherencia", icon: Activity, className: "bg-[#F7CA5E]/25 text-foreground border-[#F7CA5E]/60" },
  peso: { label: "Peso", icon: Scale, className: "bg-[#E6E6E6]/50 text-foreground border-border" },
  consumo_adicional: { label: "Consumo adicional", icon: UtensilsCrossed, className: "bg-[#F7CA5E]/20 text-foreground border-[#F7CA5E]/50" },
  inactividad: { label: "Inactividad", icon: Timer, className: "bg-[#FA9C5C]/18 text-foreground border-[#FA9C5C]/50" },
  exceso_calorico: { label: "Exceso calorico", icon: Flame, className: "bg-[#FA9C5C]/20 text-foreground border-[#FA9C5C]/50" },
};

function normalizeName(value?: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatDate(value?: string): string {
  if (!value) return "---";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "---";
  return date.toLocaleString("es-EC", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function unwrapAlerts(raw: unknown): AlertsResponse {
  if (!raw || typeof raw !== "object") return { data: [] };
  return raw as AlertsResponse;
}

export function TabAlertas({ patientId, profileId, patientName }: TabAlertasProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<ApiAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const patientKey = normalizeName(patientName);

  useEffect(() => {
    const fetchAlerts = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) {
        setLoading(false);
        toast({ title: "Sesion no valida", description: "No se encontro token de acceso.", variant: "destructive" });
        return;
      }

      setLoading(true);
      try {
        const response = unwrapAlerts(await apiRequest<unknown>("/alerts?page=1&limit=100", {
          method: "GET",
          accessToken: token,
        }));
        setAlerts(Array.isArray(response.data) ? response.data : []);
      } catch {
        setAlerts([]);
        toast({
          title: "No se pudo cargar alertas",
          description: "Verifica endpoint GET /alerts.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (patientId || profileId) void fetchAlerts();
  }, [patientId, profileId, toast]);

  const patientAlerts = useMemo(() => {
    const filtered = alerts.filter((alert) => {
      if (!patientKey) return false;
      const alertPatient = normalizeName(alert.nombre_paciente);
      return alertPatient === patientKey || alertPatient.includes(patientKey) || patientKey.includes(alertPatient);
    });

    return filtered.sort((a, b) => {
      if (a.revisada !== b.revisada) return a.revisada ? 1 : -1;
      return new Date(b.fecha_generacion).getTime() - new Date(a.fecha_generacion).getTime();
    });
  }, [alerts, patientKey]);

  const pending = patientAlerts.filter((alert) => !alert.revisada).length;

  const goToDetails = () => {
    const query = patientName ? `?paciente=${encodeURIComponent(patientName)}` : "";
    navigate(`/alertas${query}`);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-[#B7602B]" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Alertas del paciente</h3>
            <p className="text-xs text-muted-foreground">
              {pending} sin revisar de {patientAlerts.length} alertas registradas
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToDetails}>
          Detalles
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {loading && (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">Cargando alertas...</div>
        )}

        {!loading && patientAlerts.map((alert) => {
          const cfg = typeConfig[alert.tipo] ?? typeConfig.adherencia;
          const Icon = cfg.icon;
          const isPending = !alert.revisada;
          return (
            <div key={alert.id_alerta_sistema} className={`flex items-start gap-4 px-5 py-4 ${isPending ? "bg-[#FA9C5C]/8" : ""}`}>
              <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isPending ? "bg-[#FA9C5C]/20 text-[#B7602B]" : "bg-muted text-muted-foreground"}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>{cfg.label}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${isPending ? "bg-[#F7CA5E]/25 text-foreground border-[#F7CA5E]/60" : "bg-[#C5EB6F]/20 text-foreground border-[#C5EB6F]/50"}`}>
                    {isPending ? "Sin revisar" : "Revisada"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{alert.mensaje}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(alert.fecha_generacion)}</p>
              </div>
            </div>
          );
        })}

        {!loading && patientAlerts.length === 0 && (
          <div className="px-5 py-10 text-center">
            <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Este paciente no tiene alertas registradas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
