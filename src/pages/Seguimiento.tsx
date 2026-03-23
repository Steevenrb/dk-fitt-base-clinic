import { useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Check, X, Utensils, Dumbbell, Scale, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ── Data ──

const weekDays = ["Lun 17", "Mar 18", "Mié 19", "Jue 20", "Vie 21", "Sáb 22", "Dom 23"];

interface MealRecord {
  name: string;
  planned: string;
  actual: string | null;
  done: boolean;
  diff: string;
}

interface ExerciseRecord {
  name: string;
  duration: string;
  done: boolean;
}

interface DayData {
  label: string;
  meals: MealRecord[];
  exercises: ExerciseRecord[];
  weight: number;
  weightDiff: number;
  mealPct: number;
  exercisePct: number;
}

const dailyData: DayData[] = [
  {
    label: "Lun 17 Mar",
    meals: [
      { name: "Desayuno", planned: "07:30", actual: "07:45", done: true, diff: "+15 min" },
      { name: "Media mañana", planned: "10:00", actual: "10:20", done: true, diff: "+20 min" },
      { name: "Almuerzo", planned: "13:30", actual: "13:35", done: true, diff: "+5 min" },
      { name: "Merienda", planned: "16:00", actual: "16:10", done: true, diff: "+10 min" },
      { name: "Cena", planned: "19:30", actual: "20:00", done: true, diff: "+30 min" },
    ],
    exercises: [
      { name: "Caminata rápida 30 min", duration: "30 min", done: true },
      { name: "Estiramientos", duration: "15 min", done: true },
    ],
    weight: 74.3, weightDiff: -0.2, mealPct: 100, exercisePct: 100,
  },
  {
    label: "Mar 18 Mar",
    meals: [
      { name: "Desayuno", planned: "07:30", actual: "08:00", done: true, diff: "+30 min" },
      { name: "Media mañana", planned: "10:00", actual: null, done: false, diff: "—" },
      { name: "Almuerzo", planned: "13:30", actual: "14:00", done: true, diff: "+30 min" },
      { name: "Merienda", planned: "16:00", actual: "16:30", done: true, diff: "+30 min" },
      { name: "Cena", planned: "19:30", actual: "20:15", done: true, diff: "+45 min" },
    ],
    exercises: [
      { name: "Rutina fuerza tren superior", duration: "40 min", done: true },
      { name: "Estiramientos", duration: "15 min", done: false },
    ],
    weight: 74.1, weightDiff: -0.2, mealPct: 80, exercisePct: 50,
  },
  {
    label: "Mié 19 Mar",
    meals: [
      { name: "Desayuno", planned: "07:30", actual: "07:40", done: true, diff: "+10 min" },
      { name: "Media mañana", planned: "10:00", actual: "10:05", done: true, diff: "+5 min" },
      { name: "Almuerzo", planned: "13:30", actual: "13:30", done: true, diff: "A tiempo" },
      { name: "Merienda", planned: "16:00", actual: null, done: false, diff: "—" },
      { name: "Cena", planned: "19:30", actual: null, done: false, diff: "—" },
    ],
    exercises: [
      { name: "Caminata rápida 30 min", duration: "30 min", done: true },
      { name: "Estiramientos", duration: "15 min", done: true },
    ],
    weight: 74.0, weightDiff: -0.1, mealPct: 60, exercisePct: 100,
  },
  {
    label: "Jue 20 Mar",
    meals: [
      { name: "Desayuno", planned: "07:30", actual: "07:50", done: true, diff: "+20 min" },
      { name: "Media mañana", planned: "10:00", actual: "10:15", done: true, diff: "+15 min" },
      { name: "Almuerzo", planned: "13:30", actual: "13:45", done: true, diff: "+15 min" },
      { name: "Merienda", planned: "16:00", actual: "16:00", done: true, diff: "A tiempo" },
      { name: "Cena", planned: "19:30", actual: "19:45", done: true, diff: "+15 min" },
    ],
    exercises: [
      { name: "Rutina fuerza tren inferior", duration: "40 min", done: true },
      { name: "Estiramientos", duration: "15 min", done: true },
    ],
    weight: 73.8, weightDiff: -0.2, mealPct: 100, exercisePct: 100,
  },
  {
    label: "Vie 21 Mar",
    meals: [
      { name: "Desayuno", planned: "07:30", actual: "08:10", done: true, diff: "+40 min" },
      { name: "Media mañana", planned: "10:00", actual: null, done: false, diff: "—" },
      { name: "Almuerzo", planned: "13:30", actual: "14:30", done: true, diff: "+60 min" },
      { name: "Merienda", planned: "16:00", actual: null, done: false, diff: "—" },
      { name: "Cena", planned: "19:30", actual: "21:00", done: true, diff: "+90 min" },
    ],
    exercises: [
      { name: "Caminata rápida 30 min", duration: "30 min", done: false },
      { name: "Estiramientos", duration: "15 min", done: false },
    ],
    weight: 74.1, weightDiff: 0.3, mealPct: 60, exercisePct: 0,
  },
  {
    label: "Sáb 22 Mar",
    meals: [
      { name: "Desayuno", planned: "08:00", actual: "09:30", done: true, diff: "+90 min" },
      { name: "Media mañana", planned: "10:30", actual: null, done: false, diff: "—" },
      { name: "Almuerzo", planned: "14:00", actual: "14:20", done: true, diff: "+20 min" },
      { name: "Merienda", planned: "16:30", actual: null, done: false, diff: "—" },
      { name: "Cena", planned: "20:00", actual: "21:30", done: true, diff: "+90 min" },
    ],
    exercises: [
      { name: "Bicicleta estática 25 min", duration: "25 min", done: true },
    ],
    weight: 74.2, weightDiff: 0.1, mealPct: 60, exercisePct: 100,
  },
  {
    label: "Dom 23 Mar",
    meals: [
      { name: "Desayuno", planned: "08:00", actual: "10:00", done: true, diff: "+120 min" },
      { name: "Media mañana", planned: "10:30", actual: null, done: false, diff: "—" },
      { name: "Almuerzo", planned: "14:00", actual: "15:00", done: true, diff: "+60 min" },
      { name: "Merienda", planned: "16:30", actual: null, done: false, diff: "—" },
      { name: "Cena", planned: "20:00", actual: null, done: false, diff: "—" },
    ],
    exercises: [],
    weight: 74.1, weightDiff: -0.1, mealPct: 40, exercisePct: 0,
  },
];

const adherenceTrend = [
  { semana: "Sem 1", alimentario: 85, ejercicio: 70, total: 80 },
  { semana: "Sem 2", alimentario: 78, ejercicio: 65, total: 74 },
  { semana: "Sem 3", alimentario: 82, ejercicio: 80, total: 81 },
  { semana: "Sem 4", alimentario: 75, ejercicio: 60, total: 70 },
  { semana: "Sem 5", alimentario: 88, ejercicio: 75, total: 84 },
  { semana: "Sem 6", alimentario: 72, ejercicio: 55, total: 67 },
  { semana: "Actual", alimentario: 71, ejercicio: 64, total: 69 },
];

const comparisonData = weekDays.map((d, i) => ({
  dia: d,
  Planificadas: 1750,
  Consumidas: [1720, 1890, 1480, 1760, 2100, 2280, 1350][i],
}));

// ── Helpers ──

const getLevel = (pct: number) => {
  if (pct >= 80) return { label: "Alta", className: "bg-primary/15 text-primary border-primary/30" };
  if (pct >= 50) return { label: "Media", className: "bg-muted text-muted-foreground border-border" };
  return { label: "Baja", className: "bg-accent/20 text-accent border-accent/30" };
};

const pctColor = (pct: number) => (pct >= 70 ? "text-primary" : "text-accent");

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-xs text-muted-foreground">
          <span style={{ color: p.color || p.fill }}>●</span> {p.name}: {p.value}{typeof p.value === "number" && p.value <= 100 ? "%" : " kcal"}
        </p>
      ))}
    </div>
  );
};

