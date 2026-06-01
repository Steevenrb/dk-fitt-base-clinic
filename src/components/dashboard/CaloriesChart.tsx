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

const defaultCalorieData: DashboardCaloriePoint[] = [
  { dia: "Lun", Planificadas: 1800, Consumidas: 1720 },
  { dia: "Mar", Planificadas: 1800, Consumidas: 2050 },
  { dia: "Mie", Planificadas: 1800, Consumidas: 1780 },
  { dia: "Jue", Planificadas: 1800, Consumidas: 1650 },
  { dia: "Vie", Planificadas: 1800, Consumidas: 1920 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-foreground">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="text-xs text-muted-foreground">
          <span style={{ color: entry.fill }}>#</span> {entry.name}: {entry.value} kcal
        </p>
      ))}
    </div>
  );
};

export function CaloriesChart({
  data = defaultCalorieData,
  loading = false,
  weekLabel,
}: {
  data?: DashboardCaloriePoint[];
  loading?: boolean;
  weekLabel?: string;
}) {
  const hasData = data.some((item) => item.Planificadas > 0 || item.Consumidas > 0);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-5">
        <div>
          <h3 className="mb-1 text-sm font-semibold text-foreground">Calorias Planificadas vs Consumidas</h3>
          <p className="text-xs text-muted-foreground">Promedio semanal - pacientes activos{weekLabel ? ` - ${weekLabel}` : ""}</p>
        </div>
      </div>
      {loading || !hasData ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
          {loading ? "Cargando balance calorico..." : "No hay balance calorico para la semana actual."}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" vertical={false} />
            <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} unit=" kcal" />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="square"
              iconSize={10}
              wrapperStyle={{ fontSize: 11, color: "hsl(0 0% 60%)" }}
            />
            <Bar dataKey="Planificadas" fill="#e5b106" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Consumidas" fill="#cc8c02" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
