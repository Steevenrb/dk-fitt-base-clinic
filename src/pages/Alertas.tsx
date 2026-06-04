import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  ChevronLeft,
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
  adherencia: { label: "Adherencia", icon: Activity, className: "bg-[#C5EB6F]/25 text-[#3F5512] border-[#C5EB6F]/60 dark:text-[#C5EB6F]" },
  peso: { label: "Peso", icon: Scale, className: "bg-[#A8D1E7]/25 text-[#376378] border-[#A8D1E7]/60 dark:text-[#A8D1E7]" },
  consumo_adicional: { label: "Consumo adicional", icon: UtensilsCrossed, className: "bg-[#F7CA5E]/25 text-[#8A6B1F] border-[#F7CA5E]/60 dark:text-[#F7CA5E]" },
  inactividad: { label: "Inactividad", icon: Timer, className: "bg-[#E6E6E6]/25 text-[#5F5F5F] border-[#D2D2D2] dark:text-[#E6E6E6]" },
  exceso_calorico: { label: "Exceso calórico", icon: Flame, className: "bg-[#FA9C5C]/20 text-[#A95F2F] border-[#FA9C5C]/55 dark:text-[#FA9C5C]" },
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

function formatDateOnly(value?: string): string {
  if (!value) return "---";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "---";
  return date.toLocaleDateString("es-EC", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function extractPercent(value: string): number | null {
  const match = value.match(/(\d{1,3})\s*%/);
  if (!match) return null;
  return Math.max(0, Math.min(100, Number(match[1])));
}

function alertSummary(alert: ApiAlert): { title: string; description: string } {
  const summaries: Record<AlertType, { title: string; description: string }> = {
    adherencia: {
      title: "Baja Adherencia",
      description: "Se ha detectado que el paciente no completó el plan nutricional del día, situando su adherencia por debajo del objetivo.",
    },
    peso: {
      title: "Variación de Peso",
      description: "El registro de peso más reciente muestra una fluctuación inusual que sale de la curva de progreso esperada.",
    },
    consumo_adicional: {
      title: "Consumo Adicional",
      description: "El paciente reportó alimentos no contemplados en el plan original, lo que podría alterar el balance de macronutrientes.",
    },
    inactividad: {
      title: "Inactividad Prolongada",
      description: "No se ha detectado registro de actividad física o cumplimiento de la rutina de ejercicios recientemente.",
    },
    exceso_calorico: {
      title: "Exceso Calórico",
      description: "La ingesta total registrada hoy ha superado el límite de calorías y el margen establecido para este paciente.",
    },
  };
  return summaries[alert.tipo] ?? { title: "Alerta clínica", description: alert.mensaje };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function normalizeName(value?: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function unwrapAlerts(raw: unknown): AlertsResponse {
  if (!raw || typeof raw !== "object") return { data: [], meta: {} };
  return raw as AlertsResponse;
}

const Alertas = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const initialPatient = searchParams.get("paciente") || "all";
  const [alerts, setAlerts] = useState<ApiAlert[]>([]);
  const [meta, setMeta] = useState<AlertsMeta>({});
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<"all" | AlertType>("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [filterPatient, setFilterPatient] = useState<string>(initialPatient);
  const [selectedAlert, setSelectedAlert] = useState<ApiAlert | null>(null);
  const [page, setPage] = useState(1);

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

  useEffect(() => {
    const patient = searchParams.get("paciente");
    if (patient) setFilterPatient(patient);
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [filterType, filterStatus, filterPatient]);

  const patients = useMemo(() => [...new Set(alerts.map((alert) => alert.nombre_paciente).filter(Boolean))], [alerts]);

  const filtered = useMemo(() => {
    let list = [...alerts];
    if (filterPatient !== "all") {
      const patientKey = normalizeName(filterPatient);
      list = list.filter((alert) => normalizeName(alert.nombre_paciente) === patientKey);
    }
    list.sort((a, b) => {
      return new Date(b.fecha_generacion).getTime() - new Date(a.fecha_generacion).getTime();
    });
    return list;
  }, [alerts, filterPatient]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedAlerts = filtered.slice((page - 1) * pageSize, page * pageSize);
  const total = meta.total ?? alerts.length;
  const pendingCount = meta.sin_revisar ?? alerts.filter((alert) => !alert.revisada).length;
  const reviewedCount = Math.max(total - pendingCount, 0);
  const reviewedPct = total > 0 ? Math.round((reviewedCount / total) * 100) : 0;
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
              {filterPatient !== "all" && !patients.some((patient) => normalizeName(patient) === normalizeName(filterPatient)) && (
                <SelectItem value={filterPatient}>{filterPatient}</SelectItem>
              )}
              {patients.map((patient) => (
                <SelectItem key={patient} value={patient}>{patient}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Alertas sin revisar", value: pendingCount, icon: Bell, color: "bg-[#FA9C5C]", shadow: "shadow-[#FA9C5C]/20" },
            { label: "Alta atención", value: highAttentionCount, icon: AlertTriangle, color: "bg-[#F7CA5E]", shadow: "shadow-[#F7CA5E]/20" },
            { label: "Pacientes con alertas", value: patientsWithAlerts, icon: Users, color: "bg-[#A8D1E7]", shadow: "shadow-[#A8D1E7]/20" },
            { label: "Revisadas / Total", value: `${reviewedCount} / ${total}`, icon: CheckCircle2, color: "bg-card", shadow: "shadow-[hsl(var(--soft-shadow)/0.08)]", reviewChart: true },
          ].map((kpi) => (
            <div key={kpi.label} className={`rounded-2xl border border-border ${kpi.color} p-4 shadow-lg ${kpi.shadow}`}>
              {kpi.reviewChart ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-foreground">Alertas revisadas</p>
                    <CheckCircle2 className="h-4 w-4 text-[#376378] dark:text-[#A8D1E7]" />
                  </div>
                  <div className="relative mx-auto mt-3 h-20 w-36">
                    <svg viewBox="0 0 120 70" className="h-full w-full">
                      <path d="M 15 60 A 45 45 0 0 1 105 60" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" strokeLinecap="round" />
                      <path d="M 15 60 A 45 45 0 0 1 105 60" fill="none" stroke="#A8D1E7" strokeWidth="12" strokeLinecap="round" pathLength={100} strokeDasharray={`${reviewedPct} 100`} />
                    </svg>
                    <div className="absolute inset-x-0 bottom-1 text-center">
                      <p className="text-xl font-bold text-foreground">{reviewedCount}/{total}</p>
                      <p className="text-[10px] text-muted-foreground">{reviewedPct}% revisadas</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <p className="text-xs font-semibold text-[#253027]/75">{kpi.label}</p>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-[#253027]">
                      <kpi.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-[#253027]">{kpi.value}</p>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {loading && (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              Cargando alertas...
            </div>
          )}

          {!loading && paginatedAlerts.map((alert) => {
            const tc = typeConfig[alert.tipo] ?? typeConfig.adherencia;
            const TypeIcon = tc.icon;
            const isPending = !alert.revisada;
            const isHighPending = isPending && (alert.tipo === "adherencia" || alert.tipo === "exceso_calorico");
            const summary = alertSummary(alert);

            return (
              <div
                key={alert.id_alerta_sistema}
                className={`rounded-xl border bg-card p-4 transition-all cursor-pointer hover:shadow-lg hover:shadow-[hsl(var(--soft-shadow)/0.08)] ${
                  isHighPending ? "border-[#FA9C5C]/45 bg-[#FA9C5C]/5" : "border-border"
                }`}
                onClick={() => setSelectedAlert(alert)}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isHighPending ? "bg-[#FA9C5C]/20 text-[#A95F2F] dark:text-[#FA9C5C]" : "bg-muted text-muted-foreground"
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
                        <Badge variant="outline" className="text-[10px] bg-[#A8D1E7]/25 text-[#376378] border-[#A8D1E7]/60 dark:text-[#A8D1E7]">
                          <CheckCircle2 className="h-3 w-3 mr-1" />Revisada
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-600 border-red-500/40 dark:text-red-300">Sin revisar</Badge>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <p className={`text-xs font-semibold ${isPending ? "text-foreground" : "text-muted-foreground"}`}>{summary.title}</p>
                      <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{summary.description}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{formatDateOnly(alert.fecha_generacion)}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-[11px] border-[#F7CA5E]/60 text-[#8A6B1F] hover:bg-[#F7CA5E]/20 dark:text-[#F7CA5E]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAlert(alert);
                      }}
                    >
                      Ver detalle <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
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

          {!loading && filtered.length > 0 && (
            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Mostrando {paginatedAlerts.length} de {filtered.length} alertas
              </p>
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Anterior
                </Button>
                <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={page >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Siguiente <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
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
            const adherencePercent = extractPercent(selectedAlert.mensaje);
            return (
              <>
                <SheetHeader className="space-y-3 pb-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${
                      isPending ? "bg-[#FA9C5C]/20 text-[#A95F2F] dark:text-[#FA9C5C]" : "bg-muted text-muted-foreground"
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
                      isPending ? "bg-red-500/15 text-red-600 border-red-500/40 dark:text-red-300" : "bg-[#A8D1E7]/25 text-[#376378] border-[#A8D1E7]/60 dark:text-[#A8D1E7]"
                    }`}>
                      {isPending ? "Sin revisar" : "Revisada"}
                    </Badge>
                  </div>
                </SheetHeader>

                <div className="space-y-5 pt-5">
                  <div className="rounded-2xl border border-border bg-background/55 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Mensaje</p>
                    <p className="text-sm text-foreground">{selectedAlert.mensaje}</p>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-4 shadow-lg shadow-[hsl(var(--soft-shadow)/0.08)]">
                    <p className="mb-3 text-sm font-semibold text-foreground">Información de la alerta</p>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2">
                        <span className="flex items-center gap-2 text-xs text-muted-foreground"><TypeIcon className="h-3.5 w-3.5" />Tipo</span>
                        <span className="text-xs font-semibold text-foreground">{tc.label}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2">
                        <span className="flex items-center gap-2 text-xs text-muted-foreground"><Bell className="h-3.5 w-3.5" />Estado</span>
                        <span className="text-xs font-semibold text-foreground">{isPending ? "Pendiente de revisión" : "Revisada"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2">
                        <span className="flex items-center gap-2 text-xs text-muted-foreground"><Timer className="h-3.5 w-3.5" />Fecha</span>
                        <span className="text-xs font-semibold text-foreground">{formatDate(selectedAlert.fecha_generacion)}</span>
                      </div>
                    </div>
                  </div>

                  {adherencePercent !== null && (
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-lg shadow-[hsl(var(--soft-shadow)/0.08)]">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 font-semibold text-foreground"><Activity className="h-3.5 w-3.5" />Adherencia detectada</span>
                        <span className="font-bold text-foreground">{adherencePercent}%</span>
                      </div>
                      <Progress value={adherencePercent} className="h-3" />
                      {adherencePercent === 0 && (
                        <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-300">
                          El paciente no siguió el plan en ese día.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="rounded-lg bg-muted/50 border border-border p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Nota</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Esta alerta corresponde a un evento automatico generado por el sistema.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#F7CA5E]/45 bg-[#F7CA5E]/15 p-4">
                    <p className="text-xs font-semibold text-[#8A6B1F] dark:text-[#F7CA5E]">
                      Considera revisar el plan del paciente, o agendar una cita.
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
