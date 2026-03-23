import { useState } from "react";
import { CalendarPlus, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type AppointmentStatus = "programada" | "atendida" | "cancelada";

interface Appointment {
  id: number;
  date: string;
  time: string;
  type: string;
  status: AppointmentStatus;
  notes: string;
}

const appointments: Appointment[] = [
  { id: 1, date: "28 Mar 2026", time: "10:00 AM", type: "Evaluación quincenal", status: "programada", notes: "Revisión de composición corporal y ajuste de plan" },
  { id: 2, date: "22 Mar 2026", time: "9:30 AM", type: "Seguimiento semanal", status: "atendida", notes: "Se revisó adherencia y se ajustaron porciones de cena" },
  { id: 3, date: "15 Mar 2026", time: "11:00 AM", type: "Evaluación quincenal", status: "atendida", notes: "Medición antropométrica, resultados positivos" },
  { id: 4, date: "08 Mar 2026", time: "10:00 AM", type: "Seguimiento semanal", status: "cancelada", notes: "Paciente reprogramó por motivos laborales" },
  { id: 5, date: "01 Mar 2026", time: "9:00 AM", type: "Evaluación quincenal", status: "atendida", notes: "Primera evaluación del mes, se establecieron metas" },
];

const statusConfig: Record<AppointmentStatus, { label: string; className: string; icon: typeof Clock }> = {
  programada: { label: "Programada", className: "bg-primary/15 text-primary border-primary/30", icon: Clock },
  atendida: { label: "Atendida", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
  cancelada: { label: "Cancelada", className: "bg-accent/20 text-accent border-accent/30", icon: XCircle },
};

export function TabCitas() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="rounded-xl border border-border bg-card p-5 flex-1">
          <h3 className="text-sm font-semibold text-foreground">Historial de Citas</h3>
          <p className="text-xs text-muted-foreground">{appointments.length} citas registradas · {appointments.filter((a) => a.status === "programada").length} próximas</p>
        </div>
        <Button size="sm" className="ml-4 gap-1.5 text-xs shrink-0">
          <CalendarPlus className="h-3.5 w-3.5" /> Agendar cita
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {appointments.map((a) => {
          const cfg = statusConfig[a.status];
          const Icon = cfg.icon;
          return (
            <div key={a.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/30 transition-colors">
              <div className="flex flex-col items-center shrink-0 w-14 text-center">
                <p className="text-xs font-bold text-foreground">{a.date.split(" ")[0]}</p>
                <p className="text-[11px] text-muted-foreground">{a.date.split(" ").slice(1).join(" ")}</p>
                <p className="text-[11px] text-primary font-medium mt-1">{a.time}</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-foreground">{a.type}</p>
                  <Badge variant="outline" className={`text-[10px] ${cfg.className}`}>
                    <Icon className="h-3 w-3 mr-1" />{cfg.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{a.notes}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