// ── Component ──

const Seguimiento = () => {
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState(3); // Jueves
  const day = dailyData[selectedDay];

  const weekMealAvg = Math.round(dailyData.reduce((s, d) => s + d.mealPct, 0) / dailyData.length);
  const weekExAvg = Math.round(dailyData.reduce((s, d) => s + d.exercisePct, 0) / dailyData.length);
  const weekTotal = Math.round((weekMealAvg + weekExAvg) / 2);
  const dayTotal = day.exercises.length > 0 ? Math.round((day.mealPct + day.exercisePct) / 2) : day.mealPct;

  const kpis = [
    { label: "Cumplimiento Alimentario", value: `${weekMealAvg}%`, icon: Utensils, high: weekMealAvg >= 70 },
    { label: "Cumplimiento Ejercicios", value: `${weekExAvg}%`, icon: Dumbbell, high: weekExAvg >= 70 },
    { label: "Adherencia Total", value: `${weekTotal}%`, icon: Activity, high: weekTotal >= 70 },
    { label: "Peso Actual / Objetivo", value: "74.1 / 70.0 kg", icon: Scale, high: true, sub: "-4.1 kg restantes" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/pacientes")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">Seguimiento — María González</h1>
                <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 text-[11px]">Activo</Badge>
                <Badge variant="outline" className={`text-[11px] ${getLevel(weekTotal).className}`}>{getLevel(weekTotal).label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">Semana del 17 al 23 de marzo 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right mr-2">
              <p className={`text-3xl font-bold ${pctColor(weekTotal)}`}>{weekTotal}%</p>
              <p className="text-[11px] text-muted-foreground">adherencia semanal</p>
            </div>
            {/* Day selector */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDay(Math.max(0, selectedDay - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium text-foreground px-2 min-w-[80px] text-center">{day.label}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDay(Math.min(6, selectedDay + 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</p>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${k.high ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"}`}>
                  <k.icon className="h-4 w-4" />
                </div>
              </div>
              <p className={`mt-3 text-3xl font-bold ${k.high ? "text-foreground" : "text-accent"}`}>{k.value}</p>
              {k.sub && <p className="mt-1 text-xs text-muted-foreground">{k.sub}</p>}
            </div>
          ))}
        </div>

        {/* Daily detail */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {/* Meals */}
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-sm font-semibold text-foreground">Comidas del Día</h3>
              <p className="text-xs text-muted-foreground">{day.meals.filter((m) => m.done).length} de {day.meals.length} cumplidas</p>
            </div>
            <div className="divide-y divide-border">
              {day.meals.map((m) => (
                <div key={m.name} className="flex items-center gap-3 px-5 py-3">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.done ? "bg-emerald-500/15 text-emerald-400" : "bg-accent/15 text-accent"}`}>
                    {m.done ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${m.done ? "text-foreground" : "text-muted-foreground"}`}>{m.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Plan: {m.planned} {m.actual && `· Real: ${m.actual}`}
                    </p>
                  </div>
                  <span className={`text-[11px] font-medium shrink-0 ${m.done ? (m.diff === "A tiempo" || m.diff.includes("+5") || m.diff.includes("+10") || m.diff.includes("+15") ? "text-primary" : "text-accent") : "text-muted-foreground"}`}>
                    {m.diff}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Exercises */}
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-sm font-semibold text-foreground">Ejercicios del Día</h3>
              <p className="text-xs text-muted-foreground">
                {day.exercises.length > 0 ? `${day.exercises.filter((e) => e.done).length} de ${day.exercises.length} completados` : "Sin ejercicios programados"}
              </p>
            </div>
            {day.exercises.length > 0 ? (
              <div className="divide-y divide-border">
                {day.exercises.map((e) => (
                  <div key={e.name} className="flex items-center gap-3 px-5 py-3">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${e.done ? "bg-emerald-500/15 text-emerald-400" : "bg-accent/15 text-accent"}`}>
                      {e.done ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${e.done ? "text-foreground" : "text-muted-foreground"}`}>{e.name}</p>
                      <p className="text-[11px] text-muted-foreground">{e.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">Día de descanso</div>
            )}

            {/* Weight */}
            <div className="border-t border-border px-5 py-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Peso del Día</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-foreground">{day.weight} kg</span>
                <div className={`flex items-center gap-1 ${day.weightDiff <= 0 ? "text-emerald-400" : "text-accent"}`}>
                  {day.weightDiff <= 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                  <span className="text-sm font-semibold">{day.weightDiff > 0 ? "+" : ""}{day.weightDiff} kg</span>
                </div>
              </div>
            </div>
          </div>

          {/* Adherence indicators */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-5">
            <h3 className="text-sm font-semibold text-foreground">Indicadores de Adherencia</h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Cumplimiento diario</span>
                  <span className={`font-semibold ${pctColor(dayTotal)}`}>{dayTotal}%</span>
                </div>
                <Progress value={dayTotal} className="h-3" />
                <p className={`text-[11px] font-medium ${pctColor(dayTotal)}`}>{getLevel(dayTotal).label}</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Cumplimiento semanal</span>
                  <span className={`font-semibold ${pctColor(weekTotal)}`}>{weekTotal}%</span>
                </div>
                <Progress value={weekTotal} className="h-3" />
                <p className={`text-[11px] font-medium ${pctColor(weekTotal)}`}>{getLevel(weekTotal).label}</p>
              </div>
            </div>

            {/* Per-day mini bars */}
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-muted-foreground">Adherencia por día</p>
              {dailyData.map((dd, i) => {
                const t = dd.exercises.length > 0 ? Math.round((dd.mealPct + dd.exercisePct) / 2) : dd.mealPct;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(i)}
                    className={`w-full flex items-center gap-3 rounded-md px-2 py-1 transition-colors ${i === selectedDay ? "bg-muted" : "hover:bg-muted/30"}`}
                  >
                    <span className="text-[11px] text-muted-foreground w-14 text-left shrink-0">{weekDays[i]}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${t >= 70 ? "bg-primary" : "bg-accent"}`} style={{ width: `${t}%` }} />
                    </div>
                    <span className={`text-[11px] font-medium w-8 text-right ${pctColor(t)}`}>{t}%</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Analysis */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* Adherence trend */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-1 text-sm font-semibold text-foreground">Adherencia en el Tiempo</h3>
            <p className="mb-5 text-xs text-muted-foreground">Últimas 7 semanas</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={adherenceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" />
                <XAxis dataKey="semana" tick={{ fontSize: 11, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip content={<ChartTooltip />} />
                <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="alimentario" name="Alimentario" stroke="#e5b106" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="ejercicio" name="Ejercicio" stroke="#cc8c02" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="total" name="Total" stroke="#a3a3a3" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Plan vs execution */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-1 text-sm font-semibold text-foreground">Plan vs Ejecución Real</h3>
            <p className="mb-5 text-xs text-muted-foreground">Calorías planificadas vs consumidas esta semana</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={comparisonData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend verticalAlign="top" align="right" iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Planificadas" fill="#e5b106" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Consumidas" fill="#cc8c02" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Seguimiento;
