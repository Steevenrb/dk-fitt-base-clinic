import { AlertTriangle, Scale, Flame, Clock } from "lucide-react";

interface Alert {
  type: "incumplimiento" | "exceso_calorico" | "cambio_peso";
  patient: string;
  date: string;
  description: string;
  urgent: boolean;
}

const alerts: Alert[] = [
  { type: "incumplimiento", patient: "Diego Martínez V.", date: "22 Mar", description: "Sin registro de alimentos por 11 días", urgent: true },
  { type: "exceso_calorico", patient: "Paola Fernández R.", date: "21 Mar", description: "Exceso de 680 kcal sobre plan diario", urgent: true },
  { type: "cambio_peso", patient: "Jorge E. Salinas", date: "20 Mar", description: "Aumento de 2.1 kg en última semana", urgent: true },
  { type: "incumplimiento", patient: "Carlos Ramírez T.", date: "19 Mar", description: "Solo 2 de 5 comidas registradas ayer", urgent: false },
  { type: "exceso_calorico", patient: "Roberto Díaz H.", date: "18 Mar", description: "Exceso de 420 kcal por 3 días consecutivos", urgent: false },
];

const iconMap = {
  incumplimiento: Clock,
  exceso_calorico: Flame,
  cambio_peso: Scale,
};

const typeLabel = {
  incumplimiento: "Incumplimiento",
  exceso_calorico: "Exceso calórico",
  cambio_peso: "Cambio de peso",
};

export function AlertsPanel() {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Alertas Recientes</h3>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{alerts.length} alertas activas</p>
      </div>
      <div className="divide-y divide-border">
        {alerts.map((alert, i) => {
          const Icon = iconMap[alert.type];
          return (
            <div
              key={i}
              className={`flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-muted/30 ${
                alert.urgent ? "border-l-2 border-l-accent" : ""
              }`}
            >
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                alert.urgent ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
              }`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground">{alert.patient}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{alert.date}</span>
                </div>
                <p className={`text-[11px] font-medium ${alert.urgent ? "text-accent" : "text-muted-foreground"}`}>
                  {typeLabel[alert.type]}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{alert.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
