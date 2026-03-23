import { useState } from "react";
import { Plus, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface Evaluation {
  id: number;
  fecha: string;
  peso: number;
  grasa: number;
  musculo: number;
  imc: number;
}

const evaluations: Evaluation[] = [
  { id: 1, fecha: "22 Mar 2026", peso: 74.1, grasa: 28.3, musculo: 32.6, imc: 26.1 },
  { id: 2, fecha: "08 Mar 2026", peso: 74.8, grasa: 28.9, musculo: 32.4, imc: 26.4 },
  { id: 3, fecha: "22 Feb 2026", peso: 75.9, grasa: 29.5, musculo: 32.1, imc: 26.8 },
  { id: 4, fecha: "08 Feb 2026", peso: 76.3, grasa: 30.1, musculo: 31.8, imc: 26.9 },
  { id: 5, fecha: "25 Ene 2026", peso: 77.0, grasa: 30.8, musculo: 31.5, imc: 27.2 },
  { id: 6, fecha: "11 Ene 2026", peso: 77.8, grasa: 31.2, musculo: 31.3, imc: 27.4 },
];

const trendData = evaluations.slice().reverse().map((e) => ({
  fecha: e.fecha.slice(0, 6),
  Peso: e.peso,
  "% Grasa": e.grasa,
  Músculo: e.musculo,
}));

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-xs text-muted-foreground">
          <span style={{ color: p.color }}>●</span> {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export function TabEvaluaciones() {
  const [selected, setSelected] = useState<number[]>([]);

  const toggle = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const compared = selected.length >= 2
    ? evaluations.filter((e) => selected.includes(e.id)).slice(0, 2)
    : null;

  return (
    <div className="space-y-6">
      {/* Trend chart */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-1 text-sm font-semibold text-foreground">Tendencias Clínicas</h3>
        <p className="mb-5 text-xs text-muted-foreground">Evolución de métricas corporales</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" />
            <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="Peso" stroke="#e5b106" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="% Grasa" stroke="#cc8c02" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Músculo" stroke="#a3a3a3" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold text-foreground">Historial de Evaluaciones</h3>
          <div className="flex gap-2">
            {selected.length >= 2 && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => {}}>
                <GitCompare className="h-3.5 w-3.5" /> Comparar ({selected.length})
              </Button>
            )}
            <Button size="sm" className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Registrar nueva evaluación
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 w-10"></th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Fecha</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Peso (kg)</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">% Grasa</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Masa Muscular (kg)</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">IMC</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3">
                    <Checkbox checked={selected.includes(e.id)} onCheckedChange={() => toggle(e.id)} />
                  </td>
                  <td className="px-5 py-3 font-medium text-foreground">{e.fecha}</td>
                  <td className="px-5 py-3 text-foreground">{e.peso}</td>
                  <td className="px-5 py-3 text-foreground">{e.grasa}%</td>
                  <td className="px-5 py-3 text-foreground">{e.musculo}</td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className={`text-[11px] ${e.imc > 27 ? "bg-accent/20 text-accent border-accent/30" : "bg-primary/15 text-primary border-primary/30"}`}>
                      {e.imc}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparison */}
      {compared && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Comparación de Evaluaciones</h3>
          <div className="grid grid-cols-2 gap-4">
            {compared.map((e) => (
              <div key={e.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
                <p className="text-xs font-semibold text-primary">{e.fecha}</p>
                <p className="text-sm text-muted-foreground">Peso: <span className="text-foreground font-medium">{e.peso} kg</span></p>
                <p className="text-sm text-muted-foreground">Grasa: <span className="text-foreground font-medium">{e.grasa}%</span></p>
                <p className="text-sm text-muted-foreground">Músculo: <span className="text-foreground font-medium">{e.musculo} kg</span></p>
                <p className="text-sm text-muted-foreground">IMC: <span className="text-foreground font-medium">{e.imc}</span></p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
