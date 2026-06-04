import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export type DashboardCaloriePoint = {
  dia: string;
  Planificadas: number;
  Consumidas: number;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-xl border border-border/70 bg-card p-3">
      <p className="mb-2 text-xs font-semibold text-foreground">Balance {label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="flex items-center justify-between gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.fill }} />
            {entry.name}
          </span>
          <span className="font-semibold text-foreground">{entry.value} kcal</span>
        </p>
      ))}
    </div>
  );
};

export function CaloriesChart({
  data = [],
  loading = false,
  weekLabel,
}: {
  data?: DashboardCaloriePoint[];
  loading?: boolean;
  weekLabel?: string;
}) {
  const hasData = data.some((item) => item.Planificadas > 0 || item.Consumidas > 0);

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[#F7CA5E]/70">
      <div className="border-b border-border/60 bg-card p-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#F7CA5E]" />
            <h3 className="text-base font-semibold text-foreground">Calorias Planificadas vs Consumidas</h3>
          </div>
          <p className="text-sm text-muted-foreground">Promedio semanal - pacientes activos{weekLabel ? ` - ${weekLabel}` : ""}</p>
        </div>
      </div>
      <div className="p-4">
        {loading || !hasData ? (
        <div className="flex h-[280px] items-center justify-center rounded-xl bg-muted/25 text-sm text-muted-foreground">
          {loading ? "Cargando balance calorico..." : "No hay balance calorico para la semana actual."}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} barGap={4} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" opacity={0.42} vertical={false} />
            <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} unit=" kcal" />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}
            />
            <Bar dataKey="Planificadas" fill="#C5EB6F" radius={[10, 10, 4, 4]} maxBarSize={30} />
            <Bar dataKey="Consumidas" fill="#FA9C5C" radius={[10, 10, 4, 4]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      )}
      </div>
    </div>
  );
}
