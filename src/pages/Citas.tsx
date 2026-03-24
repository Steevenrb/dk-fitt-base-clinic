import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  Eye,
  Edit,
  ClipboardList,
  Users,
  CalendarCheck,
  CalendarX,
  Timer,
  FileText,
} from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

/* ───── types & data ───── */

type CitaStatus = "programada" | "atendida" | "cancelada" | "reprogramada";

interface Cita {
  id: number;
  patient: string;
  avatar: string;
  date: string; // ISO
  time: string;
  status: CitaStatus;
  hasEvaluation: boolean;
  notes: string;
}

const initialCitas: Cita[] = [
  { id: 1, patient: "María González", avatar: "MG", date: "2026-03-26", time: "09:00", status: "programada", hasEvaluation: false, notes: "Control mensual de peso y medidas" },
  { id: 2, patient: "Carlos Ruiz", avatar: "CR", date: "2026-03-26", time: "10:30", status: "programada", hasEvaluation: false, notes: "Revisión de plan nutricional" },
  { id: 3, patient: "Ana Martínez", avatar: "AM", date: "2026-03-27", time: "11:00", status: "programada", hasEvaluation: false, notes: "Evaluación inicial — primera consulta" },
  { id: 4, patient: "Roberto Sánchez", avatar: "RS", date: "2026-03-28", time: "09:30", status: "programada", hasEvaluation: false, notes: "Seguimiento de adherencia al plan" },
  { id: 5, patient: "Laura Díaz", avatar: "LD", date: "2026-03-24", time: "10:00", status: "atendida", hasEvaluation: true, notes: "Control quincenal — se registró evaluación clínica" },
  { id: 6, patient: "María González", avatar: "MG", date: "2026-03-21", time: "09:00", status: "atendida", hasEvaluation: true, notes: "Ajuste de plan nutricional por baja adherencia" },
  { id: 7, patient: "Carlos Ruiz", avatar: "CR", date: "2026-03-20", time: "14:00", status: "cancelada", hasEvaluation: false, notes: "Paciente no pudo asistir — reprogramar" },
  { id: 8, patient: "Ana Martínez", avatar: "AM", date: "2026-03-19", time: "11:00", status: "reprogramada", hasEvaluation: false, notes: "Movida al 27 de marzo por conflicto de horario" },
  { id: 9, patient: "Roberto Sánchez", avatar: "RS", date: "2026-03-17", time: "09:30", status: "atendida", hasEvaluation: false, notes: "Revisión de resultados de laboratorio" },
  { id: 10, patient: "Laura Díaz", avatar: "LD", date: "2026-03-14", time: "10:00", status: "atendida", hasEvaluation: true, notes: "Evaluación de composición corporal" },
];

