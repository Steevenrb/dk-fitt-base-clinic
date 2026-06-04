import { Activity, AlertTriangle, Flame, Scale, Timer, UtensilsCrossed } from "lucide-react";

export interface DashboardAlert {
  type: "adherencia" | "peso" | "consumo_adicional" | "inactividad" | "exceso_calorico";
  patient: string;
  date: string;
  description: string;
  urgent: boolean;
}

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

export function AlertsPanel({ alerts = [], loading = false }: { alerts?: DashboardAlert[]; loading?: boolean }) {
  const urgentCount = alerts.filter((alert) => alert.urgent).length;

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[#FA9C5C]/70">
      <div className="border-b border-border/70 bg-card px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FA9C5C]/20 text-foreground ring-1 ring-[#FA9C5C]/40">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Alertas Recientes</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{loading ? "Cargando alertas..." : `${alerts.length} alertas activas`}</p>
          </div>
          <div className="rounded-full bg-[#FA9C5C]/20 px-3 py-1 text-xs font-semibold text-foreground ring-1 ring-[#FA9C5C]/40">
            {urgentCount} urgentes
          </div>
        </div>
      </div>
      <div className="divide-y divide-border/60">
        {loading && (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">Cargando alertas...</div>
        )}

        {!loading && alerts.map((alert, i) => {
          const Icon = iconMap[alert.type];
          return (
            <div
              key={`${alert.patient}-${alert.date}-${i}`}
              className={`group flex items-start gap-3 px-4 py-3.5 transition-colors duration-200 hover:bg-[#F7CA5E]/10 ${
                alert.urgent ? "bg-[#FA9C5C]/10" : ""
              }`}
            >
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                alert.urgent ? "bg-[#FA9C5C]/20 text-foreground" : "bg-muted text-muted-foreground"
              } transition-transform duration-200 group-hover:scale-[1.04]`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground">{alert.patient}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{alert.date}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className={`text-[11px] font-medium ${alert.urgent ? "text-foreground" : "text-muted-foreground"}`}>
                    {typeLabel[alert.type]}
                  </p>
                  {alert.urgent && (
                    <span className="rounded-full bg-[#FA9C5C]/20 px-2 py-0.5 text-[10px] font-semibold text-foreground">
                      prioridad
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{alert.description}</p>
              </div>
            </div>
          );
        })}

        {!loading && alerts.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">No hay alertas activas.</div>
        )}
      </div>
    </div>
  );
}
