import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CalendarDays, TrendingUp, AlertTriangle, Flame, UtensilsCrossed } from "lucide-react";

/* ───── data ───── */

interface ConsumoExtra {
  id: number;
  name: string;
  description: string;
  date: string;
  time: string;
  calories: number;
  type: "snack" | "bebida" | "comida";
  impact: "bajo" | "moderado" | "alto";
  imageUrl: string;
}

const consumos: ConsumoExtra[] = [
  { id: 1, name: "Pan dulce", description: "Concha de chocolate comprada en la panadería del trabajo", date: "22 Mar 2026", time: "10:30", calories: 320, type: "snack", impact: "alto", imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=260&fit=crop" },
  { id: 2, name: "Jugo de naranja natural", description: "Jugo de naranja con zanahoria, vaso grande 350ml", date: "21 Mar 2026", time: "08:15", calories: 140, type: "bebida", impact: "moderado", imageUrl: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=260&fit=crop" },
  { id: 3, name: "Mix de frutos secos", description: "Nueces, almendras y arándanos deshidratados, porción extra", date: "20 Mar 2026", time: "16:00", calories: 180, type: "snack", impact: "moderado", imageUrl: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400&h=260&fit=crop" },
  { id: 4, name: "Helado artesanal", description: "1 bola de helado de vainilla con galleta, heladería artesanal", date: "19 Mar 2026", time: "15:20", calories: 250, type: "snack", impact: "alto", imageUrl: "https://images.unsplash.com/photo-1570197571499-166b36435e9f?w=400&h=260&fit=crop" },
  { id: 5, name: "Galletas de avena", description: "3 galletas integrales de avena con miel del comedor", date: "18 Mar 2026", time: "11:45", calories: 90, type: "snack", impact: "bajo", imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=260&fit=crop" },
  { id: 6, name: "Café con leche grande", description: "Café latte con leche entera y azúcar, cadena comercial", date: "17 Mar 2026", time: "09:00", calories: 190, type: "bebida", impact: "moderado", imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=260&fit=crop" },
  { id: 7, name: "Tacos al pastor", description: "2 tacos al pastor con piña y salsa, puesto callejero", date: "16 Mar 2026", time: "14:30", calories: 420, type: "comida", impact: "alto", imageUrl: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&h=260&fit=crop" },
  { id: 8, name: "Refresco sin azúcar", description: "Lata de refresco light 355ml, máquina expendedora", date: "15 Mar 2026", time: "13:10", calories: 5, type: "bebida", impact: "bajo", imageUrl: "https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=400&h=260&fit=crop" },
];

const impactConfig = {
  bajo: { label: "Bajo", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  moderado: { label: "Moderado", className: "bg-primary/15 text-primary border-primary/30" },
  alto: { label: "Alto", className: "bg-accent/20 text-accent border-accent/30" },
};

const typeConfig = {
  snack: { label: "Snack", className: "bg-muted text-muted-foreground border-border" },
  bebida: { label: "Bebida", className: "bg-sky-500/15 text-sky-400 border-sky-500/30" },
  comida: { label: "Comida", className: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
};

const deviationData = [
  { dia: "Lun 15", planificadas: 1800, consumidas: 1805, adicionales: 5, clasificacion: "plan" },
  { dia: "Mar 16", planificadas: 1800, consumidas: 2220, adicionales: 420, clasificacion: "alta" },
  { dia: "Mié 17", planificadas: 1800, consumidas: 1990, adicionales: 190, clasificacion: "leve" },
  { dia: "Jue 18", planificadas: 1800, consumidas: 1890, adicionales: 90, clasificacion: "plan" },
  { dia: "Vie 19", planificadas: 1800, consumidas: 2050, adicionales: 250, clasificacion: "leve" },
  { dia: "Sáb 20", planificadas: 2000, consumidas: 2180, adicionales: 180, clasificacion: "leve" },
  { dia: "Dom 21", planificadas: 2000, consumidas: 2140, adicionales: 140, clasificacion: "leve" },
  { dia: "Lun 22", planificadas: 1800, consumidas: 2120, adicionales: 320, clasificacion: "alta" },
];

const acumuladoData = deviationData.map((d, i) => ({
  dia: d.dia,
  adicionales: d.adicionales,
  acumulado: deviationData.slice(0, i + 1).reduce((s, x) => s + x.adicionales, 0),
}));

const clasificacionConfig: Record<string, { label: string; className: string }> = {
  plan: { label: "Dentro del plan", className: "text-emerald-400" },
  leve: { label: "Leve desviación", className: "text-primary" },
  alta: { label: "Alta desviación", className: "text-accent" },
};

/* ───── tooltips ───── */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-foreground">{label}</p>
      {payload.map((e: any) => (
        <p key={e.name} className="text-xs text-muted-foreground">
          <span style={{ color: e.color || e.fill }}>■</span> {e.name}: {e.value} kcal
        </p>
      ))}
    </div>
  );
};

/* ───── component ───── */

export function TabConsumo() {
  const totalCals = consumos.reduce((s, c) => s + c.calories, 0);
  const avgDaily = Math.round(totalCals / 8);
  const highDays = deviationData.filter((d) => d.clasificacion === "alta").length;
  const deviationLevel = totalCals > 1200 ? "Alto" : totalCals > 600 ? "Medio" : "Bajo";
  const deviationColor = deviationLevel === "Alto" ? "text-accent" : deviationLevel === "Medio" ? "text-primary" : "text-emerald-400";

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Análisis de Consumo Adicional</h3>
          <p className="text-xs text-muted-foreground mt-1">Alimentos y bebidas fuera del plan nutricional · últimos 8 días</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Desviación</p>
            <p className={`text-sm font-bold ${deviationColor}`}>{deviationLevel}</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Exceso acumulado</p>
            <p className={`text-lg font-bold ${totalCals > 1200 ? "text-accent" : "text-primary"}`}>{totalCals.toLocaleString()} kcal</p>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Calorías adicionales totales", value: `${totalCals.toLocaleString()} kcal`, icon: Flame, accent: true },
          { label: "Promedio diario de exceso", value: `${avgDaily} kcal`, icon: TrendingUp, accent: avgDaily > 150 },
          { label: "Registros de consumo", value: consumos.length.toString(), icon: UtensilsCrossed, accent: false },
          { label: "Días con alta desviación", value: `${highDays} de 8`, icon: AlertTriangle, accent: highDays >= 2 },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={`h-4 w-4 ${kpi.accent ? "text-accent" : "text-primary"}`} />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
            </div>
            <p className={`text-xl font-bold ${kpi.accent ? "text-accent" : "text-foreground"}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ── Consumo Cards ── */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Registro de Consumos</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {consumos.map((item) => {
            const impact = impactConfig[item.impact];
            const tipo = typeConfig[item.type];
            return (
              <div key={item.id} className="rounded-xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-lg hover:shadow-primary/5">
                <Dialog>
                  <DialogTrigger asChild>
                    <img src={item.imageUrl} alt={item.name} className="h-32 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity" />
                  </DialogTrigger>
                  <DialogContent className="max-w-lg p-0 overflow-hidden">
                    <img src={item.imageUrl} alt={item.name} className="w-full" />
                  </DialogContent>
                </Dialog>
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${impact.className}`}>{impact.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] ${tipo.className}`}>{tipo.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                    <span>{item.date} · {item.time}</span>
                    <span className="font-semibold text-foreground">{item.calories} kcal</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Deviation Table ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h4 className="text-sm font-semibold text-foreground mb-1">Análisis de Desviación Calórica</h4>
        <p className="text-xs text-muted-foreground mb-4">Comparativa plan vs consumo real incluyendo extras</p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-xs">Día</TableHead>
                <TableHead className="text-xs text-right">Planificadas</TableHead>
                <TableHead className="text-xs text-right">Consumidas</TableHead>
                <TableHead className="text-xs text-right">Adicionales</TableHead>
                <TableHead className="text-xs text-right">Diferencia</TableHead>
                <TableHead className="text-xs">Clasificación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deviationData.map((row) => {
                const diff = row.consumidas - row.planificadas;
                const cls = clasificacionConfig[row.clasificacion];
                return (
                  <TableRow key={row.dia} className="border-border">
                    <TableCell className="text-xs font-medium">{row.dia}</TableCell>
                    <TableCell className="text-xs text-right">{row.planificadas}</TableCell>
                    <TableCell className="text-xs text-right">{row.consumidas}</TableCell>
                    <TableCell className="text-xs text-right text-accent font-medium">+{row.adicionales}</TableCell>
                    <TableCell className={`text-xs text-right font-medium ${diff > 100 ? "text-accent" : diff > 0 ? "text-primary" : "text-emerald-400"}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </TableCell>
                    <TableCell><span className={`text-xs font-medium ${cls.className}`}>{cls.label}</span></TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="border-border bg-muted/30">
                <TableCell className="text-xs font-semibold">Acumulado</TableCell>
                <TableCell className="text-xs text-right font-semibold">{deviationData.reduce((s, r) => s + r.planificadas, 0).toLocaleString()}</TableCell>
                <TableCell className="text-xs text-right font-semibold">{deviationData.reduce((s, r) => s + r.consumidas, 0).toLocaleString()}</TableCell>
                <TableCell className="text-xs text-right font-semibold text-accent">+{totalCals.toLocaleString()}</TableCell>
                <TableCell className="text-xs text-right font-semibold text-accent">
                  +{(deviationData.reduce((s, r) => s + r.consumidas, 0) - deviationData.reduce((s, r) => s + r.planificadas, 0)).toLocaleString()}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bar chart - adicionales por día */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h4 className="text-sm font-semibold text-foreground mb-1">Calorías Adicionales por Día</h4>
          <p className="text-xs text-muted-foreground mb-4">Identificación de patrones de consumo extra</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={acumuladoData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} unit=" kcal" />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="adicionales" name="Adicionales" fill="hsl(38 98% 40%)" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line chart - acumulado */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h4 className="text-sm font-semibold text-foreground mb-1">Exceso Calórico Acumulado</h4>
          <p className="text-xs text-muted-foreground mb-4">Tendencia de acumulación en el período</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={acumuladoData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} unit=" kcal" />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="acumulado" name="Acumulado" stroke="hsl(44 90% 46%)" strokeWidth={2} dot={{ fill: "hsl(44 90% 46%)", r: 4 }} />
              <Line type="monotone" dataKey="adicionales" name="Día" stroke="hsl(38 98% 40%)" strokeWidth={1.5} strokeDasharray="4 4" dot={{ fill: "hsl(38 98% 40%)", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