const statusConfig: Record<CitaStatus, { label: string; className: string; icon: React.ElementType }> = {
  programada: { label: "Programada", className: "bg-primary/15 text-primary border-primary/30", icon: CalendarDays },
  atendida: { label: "Atendida", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  cancelada: { label: "Cancelada", className: "bg-accent/20 text-accent border-accent/30", icon: XCircle },
  reprogramada: { label: "Reprogramada", className: "bg-violet-500/15 text-violet-400 border-violet-500/30", icon: Clock },
};

const patients = ["María González", "Carlos Ruiz", "Ana Martínez", "Roberto Sánchez", "Laura Díaz"];

/* ───── component ───── */

const Citas = () => {
  const navigate = useNavigate();
  const [citas, setCitas] = useState(initialCitas);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date(2026, 2, 26));
  const [showForm, setShowForm] = useState(false);
  const [showAttendDialog, setShowAttendDialog] = useState(false);
  const [attendingCita, setAttendingCita] = useState<Cita | null>(null);

  // Form state
  const [formPatient, setFormPatient] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // KPIs
  const programadas = citas.filter((c) => c.status === "programada").length;
  const atendidas = citas.filter((c) => c.status === "atendida").length;
  const canceladas = citas.filter((c) => c.status === "cancelada").length;
  const pendientes = citas.filter((c) => c.status === "programada" || c.status === "reprogramada").length;

  // Citas for selected day
  const dayCitas = useMemo(() => {
    if (!selectedDate) return [];
    return citas
      .filter((c) => isSameDay(parseISO(c.date), selectedDate))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [citas, selectedDate]);

  // All citas sorted
  const allSorted = useMemo(
    () => [...citas].sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time)),
    [citas]
  );

  // Dates that have citas (for calendar modifiers)
  const citaDates = useMemo(() => citas.map((c) => parseISO(c.date)), [citas]);

  const handleSave = () => {
    if (!formPatient || !formDate || !formTime) return;
    const avatar = formPatient.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    setCitas((prev) => [
      ...prev,
      {
        id: Math.max(...prev.map((c) => c.id)) + 1,
        patient: formPatient,
        avatar,
        date: formDate,
        time: formTime,
        status: "programada",
        hasEvaluation: false,
        notes: formNotes,
      },
    ]);
    setShowForm(false);
    setFormPatient("");
    setFormDate("");
    setFormTime("");
    setFormNotes("");
  };

  const markAttended = (id: number, withEval: boolean) => {
    setCitas((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "atendida" as CitaStatus, hasEvaluation: withEval || c.hasEvaluation } : c))
    );
    setShowAttendDialog(false);
    setAttendingCita(null);
  };

  const cancelCita = (id: number) => {
    setCitas((prev) => prev.map((c) => (c.id === id ? { ...c, status: "cancelada" as CitaStatus } : c)));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Gestión de Citas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Planificación y seguimiento de consultas nutricionales</p>
          </div>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" /> Agendar Cita
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Programadas", value: programadas, icon: CalendarCheck, accent: false },
            { label: "Atendidas", value: atendidas, icon: CheckCircle2, accent: false },
            { label: "Canceladas", value: canceladas, icon: CalendarX, accent: canceladas > 0 },
            { label: "Pendientes", value: pendientes, icon: Timer, accent: false },
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

        {/* Calendar + Day list */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
          {/* Calendar */}
          <div className="rounded-xl border border-border bg-card p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={es}
              className={cn("p-3 pointer-events-auto")}
              modifiers={{ hasCita: citaDates }}
              modifiersClassNames={{ hasCita: "bg-primary/20 font-semibold text-primary" }}
            />
          </div>

          {/* Day citas */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {selectedDate ? format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es }) : "Selecciona un día"}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {dayCitas.length === 0 ? "Sin citas para este día" : `${dayCitas.length} cita(s) programada(s)`}
            </p>
            <div className="space-y-3">
              {dayCitas.map((cita) => {
                const sc = statusConfig[cita.status];
                return (
                  <div key={cita.id} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                      {cita.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{cita.patient}</p>
                        {cita.hasEvaluation && <FileText className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{cita.time} · {cita.notes}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${sc.className}`}>{sc.label}</Badge>
                    {cita.status === "programada" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] h-7 gap-1 border-primary/30 text-primary hover:bg-primary/10 shrink-0"
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

        {/* Full table */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">Historial de Citas</h3>
          <p className="text-xs text-muted-foreground mb-4">Todas las consultas registradas en el sistema</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 text-xs font-medium text-muted-foreground">Paciente</th>
                  <th className="pb-3 text-xs font-medium text-muted-foreground">Fecha</th>
                  <th className="pb-3 text-xs font-medium text-muted-foreground">Hora</th>
                  <th className="pb-3 text-xs font-medium text-muted-foreground">Estado</th>
                  <th className="pb-3 text-xs font-medium text-muted-foreground text-center">Eval.</th>
                  <th className="pb-3 text-xs font-medium text-muted-foreground text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {allSorted.map((cita) => {
                  const sc = statusConfig[cita.status];
                  return (
                    <tr key={cita.id} className="border-b border-border last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                            {cita.avatar}
                          </div>
                          <span className="text-xs font-medium text-foreground">{cita.patient}</span>
                        </div>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {format(parseISO(cita.date), "dd MMM yyyy", { locale: es })}
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">{cita.time}</td>
                      <td className="py-3">
                        <Badge variant="outline" className={`text-[10px] ${sc.className}`}>{sc.label}</Badge>
                      </td>
                      <td className="py-3 text-center">
                        {cita.hasEvaluation && <FileText className="h-3.5 w-3.5 text-primary mx-auto" />}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigate("/pacientes/1")}>
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          {cita.status === "programada" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => { setAttendingCita(cita); setShowAttendDialog(true); }}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => cancelCita(cita.id)}>
                                <XCircle className="h-3.5 w-3.5 text-accent" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Agendar Cita Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Agendar Cita</DialogTitle>
            <DialogDescription className="text-muted-foreground">Programa una nueva consulta nutricional</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Paciente</Label>
              <Select value={formPatient} onValueChange={setFormPatient}>
                <SelectTrigger className="h-9 text-xs bg-background border-border">
                  <SelectValue placeholder="Seleccionar paciente" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha</Label>
                <Input type="date" className="h-9 text-xs bg-background border-border" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
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
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" className="text-xs" onClick={handleSave}>Guardar cita</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Attended Dialog */}
      <Dialog open={showAttendDialog} onOpenChange={setShowAttendDialog}>
        <DialogContent className="sm:max-w-sm border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">Marcar como Atendida</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {attendingCita?.patient} — {attendingCita?.time}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">¿Desea registrar una evaluación clínica asociada a esta consulta?</p>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs h-10 border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => attendingCita && markAttended(attendingCita.id, true)}
              >
                <ClipboardList className="h-4 w-4" /> Registrar evaluación clínica
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs h-10 border-border"
                onClick={() => attendingCita && markAttended(attendingCita.id, true)}
              >
                <FileText className="h-4 w-4" /> Vincular evaluación existente
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-xs h-10 text-muted-foreground"
                onClick={() => attendingCita && markAttended(attendingCita.id, false)}
              >
                <CheckCircle2 className="h-4 w-4" /> Solo marcar atendida
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Citas;
