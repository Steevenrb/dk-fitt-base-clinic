import { Activity, AlertTriangle, Flame, Scale, Timer, UtensilsCrossed } from "lucide-react";

export interface DashboardAlert {
  type: "adherencia" | "peso" | "consumo_adicional" | "inactividad" | "exceso_calorico";
  patient: string;
  date: string;
  description: string;
  urgent: boolean;
}

const defaultAlerts: DashboardAlert[] = [
  { type: "adherencia", patient: "Diego Martinez V.", date: "22 Mar", description: "Sin registro de alimentos por 11 dias", urgent: true },
  { type: "exceso_calorico", patient: "Paola Fernandez R.", date: "21 Mar", description: "Exceso de 680 kcal sobre plan diario", urgent: true },
  { type: "peso", patient: "Jorge E. Salinas", date: "20 Mar", description: "Aumento de 2.1 kg en ultima semana", urgent: true },
  { type: "adherencia", patient: "Carlos Ramirez T.", date: "19 Mar", description: "Solo 2 de 5 comidas registradas ayer", urgent: false },
  { type: "exceso_calorico", patient: "Roberto Diaz H.", date: "18 Mar", description: "Exceso de 420 kcal por 3 dias consecutivos", urgent: false },
];

const iconMap = {
  adherencia: Activity,
  peso: Scale,
  consumo_adicional: UtensilsCrossed,
  inactividad: Timer,
  exceso_calorico: Flame,
};

const typeLabel = {
  adherencia: "Adherencia",
  peso: "Peso",
  consumo_adicional: "Consumo adicional",
  inactividad: "Inactividad",
  exceso_calorico: "Exceso calorico",
};

export function AlertsPanel({ alerts = defaultAlerts, loading = false }: { alerts?: DashboardAlert[]; loading?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Alertas Recientes</h3>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{loading ? "Cargando alertas..." : `${alerts.length} alertas activas`}</p>
      </div>
      <div className="divide-y divide-border">
        {loading && (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">Cargando alertas...</div>
        )}

        {!loading && alerts.map((alert, i) => {
          const Icon = iconMap[alert.type];
          return (
            <div
              key={`${alert.patient}-${alert.date}-${i}`}
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

        {!loading && alerts.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">No hay alertas activas.</div>
        )}
      </div>
    </div>
  );
}
