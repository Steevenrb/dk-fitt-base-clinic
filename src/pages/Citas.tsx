import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  CalendarDays,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  Edit,
  ClipboardList,
  CalendarCheck,
  CalendarX,
  Timer,
  FileText,
} from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ACCESS_TOKEN_KEY = "dkfitt-access-token";
const PATIENTS_ENDPOINTS = ["/api/patients", "/patients", "/api/pacientes"];

type CitaStatus = "programada" | "atendida" | "cancelada" | "reprogramada";

type Cita = {
  id: number;
  patientId: number | null;
  patient: string;
  avatar: string;
  date: string;
  time: string;
  status: CitaStatus;
  hasEvaluation: boolean;
  notes: string;
};

type PatientOption = {
  id: number;
  name: string;
};

const statusConfig: Record<CitaStatus, { label: string; className: string; icon: React.ElementType }> = {
  programada: { label: "Programada", className: "bg-[#F7CA5E]/25 text-[#8A6B1F] border-[#F7CA5E]/60 dark:text-[#F7CA5E]", icon: CalendarDays },
  atendida: { label: "Atendida", className: "bg-[#C5EB6F]/25 text-[#3F5512] border-[#C5EB6F]/60 dark:text-[#C5EB6F]", icon: CheckCircle2 },
  cancelada: { label: "Cancelada", className: "bg-[#FA9C5C]/20 text-[#A95F2F] border-[#FA9C5C]/55 dark:text-[#FA9C5C]", icon: XCircle },
  reprogramada: { label: "Reprogramada", className: "bg-[#A8D1E7]/25 text-[#376378] border-[#A8D1E7]/60 dark:text-[#A8D1E7]", icon: Clock },
};

function isPendingStatus(status: CitaStatus) {
  return status === "programada" || status === "reprogramada";
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseAppointmentDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };
  return {
    date: formatLocalDate(date),
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  };
}

function toDateTimePayload(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0).toISOString();
}

function toLocalDateTime(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0);
}

function todayKey() {
  return formatLocalDate(new Date());
}

function isPastDate(date: string) {
  return date < todayKey();
}

function canMarkAsAttended(cita: Cita) {
  if (!cita.date || !cita.time) return false;
  return cita.date === todayKey() && Date.now() >= toLocalDateTime(cita.date, cita.time).getTime();
}

function toInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function extractList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  if (Array.isArray(root.data)) return root.data as Record<string, unknown>[];
  if (Array.isArray(root.items)) return root.items as Record<string, unknown>[];
  if (Array.isArray(root.results)) return root.results as Record<string, unknown>[];
  if (root.data && typeof root.data === "object") {
    const data = root.data as Record<string, unknown>;
    if (Array.isArray(data.items)) return data.items as Record<string, unknown>[];
    if (Array.isArray(data.results)) return data.results as Record<string, unknown>[];
    if (Array.isArray(data.citas)) return data.citas as Record<string, unknown>[];
    if (Array.isArray(data.appointments)) return data.appointments as Record<string, unknown>[];
  }
  return [];
}

