import { TrendingUp, TrendingDown, Users, ClipboardCheck, Activity } from "lucide-react";

export type DashboardKpi = {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: typeof Activity;
  variant: "primary" | "accent";
};

const defaultKpis: DashboardKpi[] = [
  {
    label: "Adherencia Promedio",
    value: "78%",
    change: "+3.2%",
    trend: "up" as const,
    icon: Activity,
    variant: "primary" as const,
  },
  {
    label: "Baja Adherencia",
    value: "6",
    change: "+2 esta semana",
    trend: "down" as const,
    icon: TrendingDown,
    variant: "accent" as const,
  },
  {
    label: "Planes Activos",
    value: "34",
    change: "+5 nuevos",
    trend: "up" as const,
    icon: ClipboardCheck,
    variant: "primary" as const,
  },
  {
    label: "Progreso Semanal",
    value: "82%",
    change: "+1.8%",
    trend: "up" as const,
    icon: Users,
    variant: "primary" as const,
  },
];

export function KpiCards({ kpis = defaultKpis, loading = false }: { kpis?: DashboardKpi[]; loading?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => {
        const isPrimary = kpi.variant === "primary";
        return (
          <div
            key={kpi.label}
            className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {kpi.label}
              </p>
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  isPrimary ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"
                }`}
              >
                <kpi.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">{loading ? "..." : kpi.value}</p>
            <div className="mt-2 flex items-center gap-1.5">
              {kpi.trend === "up" ? (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-accent" />
              )}
              <span
                className={`text-xs font-medium ${
                  kpi.trend === "up" ? "text-emerald-500" : "text-accent"
                }`}
              >
                {kpi.change}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
