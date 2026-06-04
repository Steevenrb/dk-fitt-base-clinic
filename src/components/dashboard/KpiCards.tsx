import { Activity, TrendingDown, TrendingUp } from "lucide-react";

export type DashboardKpi = {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: typeof Activity;
  variant: "primary" | "accent";
};

const palette = [
  {
    background: "bg-[#C5EB6F]",
    dot: "bg-[#253027]/70",
    border: "border-[#C5EB6F]",
    progress: "bg-[#253027]/70",
  },
  {
    background: "bg-[#F7CA5E]",
    dot: "bg-[#253027]/70",
    border: "border-[#F7CA5E]",
    progress: "bg-[#253027]/70",
  },
  {
    background: "bg-[#FA9C5C]",
    dot: "bg-[#253027]/70",
    border: "border-[#FA9C5C]",
    progress: "bg-[#253027]/70",
  },
];

function TrendIndicator({ trend, change, onTint = false }: { trend: DashboardKpi["trend"]; change: string; onTint?: boolean }) {
  const isUp = trend === "up";
  return (
    <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs font-medium">
      {isUp ? (
        <TrendingUp className={`h-3.5 w-3.5 shrink-0 ${onTint ? "text-[#253027]/75" : "text-[#7A9A18]"}`} />
      ) : (
        <TrendingDown className={`h-3.5 w-3.5 shrink-0 ${onTint ? "text-[#253027]/75" : "text-[#B7602B]"}`} />
      )}
      <span className={`truncate ${onTint ? "text-[#253027]/75" : isUp ? "text-[#647F16] dark:text-[#C5EB6F]" : "text-[#A55425] dark:text-[#FA9C5C]"}`}>
        {change}
      </span>
    </div>
  );
}

export function KpiCards({ kpis = [], loading = false }: { kpis?: DashboardKpi[]; loading?: boolean }) {
  const [featured, ...secondaryKpis] = kpis;

  if (!featured) {
    return (
      <section className="rounded-xl border border-border/70 bg-card px-5 py-7 text-center">
        <p className="text-sm text-muted-foreground">No hay metricas disponibles para mostrar.</p>
      </section>
    );
  }

  const featuredPercent = featured.value.includes("%")
    ? Math.max(0, Math.min(100, Number.parseFloat(featured.value) || 0))
    : null;

  return (
    <section className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-[1.25fr_repeat(3,minmax(0,1fr))]">
      <div className="rounded-xl border border-[#F7CA5E]/70 bg-[linear-gradient(135deg,#ffffff_0%,#ffffff_58%,#C5EB6F24_78%,#F7CA5E30_100%)] p-4 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[#F7CA5E] dark:bg-[linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--card))_62%,#C5EB6F1F_82%,#F7CA5E24_100%)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#F7CA5E]" />
              <p className="truncate text-sm font-semibold text-foreground">{featured.label}</p>
            </div>
            {featuredPercent === null && (
              <p className="mt-3 text-4xl font-bold tracking-tight text-foreground">{loading ? "..." : featured.value}</p>
            )}
            <TrendIndicator trend={featured.trend} change={featured.change} />
          </div>
          <div className="flex shrink-0 items-center">
            {featuredPercent !== null && (
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full"
                style={{ background: `conic-gradient(#F7CA5E ${featuredPercent}%, hsl(var(--muted)) ${featuredPercent}%)` }}
                aria-hidden="true"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-sm font-bold text-foreground dark:bg-card">
                  {loading ? "..." : featured.value}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {secondaryKpis.map((kpi, index) => {
        const Icon = kpi.icon;
        const token = palette[index % palette.length];
        const percentValue = kpi.value.includes("%")
          ? Math.max(0, Math.min(100, Number.parseFloat(kpi.value) || 0))
          : null;

        return (
          <div
            key={kpi.label}
            className={`rounded-xl border p-3.5 text-[#253027] transition-[border-color,transform] duration-200 hover:-translate-y-0.5 ${token.background} ${token.border}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${token.dot}`} />
                  <p className="truncate text-xs font-semibold text-[#253027]">{kpi.label}</p>
                </div>
                <p className="mt-2 text-2xl font-bold tracking-tight text-[#253027]">{loading ? "..." : kpi.value}</p>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-foreground ring-1 ring-white/70">
                <Icon className="h-4 w-4" />
              </div>
            </div>
            {percentValue !== null && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/55">
                <div className={`h-full rounded-full ${token.progress}`} style={{ width: `${percentValue}%` }} />
              </div>
            )}
            <TrendIndicator trend={kpi.trend} change={kpi.change} onTint />
          </div>
        );
      })}
    </section>
  );
}
