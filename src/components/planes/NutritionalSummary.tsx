import { Progress } from "@/components/ui/progress";
import type { FoodItem, MealKey, DayKey } from "./WeeklyPlanGrid";

interface Props {
  plan: Record<DayKey, Record<MealKey, FoodItem[]>>;
  activeDays: string[];
  targetKcal: number;
}

export function NutritionalSummary({ plan, activeDays, targetKcal }: Props) {
  const days = activeDays.length > 0 ? activeDays : Object.keys(plan);

  const dailyTotals = days.map((day) => {
    const dayPlan = plan[day];
    if (!dayPlan) return { day, kcal: 0, protein: 0, carbs: 0, fat: 0 };
    const all = Object.values(dayPlan).flat();
    return {
      day,
      kcal: all.reduce((s, f) => s + f.kcal, 0),
      protein: all.reduce((s, f) => s + f.protein, 0),
      carbs: all.reduce((s, f) => s + f.carbs, 0),
      fat: all.reduce((s, f) => s + f.fat, 0),
    };
  });

  const avg = {
    kcal: Math.round(dailyTotals.reduce((s, d) => s + d.kcal, 0) / (dailyTotals.length || 1)),
    protein: Math.round(dailyTotals.reduce((s, d) => s + d.protein, 0) / (dailyTotals.length || 1)),
    carbs: Math.round(dailyTotals.reduce((s, d) => s + d.carbs, 0) / (dailyTotals.length || 1)),
    fat: Math.round(dailyTotals.reduce((s, d) => s + d.fat, 0) / (dailyTotals.length || 1)),
  };

  const kcalPct = Math.min(Math.round((avg.kcal / targetKcal) * 100), 120);
  const deviation = avg.kcal - targetKcal;
  const isOver = deviation > 50;
  const isUnder = deviation < -50;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <h3 className="text-sm font-semibold text-foreground">Resumen Nutricional</h3>

      {/* Target comparison */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Objetivo: {targetKcal.toLocaleString()} kcal/día</span>
          <span className={`font-semibold ${isOver || isUnder ? "text-accent" : "text-primary"}`}>
            {avg.kcal.toLocaleString()} kcal
          </span>
        </div>
        <Progress value={kcalPct} className="h-3" />
        <p className={`text-[11px] font-medium ${isOver || isUnder ? "text-accent" : "text-primary"}`}>
          {isOver ? `+${deviation} kcal sobre objetivo` : isUnder ? `${deviation} kcal bajo objetivo` : "Dentro del rango objetivo"}
        </p>
      </div>

      {/* Macros */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Macronutrientes (promedio diario)</p>
        {[
          { label: "Proteínas", value: avg.protein, unit: "g", pct: Math.round((avg.protein * 4 / avg.kcal) * 100) || 0, target: 30 },
          { label: "Carbohidratos", value: avg.carbs, unit: "g", pct: Math.round((avg.carbs * 4 / avg.kcal) * 100) || 0, target: 45 },
          { label: "Grasas", value: avg.fat, unit: "g", pct: Math.round((avg.fat * 9 / avg.kcal) * 100) || 0, target: 25 },
        ].map((m) => {
          const diff = Math.abs(m.pct - m.target);
          const isDeviated = diff > 8;
          return (
            <div key={m.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground">{m.label}</span>
                <span className="text-muted-foreground">{m.value}{m.unit} · <span className={isDeviated ? "text-accent font-semibold" : "text-primary"}>{m.pct}%</span> (meta: {m.target}%)</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isDeviated ? "bg-accent" : "bg-primary"}`}
                  style={{ width: `${Math.min(m.pct * (100 / Math.max(m.target * 2, 1)), 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Per day breakdown */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Calorías por día</p>
        {dailyTotals.map((d) => {
          const pct = Math.round((d.kcal / targetKcal) * 100);
          const off = Math.abs(d.kcal - targetKcal) > 50;
          return (
            <div key={d.day} className="flex items-center gap-3">
              <span className="text-[11px] text-muted-foreground w-12 shrink-0">{d.day.slice(0, 3)}</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-full rounded-full ${off ? "bg-accent" : "bg-primary"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <span className={`text-[11px] font-medium w-16 text-right ${off ? "text-accent" : "text-foreground"}`}>{d.kcal} kcal</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
