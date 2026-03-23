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

const calorieData = [
  { dia: "Lun", Planificadas: 1800, Consumidas: 1720 },
  { dia: "Mar", Planificadas: 1800, Consumidas: 2050 },
  { dia: "Mié", Planificadas: 1800, Consumidas: 1780 },
  { dia: "Jue", Planificadas: 1800, Consumidas: 1650 },
  { dia: "Vie", Planificadas: 1800, Consumidas: 1920 },
  { dia: "Sáb", Planificadas: 2000, Consumidas: 2300 },
  { dia: "Dom", Planificadas: 2000, Consumidas: 2150 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-foreground">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="text-xs text-muted-foreground">
          <span style={{ color: entry.fill }}>■</span> {entry.name}: {entry.value} kcal
        </p>
      ))}
    </div>
  );
};

export function CaloriesChart() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-1 text-sm font-semibold text-foreground">Calorías Planificadas vs Consumidas</h3>
      <p className="mb-5 text-xs text-muted-foreground">Promedio semanal · todos los pacientes activos</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={calorieData} barGap={4}>
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
    </div>
  );
}
