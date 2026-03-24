import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  Eye,
  ChevronRight,
  TrendingUp,
  UtensilsCrossed,
  Activity,
  Timer,
  Scale,
} from "lucide-react";

/* ───── types & data ───── */

type AlertType = "adherencia" | "peso" | "consumo" | "inactividad";
type Priority = "alta" | "media" | "baja";
type Status = "pendiente" | "atendida";

interface Alert {
  id: number;
  patient: string;
  avatar: string;
  type: AlertType;
  description: string;
  detail: string;
  context: string;
  date: string;
  priority: Priority;
  status: Status;
}

const alertsData: Alert[] = [
  {
    id: 1,
    patient: "María González",
    avatar: "MG",
    type: "adherencia",
    description: "Baja adherencia al plan — 3 días consecutivos",
    detail: "La paciente ha incumplido más del 60% de las comidas planificadas los días 20, 21 y 22 de marzo. Se observan omisiones recurrentes en media mañana y merienda.",
    context: "Adherencia semanal actual: 42%. Promedio histórico: 78%. Descenso significativo respecto a la semana anterior (71%).",
    date: "22 Mar 2026 · 08:00",
    priority: "alta",
    status: "pendiente",
  },
  {
    id: 2,
    patient: "María González",
    avatar: "MG",
    type: "consumo",
    description: "Consumo adicional elevado — +800 kcal acumuladas",
    detail: "Se registraron 4 consumos adicionales en los últimos 3 días: pan dulce (320 kcal), helado artesanal (250 kcal), tacos al pastor (420 kcal) y café latte (190 kcal). Total adicional: 1,180 kcal.",
    context: "El exceso calórico promedio diario ha sido de 295 kcal, superando el umbral recomendado de 150 kcal diarios.",
    date: "22 Mar 2026 · 07:30",
    priority: "alta",
    status: "pendiente",
  },
  {
    id: 3,
    patient: "Carlos Ruiz",
    avatar: "CR",
    type: "peso",
    description: "Aumento de peso inesperado +1.5kg en 5 días",
    detail: "El paciente registró un peso de 89.2 kg el día 22 de marzo, frente a 87.7 kg registrado el 17 de marzo. Este incremento no está alineado con el objetivo de pérdida gradual.",
    context: "Objetivo: 85 kg. Tendencia de las últimas 4 semanas mostraba descenso constante de -0.3 kg/semana. Este pico rompe la tendencia.",
    date: "21 Mar 2026 · 14:20",
    priority: "media",
    status: "pendiente",
  },
  {
    id: 4,
    patient: "Ana Martínez",
    avatar: "AM",
    type: "inactividad",
    description: "Sin registro de peso en 4 días",
    detail: "La paciente no ha reportado su peso diario desde el 18 de marzo. Los últimos registros muestran una tendencia estable en 68.4 kg.",
    context: "El registro de peso es fundamental para el seguimiento del plan de mantenimiento. La paciente tiene historial de abandono de registros antes de suspender tratamiento.",
    date: "21 Mar 2026 · 09:00",
    priority: "media",
    status: "pendiente",
  },
  {
    id: 5,
    patient: "Roberto Sánchez",
    avatar: "RS",
    type: "adherencia",
    description: "Incumplimiento de rutina de ejercicio — 5 días",
    detail: "El paciente no ha completado ninguna sesión de ejercicio desde el 17 de marzo. Su plan incluye caminata de 30 min (L-M-V) y natación 45 min (M-J).",
    context: "El ejercicio representa el 30% del plan de tratamiento. La inactividad prolongada puede afectar los resultados metabólicos esperados.",
    date: "20 Mar 2026 · 11:00",
    priority: "media",
    status: "pendiente",
  },
  {
    id: 6,
    patient: "Laura Díaz",
    avatar: "LD",
    type: "inactividad",
    description: "Inactividad física registrada — sin ejercicio esta semana",
    detail: "La paciente reportó no haber realizado actividad física durante toda la semana del 15 al 21 de marzo. Menciona dolor lumbar como motivo.",
    context: "Se recomienda evaluar si el plan de ejercicios necesita adaptación. Considerar ejercicios de bajo impacto o derivación a fisioterapia.",
    date: "19 Mar 2026 · 16:30",
    priority: "baja",
    status: "pendiente",
  },
  {
    id: 7,
    patient: "Carlos Ruiz",
    avatar: "CR",
    type: "consumo",
    description: "Consumo de alcohol reportado — evento social",
    detail: "El paciente registró consumo de 3 cervezas y nachos en un evento social el sábado 15 de marzo. Estimación: 720 kcal adicionales.",
    context: "El plan del paciente restringe el consumo de alcohol a máximo 1 unidad semanal. Este es el segundo evento reportado en el mes.",
    date: "16 Mar 2026 · 08:00",
    priority: "media",
    status: "atendida",
  },
  {
    id: 8,
    patient: "Ana Martínez",
    avatar: "AM",
    type: "adherencia",
    description: "Adherencia recuperada — 5 días consecutivos al 90%",
    detail: "La paciente ha cumplido con el 90% o más del plan nutricional y de ejercicios durante los últimos 5 días laborales. Solo omitió una merienda.",
    context: "Tras la intervención de la semana anterior, la adherencia se ha normalizado. Considerar mantener el refuerzo positivo en la próxima cita.",
    date: "14 Mar 2026 · 07:00",
    priority: "baja",
    status: "atendida",
  },
];

