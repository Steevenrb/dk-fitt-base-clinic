import { Activity, Droplets, Dumbbell, TrendingUp, TrendingDown } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const weightData = [
  { fecha: "Ene", peso: 78.5 },
  { fecha: "Feb", peso: 77.8 },
  { fecha: "Mar", peso: 77.0 },
  { fecha: "Abr", peso: 76.3 },
  { fecha: "May", peso: 75.9 },
  { fecha: "Jun", peso: 75.2 },
  { fecha: "Jul", peso: 74.8 },
  { fecha: "Ago", peso: 74.1 },
];

const kpis = [
  { label: "Peso Actual", value: "74.1 kg", change: "-4.4 kg", trend: "down", icon: Activity },
  { label: "% Grasa Corporal", value: "28.3%", change: "-3.1%", trend: "down", icon: Droplets },
  { label: "Masa Muscular", value: "32.6 kg", change: "+1.2 kg", trend: "up", icon: Dumbbell },
  { label: "Adherencia General", value: "72%", change: "+5%", trend: "up", icon: TrendingUp },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">Peso: {payload[0]?.value} kg</p>
    </div>
  );
};

export function TabResumen() {
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</p>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <k.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">{k.value}</p>
            <div className="mt-2 flex items-center gap-1.5">
              {k.trend === "down" ? (
                <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              )}
              <span className="text-xs font-medium text-emerald-500">{k.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Weight chart */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-1 text-sm font-semibold text-foreground">Evolución de Peso</h3>
        <p className="mb-5 text-xs text-muted-foreground">Últimos 8 meses</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={weightData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" />
            <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} domain={["dataMin - 1", "dataMax + 1"]} unit=" kg" />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="peso" stroke="#e5b106" strokeWidth={2.5} dot={{ r: 4, fill: "#e5b106" }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Caloric balance */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Balance Calórico Semanal</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Calorías Planificadas", value: "1,750 kcal", sub: "Meta diaria" },
            { label: "Calorías Consumidas", value: "1,820 kcal", sub: "Promedio real" },
            { label: "Balance", value: "Superávit leve", sub: "+70 kcal/día", highlight: true },
          ].map((item) => (
            <div key={item.label} className={`rounded-lg border p-4 ${item.highlight ? "border-accent/40 bg-accent/5" : "border-border bg-muted/30"}`}>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`mt-1 text-lg font-bold ${item.highlight ? "text-accent" : "text-foreground"}`}>{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
