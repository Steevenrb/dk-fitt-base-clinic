import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const weightData = [
  { semana: "Sem 1", "María G.": 82.5, "Carlos R.": 95.0, "Ana L.": 68.2 },
  { semana: "Sem 2", "María G.": 81.8, "Carlos R.": 94.2, "Ana L.": 67.8 },
  { semana: "Sem 3", "María G.": 81.2, "Carlos R.": 93.5, "Ana L.": 67.5 },
  { semana: "Sem 4", "María G.": 80.5, "Carlos R.": 93.8, "Ana L.": 67.0 },
  { semana: "Sem 5", "María G.": 79.8, "Carlos R.": 92.6, "Ana L.": 66.7 },
  { semana: "Sem 6", "María G.": 79.3, "Carlos R.": 92.1, "Ana L.": 66.3 },
  { semana: "Sem 7", "María G.": 78.9, "Carlos R.": 91.4, "Ana L.": 66.0 },
  { semana: "Sem 8", "María G.": 78.2, "Carlos R.": 91.0, "Ana L.": 65.5 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-foreground">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="text-xs text-muted-foreground">
          <span style={{ color: entry.color }}>●</span> {entry.name}: {entry.value} kg
        </p>
      ))}
    </div>
  );
};

export function WeightChart() {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-1 text-sm font-semibold text-foreground">Evolución del Peso</h3>
      <p className="mb-5 text-xs text-muted-foreground">Últimas 8 semanas · 3 pacientes seleccionados</p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={weightData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" />
          <XAxis dataKey="semana" tick={{ fontSize: 11, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} domain={["dataMin - 2", "dataMax + 2"]} unit=" kg" />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: "hsl(0 0% 60%)" }}
          />
          <Line type="monotone" dataKey="María G." stroke="#e5b106" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="Carlos R." stroke="#cc8c02" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="Ana L." stroke="#a3a3a3" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