const typeConfig: Record<AlertType, { label: string; icon: React.ElementType; className: string }> = {
  adherencia: { label: "Adherencia", icon: Activity, className: "bg-primary/15 text-primary border-primary/30" },
  peso: { label: "Peso", icon: Scale, className: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
  consumo: { label: "Consumo", icon: UtensilsCrossed, className: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  inactividad: { label: "Inactividad", icon: Timer, className: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
};

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  alta: { label: "Alta", className: "bg-accent/20 text-accent border-accent/30" },
  media: { label: "Media", className: "bg-primary/15 text-primary border-primary/30" },
  baja: { label: "Baja", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
};

/* ───── component ───── */

const Alertas = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState(alertsData);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPatient, setFilterPatient] = useState<string>("all");
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const patients = useMemo(() => [...new Set(alerts.map((a) => a.patient))], [alerts]);

  const filtered = useMemo(() => {
    let list = [...alerts];
    if (filterType !== "all") list = list.filter((a) => a.type === filterType);
    if (filterStatus !== "all") list = list.filter((a) => a.status === filterStatus);
    if (filterPatient !== "all") list = list.filter((a) => a.patient === filterPatient);
    // Sort: pendiente alta first
    list.sort((a, b) => {
      if (a.status !== b.status) return a.status === "pendiente" ? -1 : 1;
      const pOrder: Record<Priority, number> = { alta: 0, media: 1, baja: 2 };
      return pOrder[a.priority] - pOrder[b.priority];
    });
    return list;
  }, [alerts, filterType, filterStatus, filterPatient]);

  const totalActive = alerts.filter((a) => a.status === "pendiente").length;
  const criticalCount = alerts.filter((a) => a.priority === "alta" && a.status === "pendiente").length;
  const patientsWithAlerts = new Set(alerts.filter((a) => a.status === "pendiente").map((a) => a.patient)).size;
  const attendedCount = alerts.filter((a) => a.status === "atendida").length;

  const markAttended = (id: number) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "atendida" as Status } : a)));
    if (selectedAlert?.id === id) setSelectedAlert((prev) => prev ? { ...prev, status: "atendida" } : null);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Gestión de Alertas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Eventos relevantes detectados en el seguimiento de pacientes</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[170px] h-9 text-xs bg-card border-border">
              <SelectValue placeholder="Tipo de alerta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="adherencia">Adherencia</SelectItem>
              <SelectItem value="peso">Peso</SelectItem>
              <SelectItem value="consumo">Consumo adicional</SelectItem>
              <SelectItem value="inactividad">Inactividad</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px] h-9 text-xs bg-card border-border">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="atendida">Atendida</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPatient} onValueChange={setFilterPatient}>
            <SelectTrigger className="w-[180px] h-9 text-xs bg-card border-border">
              <SelectValue placeholder="Paciente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los pacientes</SelectItem>
              {patients.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Alertas activas", value: totalActive, icon: Bell, accent: totalActive > 4 },
            { label: "Alertas críticas", value: criticalCount, icon: AlertTriangle, accent: true },
            { label: "Pacientes con alertas", value: patientsWithAlerts, icon: Users, accent: false },
            { label: "Atendidas / Total", value: `${attendedCount} / ${alerts.length}`, icon: CheckCircle2, accent: false },
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

        {/* Alert List */}
        <div className="space-y-3">
          {filtered.map((alert) => {
            const tc = typeConfig[alert.type];
            const pc = priorityConfig[alert.priority];
            const isPending = alert.status === "pendiente";
            const isHighPending = isPending && alert.priority === "alta";

            return (
              <div
                key={alert.id}
                className={`rounded-xl border bg-card p-4 transition-all cursor-pointer hover:shadow-lg hover:shadow-primary/5 ${
                  isHighPending ? "border-accent/40 bg-accent/[0.03]" : "border-border"
                }`}
                onClick={() => setSelectedAlert(alert)}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isHighPending ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
                  }`}>
                    {alert.avatar}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{alert.patient}</p>
                      <Badge variant="outline" className={`text-[10px] ${tc.className}`}>
                        <tc.icon className="h-3 w-3 mr-1" />{tc.label}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] ${pc.className}`}>{pc.label}</Badge>
                      {!isPending && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" />Atendida
                        </Badge>
                      )}
                    </div>
                    <p className={`text-xs ${isPending ? "text-foreground" : "text-muted-foreground"}`}>{alert.description}</p>
                    <p className="text-[11px] text-muted-foreground">{alert.date}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isPending && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] h-7 gap-1 border-primary/30 text-primary hover:bg-primary/10"
                        onClick={(e) => { e.stopPropagation(); markAttended(alert.id); }}
                      >
                        <CheckCircle2 className="h-3 w-3" /> Atender
                      </Button>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No se encontraron alertas con los filtros seleccionados</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <SheetContent className="w-full sm:max-w-lg border-border bg-card overflow-y-auto">
          {selectedAlert && (() => {
            const tc = typeConfig[selectedAlert.type];
            const pc = priorityConfig[selectedAlert.priority];
            const isPending = selectedAlert.status === "pendiente";
            return (
              <>
                <SheetHeader className="space-y-3 pb-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${
                      isPending && selectedAlert.priority === "alta" ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
                    }`}>
                      {selectedAlert.avatar}
                    </div>
                    <div>
                      <SheetTitle className="text-foreground">{selectedAlert.patient}</SheetTitle>
                      <p className="text-xs text-muted-foreground">{selectedAlert.date}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] ${tc.className}`}>
                      <tc.icon className="h-3 w-3 mr-1" />{tc.label}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] ${pc.className}`}>Prioridad: {pc.label}</Badge>
                    <Badge variant="outline" className={`text-[10px] ${
                      isPending ? "bg-primary/15 text-primary border-primary/30" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    }`}>
                      {isPending ? "Pendiente" : "Atendida"}
                    </Badge>
                  </div>
                </SheetHeader>

                <div className="space-y-5 pt-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Descripción</p>
                    <p className="text-sm text-foreground">{selectedAlert.description}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Detalle del evento</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{selectedAlert.detail}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 border border-border p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Contexto clínico</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{selectedAlert.context}</p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {isPending && (
                      <Button
                        size="sm"
                        className="gap-1.5 text-xs flex-1"
                        onClick={() => markAttended(selectedAlert.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Marcar como atendida
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs flex-1"
                      onClick={() => navigate("/pacientes/1")}
                    >
                      <Eye className="h-3.5 w-3.5" /> Ver ficha del paciente
                    </Button>
                  </div>
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
