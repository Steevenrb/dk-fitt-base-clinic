import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarPlus, Clock, CheckCircle, XCircle, RotateCcw, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ACCESS_TOKEN_KEY = "dkfitt-access-token";

type AppointmentStatus = "programada" | "atendida" | "cancelada" | "reprogramada";

type Appointment = {
  id: number;
  fecha_hora: string;
  estado: AppointmentStatus;
  notas?: string;
};

type AppointmentStats = {
  total?: number;
  atendidas?: number;
  canceladas?: number;
  reprogramadas?: number;
  pct_asistencia?: number;
  clasificacion?: string;
  mensaje?: string;
};

type AppointmentsPatientResponse = {
  success?: boolean;
  data?: {
    estadisticas?: AppointmentStats;
    historial?: Appointment[];
  };
};

type TabCitasProps = {
  patientId: number;
  profileId?: number | null;
};

const statusConfig: Record<AppointmentStatus, { label: string; className: string; icon: typeof Clock }> = {
  programada: { label: "Programada", className: "bg-primary/15 text-primary border-primary/30", icon: Clock },
  atendida: { label: "Atendida", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
  cancelada: { label: "Cancelada", className: "bg-accent/20 text-accent border-accent/30", icon: XCircle },
  reprogramada: { label: "Reprogramada", className: "bg-violet-500/15 text-violet-400 border-violet-500/30", icon: RotateCcw },
};

function formatDateParts(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { day: "--", rest: "---", time: "--:--" };
  return {
    day: date.toLocaleDateString("es-EC", { day: "2-digit" }),
    rest: date.toLocaleDateString("es-EC", { month: "short", year: "numeric" }),
    time: date.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" }),
  };
}

function normalizeStatus(value: unknown): AppointmentStatus {
  const raw = String(value ?? "programada").toLowerCase();
  if (raw === "atendida" || raw === "cancelada" || raw === "reprogramada") return raw;
  return "programada";
}

function mapAppointment(item: Record<string, unknown>): Appointment {
  return {
    id: Number(item.id_cita ?? item.id ?? item.appointment_id ?? 0),
    fecha_hora: String(item.fecha_hora ?? item.fechaHora ?? item.datetime ?? item.fecha ?? ""),
    estado: normalizeStatus(item.estado ?? item.status),
    notas: String(item.notas ?? item.notes ?? ""),
  };
}

function extractPayload(raw: unknown): { stats: AppointmentStats; history: Appointment[] } {
  const root = raw as AppointmentsPatientResponse;
  const data = root?.data ?? {};
  const historyRaw = Array.isArray(data.historial) ? data.historial : [];
  return {
    stats: data.estadisticas ?? {},
    history: historyRaw.map((item) => mapAppointment(item as unknown as Record<string, unknown>)).filter((item) => item.id),
  };
}

export function TabCitas({ patientId, profileId }: TabCitasProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<AppointmentStats>({});
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      const resolvedId = profileId ?? patientId;
      if (!resolvedId) {
        setLoading(false);
        return;
      }

      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) {
        setLoading(false);
        toast({ title: "Sesion no valida", description: "No se encontro token de acceso.", variant: "destructive" });
        return;
      }

      setLoading(true);
      try {
        const response = await apiRequest<unknown>(`/appointments/patient/${resolvedId}`, {
          method: "GET",
          accessToken: token,
        });
        const payload = extractPayload(response);
        setStats(payload.stats);
        setAppointments(payload.history);
      } catch {
        setStats({});
        setAppointments([]);
        toast({
          title: "No se pudo cargar citas",
          description: "Verifica endpoint GET /appointments/patient/{id}.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void fetchAppointments();
  }, [patientId, profileId, toast]);

  const sortedAppointments = useMemo(
    () => [...appointments].sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime()),
    [appointments],
  );

  const scheduled = appointments.filter((item) => item.estado === "programada" || item.estado === "reprogramada").length;
  const total = stats.total ?? appointments.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="rounded-xl border border-border bg-card p-5 flex-1">
          <h3 className="text-sm font-semibold text-foreground">Historial de Citas</h3>
          <p className="text-xs text-muted-foreground">
            {loading ? "Cargando citas..." : `${total} citas registradas · ${scheduled} proximas`}
          </p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs shrink-0" onClick={() => navigate("/citas")}>
          <CalendarPlus className="h-3.5 w-3.5" /> Agendar cita
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total", value: total, icon: CalendarDays },
          { label: "Atendidas", value: stats.atendidas ?? appointments.filter((a) => a.estado === "atendida").length, icon: CheckCircle },
          { label: "Canceladas", value: stats.canceladas ?? appointments.filter((a) => a.estado === "cancelada").length, icon: XCircle },
          { label: "Asistencia", value: `${stats.pct_asistencia ?? 0}%`, icon: Clock },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2">
              <item.icon className="h-4 w-4 text-primary" />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</p>
            </div>
            <p className="text-xl font-bold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      {stats.mensaje && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumen</p>
          <p className="mt-1 text-sm text-foreground">{stats.mensaje}</p>
          {stats.clasificacion && (
            <Badge variant="outline" className="mt-3 bg-primary/15 text-primary border-primary/30 text-[11px]">
              {stats.clasificacion}
            </Badge>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {loading && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">Cargando citas...</div>
        )}

        {!loading && sortedAppointments.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">No hay citas registradas para este paciente.</div>
        )}

        {!loading && sortedAppointments.map((appointment) => {
          const cfg = statusConfig[appointment.estado] ?? statusConfig.programada;
          const Icon = cfg.icon;
          const date = formatDateParts(appointment.fecha_hora);
          return (
            <div key={appointment.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
              <div className="flex flex-col items-center shrink-0 w-14 text-center">
                <p className="text-xs font-bold text-foreground">{date.day}</p>
                <p className="text-[11px] text-muted-foreground">{date.rest}</p>
                <p className="text-[11px] text-primary font-medium mt-1">{date.time}</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-foreground">Consulta nutricional</p>
                  <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>
                    <Icon className="h-3 w-3 mr-1" />{cfg.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{appointment.notas || "Sin notas"}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
