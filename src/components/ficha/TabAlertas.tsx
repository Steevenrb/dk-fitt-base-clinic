import { useState } from "react";
import { AlertTriangle, Clock, Flame, Scale, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type AlertType = "incumplimiento" | "exceso_calorico" | "cambio_peso";
type AlertStatus = "pendiente" | "atendida";

interface PatientAlert {
  id: number;
  type: AlertType;
  description: string;
  date: string;
  status: AlertStatus;
}

const initialAlerts: PatientAlert[] = [
  { id: 1, type: "incumplimiento", description: "No registró comidas por 3 días consecutivos (18-20 Mar)", date: "21 Mar 2026", status: "pendiente" },
  { id: 2, type: "exceso_calorico", description: "Exceso de 530 kcal sobre el plan el sábado 15 Mar", date: "16 Mar 2026", status: "pendiente" },
  { id: 3, type: "cambio_peso", description: "Aumento de 0.7 kg en la última evaluación quincenal", date: "08 Mar 2026", status: "atendida" },
  { id: 4, type: "incumplimiento", description: "Solo completó 2 de 5 comidas el jueves 6 Mar", date: "07 Mar 2026", status: "atendida" },
  { id: 5, type: "exceso_calorico", description: "Consumo de 2,400 kcal vs 1,750 kcal planificadas", date: "01 Mar 2026", status: "atendida" },
];

const typeConfig = {
  incumplimiento: { label: "Incumplimiento", icon: Clock },
  exceso_calorico: { label: "Exceso Calórico", icon: Flame },
  cambio_peso: { label: "Cambio de Peso", icon: Scale },
};

export function TabAlertas() {
  const [alerts, setAlerts] = useState(initialAlerts);

  const markDone = (id: number) =>
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "atendida" as AlertStatus } : a)));

  const pending = alerts.filter((a) => a.status === "pendiente").length;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-accent" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">Alertas de la Paciente</h3>
          <p className="text-xs text-muted-foreground">{pending} alertas pendientes de atención</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {alerts.map((a) => {
          const cfg = typeConfig[a.type];
          const Icon = cfg.icon;
          const isPending = a.status === "pendiente";
          return (
            <div key={a.id} className={`flex items-start gap-4 px-5 py-4 ${isPending ? "border-l-2 border-l-accent" : ""}`}>
              <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isPending ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-foreground">{cfg.label}</span>
                  <Badge variant="outline" className={`text-[10px] ${isPending ? "bg-accent/20 text-accent border-accent/30" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"}`}>
                    {isPending ? "Pendiente" : "Atendida"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{a.description}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{a.date}</p>
              </div>
              {isPending && (
                <Button variant="outline" size="sm" className="shrink-0 gap-1.5 text-xs" onClick={() => markDone(a.id)}>
                  <CheckCircle className="h-3.5 w-3.5" /> Marcar atendida
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
