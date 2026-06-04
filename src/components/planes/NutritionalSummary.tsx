import type { FoodItem, MealKey, DayKey } from "./WeeklyPlanGrid";

interface Props {
  plan: Record<DayKey, Record<MealKey, FoodItem[]>>;
  activeDays: string[];
  targetKcal: number | null;
  showPerDay?: boolean;
}

export function NutritionalSummary({ plan, activeDays, targetKcal, showPerDay = true }: Props) {
  const days = activeDays.length > 0 ? activeDays : Object.keys(plan);
  const hasTarget = typeof targetKcal === "number" && Number.isFinite(targetKcal) && targetKcal > 0;

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

  const kcalPct = hasTarget ? Math.min(Math.round((avg.kcal / targetKcal) * 100), 120) : 0;
  const deviation = hasTarget ? avg.kcal - targetKcal : 0;
  const isOver = deviation > 50;
  const isUnder = deviation < -50;
  const formatObjectiveDelta = (pct: number) => {
    const diff = pct - 100;
    if (diff > 0) return `${diff}% por encima del objetivo`;
    if (diff < 0) return `${Math.abs(diff)}% debajo del objetivo`;
    return "Dentro del objetivo";
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5 h-full">
      <h3 className="text-sm font-semibold text-foreground">Resumen Nutricional</h3>

      {/* Target comparison */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Objetivo: {hasTarget ? `${targetKcal.toLocaleString()} kcal/día` : "No calculado aun"}
          </span>
          <span className={`font-semibold ${isOver || isUnder ? "text-[#A95F2F] dark:text-[#FA9C5C]" : "text-[#5F7428] dark:text-[#C5EB6F]"}`}>
            {avg.kcal.toLocaleString()} kcal
          </span>
        </div>
        {hasTarget && (
          <>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-[#A8D1E7] transition-all duration-300"
                style={{ width: `${Math.min(kcalPct, 100)}%` }}
              />
            </div>
            <p className={`text-[11px] font-medium ${isOver || isUnder ? "text-[#A95F2F] dark:text-[#FA9C5C]" : "text-[#5F7428] dark:text-[#C5EB6F]"}`}>
              {isOver ? `+${deviation} kcal sobre objetivo` : isUnder ? `${deviation} kcal bajo objetivo` : "Dentro del rango objetivo"}
            </p>
          </>
        )}
      </div>

      {/* Macros */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Macronutrientes (promedio diario)</p>
        {[
          { label: "Proteínas", value: avg.protein, unit: "g", pct: Math.round((avg.protein * 4 / avg.kcal) * 100) || 0, target: 30, color: "bg-[#FA9C5C]", textColor: "text-[#A95F2F] dark:text-[#FA9C5C]" },
          { label: "Carbohidratos", value: avg.carbs, unit: "g", pct: Math.round((avg.carbs * 4 / avg.kcal) * 100) || 0, target: 45, color: "bg-[#F7CA5E]", textColor: "text-[#8A6B1F] dark:text-[#F7CA5E]" },
          { label: "Grasas", value: avg.fat, unit: "g", pct: Math.round((avg.fat * 9 / avg.kcal) * 100) || 0, target: 25, color: "bg-[#E6E6E6]", textColor: "text-[#6B6B6B] dark:text-[#E6E6E6]" },
        ].map((m) => (
            <div key={m.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground">{m.label}</span>
                <span className="text-muted-foreground">{m.value}{m.unit} · <span className={`${m.textColor} font-semibold`}>{m.pct}%</span> (meta: {m.target}%)</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${m.color}`}
                  style={{ width: `${Math.min(m.pct * (100 / Math.max(m.target * 2, 1)), 100)}%` }}
                />
              </div>
            </div>
        ))}
      </div>

      {/* Per day breakdown */}
      {showPerDay && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Calorías por día</p>
          {dailyTotals.map((d) => {
            const pct = hasTarget ? Math.round((d.kcal / targetKcal) * 100) : 0;
            const off = hasTarget ? Math.abs(d.kcal - targetKcal) > 50 : false;
            return (
              <div key={d.day} className="flex items-center gap-3">
                <span className="text-[11px] text-muted-foreground w-12 shrink-0">{d.day.slice(0, 3)}</span>
                <div className="flex-1">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-[#C5EB6F]" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  {hasTarget && (
                    <p className="mt-1 text-[10px] text-muted-foreground">{formatObjectiveDelta(pct)}</p>
                  )}
                </div>
                <span className={`text-[11px] font-medium w-16 text-right ${off ? "text-[#A95F2F] dark:text-[#FA9C5C]" : "text-foreground"}`}>{d.kcal} kcal</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