async function requestPatients(token: string): Promise<PatientOption[]> {
  let lastError: unknown;
  for (const path of PATIENTS_ENDPOINTS) {
    try {
      const res = await apiRequest<unknown>(path, { method: "GET", accessToken: token });
      return extractList(res).map((item, index) => {
        const nombres = String(item.nombres ?? item.nombre ?? "").trim();
        const apellidos = String(item.apellidos ?? "").trim();
        const name = `${nombres} ${apellidos}`.trim() || String(item.nombre_completo ?? item.name ?? "Paciente");
        const id = Number(item.id_perfil ?? item.perfil_id ?? item.profile_id ?? item.id_paciente ?? item.id_usuario ?? item.id ?? index + 1);
        return { id, name };
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function mapAppointment(item: Record<string, unknown>): Cita {
  const fechaHora = String(item.fecha_hora ?? item.fechaHora ?? item.datetime ?? item.fecha ?? "");
  const parsed = parseAppointmentDate(fechaHora);
  const patient =
    String(item.nombre_paciente ?? item.paciente_nombre ?? item.patient_name ?? "").trim()
    || String((item.paciente as Record<string, unknown> | undefined)?.nombre_completo ?? "").trim()
    || "Paciente";
  const status = String(item.estado ?? item.status ?? "programada").toLowerCase() as CitaStatus;

  return {
    id: Number(item.id_cita ?? item.id ?? item.appointment_id ?? 0),
    patientId: Number(item.id_paciente ?? item.id_perfil ?? item.paciente_id ?? 0) || null,
    patient,
    avatar: toInitials(patient),
    date: parsed.date,
    time: parsed.time,
    status: ["programada", "atendida", "cancelada", "reprogramada"].includes(status) ? status : "programada",
    hasEvaluation: Boolean(item.id_evaluacion ?? item.evaluacion_id ?? item.evaluacion),
    notes: String(item.notas ?? item.notes ?? ""),
  };
}

const Citas = () => {
  const { toast } = useToast();
  const [citas, setCitas] = useState<Cita[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showAttendDialog, setShowAttendDialog] = useState(false);
  const [attendingCita, setAttendingCita] = useState<Cita | null>(null);
  const [editingCita, setEditingCita] = useState<Cita | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | CitaStatus>("all");
  const [pendingPage, setPendingPage] = useState(1);
  const [closedPage, setClosedPage] = useState(1);

  const [formPatient, setFormPatient] = useState("");
  const [formDate, setFormDate] = useState(formatLocalDate(new Date()));
  const [formTime, setFormTime] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const resetForm = () => {
    setFormPatient("");
    const selectedKey = selectedDate ? formatLocalDate(selectedDate) : todayKey();
    setFormDate(isPastDate(selectedKey) ? todayKey() : selectedKey);
    setFormTime("");
    setFormNotes("");
    setEditingCita(null);
  };

  const fetchData = async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      setLoading(false);
      toast({ title: "Sesión no válida", description: "No se encontró token de acceso.", variant: "destructive" });
      return;
    }

    const params = new URLSearchParams({ page: "1", limit: "100" });
    if (filterStatus !== "all") params.set("estado", filterStatus);

    setLoading(true);
    try {
      const [appointmentsRes, patientsRes] = await Promise.all([
        apiRequest<unknown>(`/appointments?${params.toString()}`, { method: "GET", accessToken: token }),
        requestPatients(token).catch(() => []),
      ]);
      setCitas(extractList(appointmentsRes).map(mapAppointment).filter((item) => item.id));
      setPatients(patientsRes);
    } catch {
      setCitas([]);
      toast({
        title: "No se pudo cargar citas",
        description: "Verifica endpoint GET /appointments.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [filterStatus]);

  useEffect(() => {
    setPendingPage(1);
    setClosedPage(1);
  }, [filterStatus, citas.length]);

  const programadas = citas.filter((c) => c.status === "programada").length;
  const atendidas = citas.filter((c) => c.status === "atendida").length;
  const canceladas = citas.filter((c) => c.status === "cancelada").length;
  const pendientes = citas.filter((c) => c.status === "programada" || c.status === "reprogramada").length;

  const dayCitas = useMemo(() => {
    if (!selectedDate) return [];
    return citas
      .filter((c) => c.date && isSameDay(parseISO(c.date), selectedDate))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [citas, selectedDate]);

  const allSorted = useMemo(
    () => [...citas].sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time)),
    [citas]
  );
  const pendingHistory = useMemo(
    () => allSorted.filter((c) => c.status === "programada" || c.status === "reprogramada"),
    [allSorted]
  );
  const closedHistory = useMemo(
    () => allSorted.filter((c) => c.status === "atendida" || c.status === "cancelada"),
    [allSorted]
  );
  const historyPageSize = 10;
  const pendingTotalPages = Math.max(1, Math.ceil(pendingHistory.length / historyPageSize));
  const closedTotalPages = Math.max(1, Math.ceil(closedHistory.length / historyPageSize));
  const pendingPageItems = pendingHistory.slice((pendingPage - 1) * historyPageSize, pendingPage * historyPageSize);
  const closedPageItems = closedHistory.slice((closedPage - 1) * historyPageSize, closedPage * historyPageSize);

  const citaDates = useMemo(() => citas.filter((c) => c.date).map((c) => parseISO(c.date)), [citas]);

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (cita: Cita) => {
    if (cita.status === "atendida") {
      toast({
        title: "Cita atendida",
        description: "No se puede editar una cita que ya fue marcada como atendida.",
        variant: "destructive",
      });
      return;
    }

    setEditingCita(cita);
    setFormPatient(cita.patientId ? String(cita.patientId) : "");
    setFormDate(cita.date);
    setFormTime(cita.time);
    setFormNotes(cita.notes);
    setShowForm(true);
  };

  const handleSave = async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token || !formDate || !formTime) return;
    if (!editingCita && !formPatient) return;

    if (isPastDate(formDate)) {
      toast({
        title: "Fecha invalida",
        description: "No se pueden agendar citas en dias que ya pasaron.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const baseBody = {
        fecha_hora: toDateTimePayload(formDate, formTime),
        notas: formNotes,
      };

      if (editingCita) {
        const wasRescheduled = formDate !== editingCita.date || formTime !== editingCita.time;
        await apiRequest(`/appointments/${editingCita.id}`, {
          method: "PUT",
          accessToken: token,
          body: baseBody,
        });
        if (wasRescheduled && editingCita.status !== "reprogramada") {
          await apiRequest(`/appointments/${editingCita.id}/status`, {
            method: "PATCH",
            accessToken: token,
            body: { estado: "reprogramada" },
          });
        }
      } else {
        await apiRequest("/appointments", {
          method: "POST",
          accessToken: token,
          body: {
            ...baseBody,
            id_perfil: Number(formPatient),
          },
        });
      }

      setShowForm(false);
      resetForm();
      await fetchData();
      toast({ title: editingCita ? "Cita actualizada" : "Cita programada" });
    } catch {
      toast({
        title: editingCita ? "No se pudo actualizar cita" : "No se pudo agendar cita",
        description: editingCita ? "Verifica endpoint PUT /appointments/{id}." : "Verifica endpoint POST /appointments.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (id: number, estado: CitaStatus) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return;
    const cita = citas.find((item) => item.id === id) ?? attendingCita;

    if (estado === "atendida" && cita && !canMarkAsAttended(cita)) {
      toast({
        title: "Aun no se puede marcar como atendida",
        description: "Solo puedes marcarla como atendida el dia de la cita, cuando la hora programada ya haya llegado.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest(`/appointments/${id}/status`, {
        method: "PATCH",
        accessToken: token,
        body: { estado },
      });
      setCitas((prev) => prev.map((c) => (c.id === id ? { ...c, status: estado } : c)));
      toast({ title: "Estado actualizado" });
    } catch {
      toast({ title: "No se pudo cambiar estado", description: "Verifica endpoint PATCH /appointments/{id}/status.", variant: "destructive" });
    } finally {
      setSubmitting(false);
      setShowAttendDialog(false);
      setAttendingCita(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 min-w-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Gestión de Citas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Planificación y seguimiento de consultas nutricionales</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as "all" | CitaStatus)}>
              <SelectTrigger className="h-9 w-full text-xs bg-card border-border sm:w-[155px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="programada">Programada</SelectItem>
                <SelectItem value="atendida">Atendida</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
                <SelectItem value="reprogramada">Reprogramada</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="w-full gap-1.5 bg-[#F7CA5E] text-[#253027] hover:bg-[#F7CA5E]/90 text-xs sm:w-auto" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Agendar Cita
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Programadas", value: programadas, icon: CalendarCheck, color: "bg-[#FA9C5C]", shadow: "shadow-[#FA9C5C]/20" },
            { label: "Atendidas", value: atendidas, icon: CheckCircle2, color: "bg-[#C5EB6F]", shadow: "shadow-[#C5EB6F]/20" },
            { label: "Canceladas", value: canceladas, icon: CalendarX, color: "bg-[#F49C9C]", shadow: "shadow-[#F49C9C]/20" },
            { label: "Pendientes", value: pendientes, icon: Timer, color: "bg-[#A8D1E7]", shadow: "shadow-[#A8D1E7]/20" },
          ].map((kpi) => (
            <div key={kpi.label} className={`rounded-xl border border-border ${kpi.color} p-4 text-[#253027] shadow-lg ${kpi.shadow}`}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#253027]/70">{kpi.label}</p>
                <kpi.icon className="h-6 w-6 text-[#253027]" />
              </div>
              <p className="text-xl font-bold text-[#253027]">{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[auto_1fr]">
          <div className="overflow-x-auto rounded-xl border border-border bg-card p-2 sm:p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={es}
              className={cn("p-3 pointer-events-auto")}
              modifiers={{ hasCita: citaDates }}
              modifiersClassNames={{ hasCita: "bg-[#F7CA5E]/30 font-semibold text-[#8A6B1F] dark:text-[#F7CA5E]" }}
            />
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-lg shadow-[hsl(var(--soft-shadow)/0.08)]">
            <h3 className="mb-1 text-sm font-bold uppercase text-foreground">Citas Programadas para el Dia</h3>
            <p className="text-xs font-medium text-muted-foreground">
              {selectedDate ? format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es }) : "Selecciona un día"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {loading ? "Cargando citas..." : dayCitas.length === 0 ? "Sin citas para este día" : `${dayCitas.length} cita(s) programada(s)`}
            </p>
            <div className="space-y-3">
              {dayCitas.map((cita) => {
                const sc = statusConfig[cita.status];
                return (
                  <div key={cita.id} className="flex flex-col gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                      {cita.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{cita.patient}</p>
                        {cita.hasEvaluation && <FileText className="h-3.5 w-3.5 text-[#8A6B1F] dark:text-[#F7CA5E]" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{cita.time} · {cita.notes || "Sin notas"}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${sc.className}`}>{sc.label}</Badge>
                    {isPendingStatus(cita.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] h-7 gap-1 border-[#F7CA5E]/60 text-[#8A6B1F] hover:bg-[#F7CA5E]/20 dark:text-[#F7CA5E] shrink-0"
                        disabled={submitting}
                        onClick={() => { setAttendingCita(cita); setShowAttendDialog(true); }}
                      >
                        <CheckCircle2 className="h-3 w-3" /> Atender
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-lg shadow-[hsl(var(--soft-shadow)/0.08)]">
            <h3 className="text-sm font-semibold text-foreground mb-1">Citas programadas y reprogramadas</h3>
            <p className="text-xs text-muted-foreground mb-4">Consultas pendientes de gestion.</p>
            <div className="space-y-3">
              {loading && <div className="py-10 text-center text-sm text-muted-foreground">Cargando citas...</div>}
              {!loading && pendingPageItems.map((cita) => {
                const sc = statusConfig[cita.status];
                return (
                  <div key={cita.id} className="rounded-xl border border-border bg-background/55 p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7CA5E]/25 text-xs font-bold text-[#8A6B1F] dark:text-[#F7CA5E]">
                        {cita.avatar}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{cita.patient}</p>
                          {cita.hasEvaluation && <FileText className="h-3.5 w-3.5 text-[#8A6B1F] dark:text-[#F7CA5E]" />}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{cita.date ? format(parseISO(cita.date), "dd MMM yyyy", { locale: es }) : "---"}</span>
                          <span>{cita.time || "--:--"}</span>
                          <Badge variant="outline" className={`text-[10px] ${sc.className}`}>{sc.label}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openEdit(cita)}
                        disabled={submitting || cita.status === "atendida"}
                        title={cita.status === "atendida" ? "No se puede editar una cita atendida" : "Editar cita"}
                      >
                        <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={submitting}
                        onClick={() => { setAttendingCita(cita); setShowAttendDialog(true); }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#3F5512] dark:text-[#C5EB6F]" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={submitting} onClick={() => void changeStatus(cita.id, "cancelada")}>
                        <XCircle className="h-3.5 w-3.5 text-[#A95F2F] dark:text-[#FA9C5C]" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {!loading && pendingHistory.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">No hay citas pendientes.</div>
              )}
            </div>
            {!loading && pendingHistory.length > 0 && (
              <div className="mt-4 flex items-center justify-between gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" disabled={pendingPage <= 1} onClick={() => setPendingPage((prev) => Math.max(1, prev - 1))}>Anterior</Button>
                <span className="text-xs font-medium text-muted-foreground">{pendingPage} / {pendingTotalPages}</span>
                <Button variant="outline" size="sm" className="h-8 text-xs" disabled={pendingPage >= pendingTotalPages} onClick={() => setPendingPage((prev) => Math.min(pendingTotalPages, prev + 1))}>Siguiente</Button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-lg shadow-[hsl(var(--soft-shadow)/0.08)]">
            <h3 className="text-sm font-semibold text-foreground mb-1">Citas atendidas y canceladas</h3>
            <p className="text-xs text-muted-foreground mb-4">Historial cerrado de consultas.</p>
            <div className="space-y-3">
              {loading && <div className="py-10 text-center text-sm text-muted-foreground">Cargando citas...</div>}
              {!loading && closedPageItems.map((cita) => {
                const sc = statusConfig[cita.status];
                return (
                  <div key={cita.id} className="rounded-xl border border-border bg-background/55 p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#A8D1E7]/25 text-xs font-bold text-[#376378] dark:text-[#A8D1E7]">
                        {cita.avatar}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{cita.patient}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{cita.date ? format(parseISO(cita.date), "dd MMM yyyy", { locale: es }) : "---"}</span>
                          <Badge variant="outline" className={`text-[10px] ${sc.className}`}>{sc.label}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!loading && closedHistory.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">No hay citas atendidas o canceladas.</div>
              )}
            </div>
            {!loading && closedHistory.length > 0 && (
              <div className="mt-4 flex items-center justify-between gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs" disabled={closedPage <= 1} onClick={() => setClosedPage((prev) => Math.max(1, prev - 1))}>Anterior</Button>
                <span className="text-xs font-medium text-muted-foreground">{closedPage} / {closedTotalPages}</span>
                <Button variant="outline" size="sm" className="h-8 text-xs" disabled={closedPage >= closedTotalPages} onClick={() => setClosedPage((prev) => Math.min(closedTotalPages, prev + 1))}>Siguiente</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingCita ? "Editar Cita" : "Agendar Cita"}</DialogTitle>
            <DialogDescription className="text-muted-foreground">Programa o actualiza una consulta nutricional</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Paciente</Label>
              <Select value={formPatient} onValueChange={setFormPatient} disabled={!!editingCita}>
                <SelectTrigger className="h-9 text-xs bg-background border-border">
                  <SelectValue placeholder="Seleccionar paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha</Label>
                <Input type="date" min={todayKey()} className="h-9 text-xs bg-background border-border" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hora</Label>
                <Input type="time" className="h-9 text-xs bg-background border-border" value={formTime} onChange={(e) => setFormTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observaciones</Label>
              <Textarea className="text-xs bg-background border-border resize-none" rows={3} placeholder="Notas adicionales..." value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowForm(false)} disabled={submitting}>Cancelar</Button>
            <Button size="sm" className="bg-[#F7CA5E] text-[#253027] hover:bg-[#F7CA5E]/90 text-xs" onClick={handleSave} disabled={submitting || !formDate || !formTime || (!editingCita && !formPatient)}>
              Guardar cita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAttendDialog} onOpenChange={setShowAttendDialog}>
        <DialogContent className="sm:max-w-sm border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Cambiar estado de la cita</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {attendingCita?.patient} - {attendingCita?.time}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">El vínculo con evaluación clínica se implementará cuando tengamos un selector de evaluación.</p>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs h-10 border-[#C5EB6F]/60 text-[#3F5512] hover:bg-[#C5EB6F]/20 dark:text-[#C5EB6F]"
                disabled={submitting || !attendingCita || !canMarkAsAttended(attendingCita)}
                title={attendingCita && canMarkAsAttended(attendingCita) ? "Marcar atendida" : "Disponible el dia y hora de la cita"}
                onClick={() => attendingCita && void changeStatus(attendingCita.id, "atendida")}
              >
                <ClipboardList className="h-4 w-4" /> Marcar atendida
              </Button>
              {attendingCita?.status !== "reprogramada" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 text-xs h-10 border-border"
                  disabled={submitting}
                  onClick={() => attendingCita && void changeStatus(attendingCita.id, "reprogramada")}
                >
                  <Clock className="h-4 w-4" /> Marcar reprogramada
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-xs h-10 text-[#A95F2F] hover:bg-[#FA9C5C]/15 dark:text-[#FA9C5C]"
                disabled={submitting}
                onClick={() => attendingCita && void changeStatus(attendingCita.id, "cancelada")}
              >
                <XCircle className="h-4 w-4" /> Cancelar cita
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Citas;
