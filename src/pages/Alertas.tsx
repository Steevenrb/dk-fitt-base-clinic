import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Bell,
  AlertTriangle,
  Users,
  CheckCircle2,
  ChevronRight,
  UtensilsCrossed,
  Activity,
  Timer,
  Scale,
  Flame,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ACCESS_TOKEN_KEY = "dkfitt-access-token";

type AlertType = "adherencia" | "peso" | "consumo_adicional" | "inactividad" | "exceso_calorico";
type StatusFilter = "all" | "pending" | "reviewed";

type ApiAlert = {
  id_alerta_sistema: number;
  tipo: AlertType;
  mensaje: string;
  nombre_paciente: string;
  fecha_generacion: string;
  revisada: boolean;
};

type AlertsMeta = {
  total?: number;
  sin_revisar?: number;
};

type AlertsResponse = {
  success?: boolean;
  data?: ApiAlert[];
  meta?: AlertsMeta;
};

const typeConfig: Record<AlertType, { label: string; icon: React.ElementType; className: string }> = {
  adherencia: { label: "Adherencia", icon: Activity, className: "bg-primary/15 text-primary border-primary/30" },
  peso: { label: "Peso", icon: Scale, className: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  consumo_adicional: { label: "Consumo adicional", icon: UtensilsCrossed, className: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  inactividad: { label: "Inactividad", icon: Timer, className: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  exceso_calorico: { label: "Exceso calórico", icon: Flame, className: "bg-accent/20 text-accent border-accent/30" },
};

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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function unwrapAlerts(raw: unknown): AlertsResponse {
  if (!raw || typeof raw !== "object") return { data: [], meta: {} };
  return raw as AlertsResponse;
}

const Alertas = () => {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<ApiAlert[]>([]);
  const [meta, setMeta] = useState<AlertsMeta>({});
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<"all" | AlertType>("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [filterPatient, setFilterPatient] = useState<string>("all");
  const [selectedAlert, setSelectedAlert] = useState<ApiAlert | null>(null);

  const fetchAlerts = async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      setLoading(false);
      toast({ title: "Sesión no válida", description: "No se encontró token de acceso.", variant: "destructive" });
      return;
    }

    const params = new URLSearchParams();
    params.set("page", "1");
    params.set("limit", "100");
    if (filterType !== "all") params.set("tipo", filterType);
    if (filterStatus !== "all") params.set("revisada", filterStatus === "reviewed" ? "true" : "false");

    setLoading(true);
    try {
      const response = unwrapAlerts(await apiRequest<unknown>(`/alerts?${params.toString()}`, {
        method: "GET",
        accessToken: token,
      }));
      setAlerts(Array.isArray(response.data) ? response.data : []);
      setMeta(response.meta || {});
    } catch {
      setAlerts([]);
      setMeta({});
      toast({
        title: "No se pudo cargar alertas",
        description: "Verifica endpoint GET /alerts.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAlerts();
  }, [filterType, filterStatus]);

  const patients = useMemo(() => [...new Set(alerts.map((alert) => alert.nombre_paciente).filter(Boolean))], [alerts]);

  const filtered = useMemo(() => {
    let list = [...alerts];
    if (filterPatient !== "all") list = list.filter((alert) => alert.nombre_paciente === filterPatient);
    list.sort((a, b) => {
      if (a.revisada !== b.revisada) return a.revisada ? 1 : -1;
      return new Date(b.fecha_generacion).getTime() - new Date(a.fecha_generacion).getTime();
    });
    return list;
  }, [alerts, filterPatient]);

  const total = meta.total ?? alerts.length;
  const pendingCount = meta.sin_revisar ?? alerts.filter((alert) => !alert.revisada).length;
  const reviewedCount = Math.max(total - pendingCount, 0);
  const patientsWithAlerts = new Set(alerts.filter((alert) => !alert.revisada).map((alert) => alert.nombre_paciente)).size;
  const highAttentionCount = alerts.filter((alert) => !alert.revisada && (alert.tipo === "adherencia" || alert.tipo === "exceso_calorico")).length;

  const markReviewed = async (id: number) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return;

    setMarkingId(id);
    try {
      await apiRequest(`/alerts/${id}/review`, {
        method: "PATCH",
        accessToken: token,
      });
      setAlerts((prev) => prev.map((alert) => alert.id_alerta_sistema === id ? { ...alert, revisada: true } : alert));
      setSelectedAlert((prev) => prev?.id_alerta_sistema === id ? { ...prev, revisada: true } : prev);
      setMeta((prev) => ({
        ...prev,
        sin_revisar: Math.max((prev.sin_revisar ?? pendingCount) - 1, 0),
      }));
      toast({ title: "Alerta revisada", description: "La alerta fue marcada como revisada." });
    } catch {
      toast({
        title: "No se pudo revisar la alerta",
        description: "Verifica endpoint PATCH /alerts/{id}/review.",
        variant: "destructive",
      });
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Gestión de Alertas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Alertas clínicas automáticas detectadas para tus pacientes</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Select value={filterType} onValueChange={(value) => setFilterType(value as "all" | AlertType)}>
            <SelectTrigger className="w-[190px] h-9 text-xs bg-card border-border">
              <SelectValue placeholder="Tipo de alerta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="adherencia">Adherencia</SelectItem>
              <SelectItem value="peso">Peso</SelectItem>
              <SelectItem value="consumo_adicional">Consumo adicional</SelectItem>
              <SelectItem value="inactividad">Inactividad</SelectItem>
              <SelectItem value="exceso_calorico">Exceso calórico</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as StatusFilter)}>
            <SelectTrigger className="w-[150px] h-9 text-xs bg-card border-border">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="pending">Sin revisar</SelectItem>
              <SelectItem value="reviewed">Revisadas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPatient} onValueChange={setFilterPatient}>
            <SelectTrigger className="w-[190px] h-9 text-xs bg-card border-border">
              <SelectValue placeholder="Paciente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los pacientes</SelectItem>
              {patients.map((patient) => (
                <SelectItem key={patient} value={patient}>{patient}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Alertas sin revisar", value: pendingCount, icon: Bell, accent: pendingCount > 0 },
            { label: "Alta atención", value: highAttentionCount, icon: AlertTriangle, accent: highAttentionCount > 0 },
            { label: "Pacientes con alertas", value: patientsWithAlerts, icon: Users, accent: false },
            { label: "Revisadas / Total", value: `${reviewedCount} / ${total}`, icon: CheckCircle2, accent: false },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={`h-4 w-4 ${kpi.accent ? "text-accent" : "text-primary"}`} />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
              </div>
              <p className={`text-xl font-bold ${kpi.accent ? "text-accent" : "text-foreground"}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {loading && (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              Cargando alertas...
            </div>
          )}

          {!loading && filtered.map((alert) => {
            const tc = typeConfig[alert.tipo] ?? typeConfig.adherencia;
            const TypeIcon = tc.icon;
            const isPending = !alert.revisada;
            const isHighPending = isPending && (alert.tipo === "adherencia" || alert.tipo === "exceso_calorico");

            return (
              <div
                key={alert.id_alerta_sistema}
                className={`rounded-xl border bg-card p-4 transition-all cursor-pointer hover:shadow-lg hover:shadow-primary/5 ${
                  isHighPending ? "border-accent/40 bg-accent/[0.03]" : "border-border"
                }`}
                onClick={() => setSelectedAlert(alert)}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isHighPending ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
                  }`}>
                    {initials(alert.nombre_paciente)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{alert.nombre_paciente}</p>
                      <Badge variant="outline" className={`text-[10px] ${tc.className}`}>
                        <TypeIcon className="h-3 w-3 mr-1" />{tc.label}
                      </Badge>
                      {alert.revisada ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" />Revisada
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-primary/15 text-primary border-primary/30">Sin revisar</Badge>
                      )}
                    </div>
                    <p className={`text-xs ${isPending ? "text-foreground" : "text-muted-foreground"}`}>{alert.mensaje}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDate(alert.fecha_generacion)}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isPending && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={markingId === alert.id_alerta_sistema}
                        className="text-[11px] h-7 gap-1 border-primary/30 text-primary hover:bg-primary/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          void markReviewed(alert.id_alerta_sistema);
                        }}
                      >
                        <CheckCircle2 className="h-3 w-3" /> Revisar
                      </Button>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            );
          })}

          {!loading && filtered.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No se encontraron alertas con los filtros seleccionados</p>
            </div>
          )}
        </div>
      </div>

      <Sheet open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <SheetContent className="w-full sm:max-w-lg border-border bg-card overflow-y-auto">
          {selectedAlert && (() => {
            const tc = typeConfig[selectedAlert.tipo] ?? typeConfig.adherencia;
            const TypeIcon = tc.icon;
            const isPending = !selectedAlert.revisada;
            return (
              <>
                <SheetHeader className="space-y-3 pb-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${
                      isPending ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
                    }`}>
                      {initials(selectedAlert.nombre_paciente)}
                    </div>
                    <div>
                      <SheetTitle className="text-foreground">{selectedAlert.nombre_paciente}</SheetTitle>
                      <p className="text-xs text-muted-foreground">{formatDate(selectedAlert.fecha_generacion)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] ${tc.className}`}>
                      <TypeIcon className="h-3 w-3 mr-1" />{tc.label}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] ${
                      isPending ? "bg-primary/15 text-primary border-primary/30" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    }`}>
                      {isPending ? "Sin revisar" : "Revisada"}
                    </Badge>
                  </div>
                </SheetHeader>

                <div className="space-y-5 pt-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Mensaje</p>
                    <p className="text-sm text-foreground">{selectedAlert.mensaje}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 border border-border p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Nota</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      El endpoint actual no incluye id del paciente ni detalle clinico extendido; por eso esta vista muestra el mensaje automatico recibido.
                    </p>
                  </div>

                  {isPending && (
                    <Button
                      size="sm"
                      className="gap-1.5 text-xs w-full"
                      disabled={markingId === selectedAlert.id_alerta_sistema}
                      onClick={() => void markReviewed(selectedAlert.id_alerta_sistema)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Marcar como revisada
                    </Button>
                  )}
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
};

export default Alertas;
