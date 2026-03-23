import { useState } from "react";
import { X, Copy, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

export interface FoodItem {
  name: string;
  portion: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

type MealKey = "desayuno" | "media_manana" | "almuerzo" | "merienda" | "cena";
type DayKey = string;

const mealLabels: Record<MealKey, string> = {
  desayuno: "Desayuno",
  media_manana: "Media mañana",
  almuerzo: "Almuerzo",
  merienda: "Merienda",
  cena: "Cena",
};

const foodDatabase: FoodItem[] = [
  { name: "Avena con leche", portion: "1 taza", kcal: 190, protein: 7, carbs: 32, fat: 4 },
  { name: "Huevo cocido", portion: "1 pieza", kcal: 78, protein: 6, carbs: 1, fat: 5 },
  { name: "Pechuga de pollo", portion: "120g", kcal: 165, protein: 31, carbs: 0, fat: 4 },
  { name: "Arroz integral", portion: "1/2 taza", kcal: 108, protein: 2, carbs: 22, fat: 1 },
  { name: "Ensalada mixta", portion: "1 taza", kcal: 25, protein: 1, carbs: 5, fat: 0 },
  { name: "Salmón al horno", portion: "120g", kcal: 208, protein: 20, carbs: 0, fat: 13 },
  { name: "Quinoa", portion: "1/2 taza", kcal: 111, protein: 4, carbs: 20, fat: 2 },
  { name: "Yogur griego", portion: "150g", kcal: 100, protein: 17, carbs: 6, fat: 1 },
  { name: "Manzana verde", portion: "1 pieza", kcal: 72, protein: 0, carbs: 19, fat: 0 },
  { name: "Almendras", portion: "15g", kcal: 87, protein: 3, carbs: 3, fat: 7 },
  { name: "Tortilla de nopal", portion: "2 piezas", kcal: 40, protein: 2, carbs: 6, fat: 1 },
  { name: "Aguacate", portion: "1/4 pieza", kcal: 80, protein: 1, carbs: 4, fat: 7 },
  { name: "Brócoli al vapor", portion: "1 taza", kcal: 55, protein: 4, carbs: 11, fat: 1 },
  { name: "Camote horneado", portion: "100g", kcal: 90, protein: 2, carbs: 21, fat: 0 },
  { name: "Atún en agua", portion: "1 lata", kcal: 116, protein: 26, carbs: 0, fat: 1 },
  { name: "Pan integral", portion: "1 rebanada", kcal: 69, protein: 4, carbs: 12, fat: 1 },
  { name: "Queso panela", portion: "40g", kcal: 72, protein: 7, carbs: 1, fat: 5 },
  { name: "Espinacas", portion: "1 taza", kcal: 7, protein: 1, carbs: 1, fat: 0 },
  { name: "Lenteja cocida", portion: "1/2 taza", kcal: 115, protein: 9, carbs: 20, fat: 0 },
  { name: "Plátano", portion: "1 pieza", kcal: 105, protein: 1, carbs: 27, fat: 0 },
];

const defaultPlan: Record<DayKey, Record<MealKey, FoodItem[]>> = {
  Lunes: {
    desayuno: [foodDatabase[0], foodDatabase[1], foodDatabase[19]],
    media_manana: [foodDatabase[8], foodDatabase[9]],
    almuerzo: [foodDatabase[2], foodDatabase[3], foodDatabase[4]],
    merienda: [foodDatabase[7]],
    cena: [foodDatabase[18], foodDatabase[12]],
  },
  Martes: {
    desayuno: [foodDatabase[1], foodDatabase[10], foodDatabase[17]],
    media_manana: [foodDatabase[7], foodDatabase[8]],
    almuerzo: [foodDatabase[5], foodDatabase[6], foodDatabase[12]],
    merienda: [foodDatabase[11]],
    cena: [foodDatabase[14], foodDatabase[4], foodDatabase[15]],
  },
  Miércoles: {
    desayuno: [foodDatabase[0], foodDatabase[19]],
    media_manana: [foodDatabase[9], foodDatabase[8]],
    almuerzo: [foodDatabase[2], foodDatabase[13], foodDatabase[12]],
    merienda: [foodDatabase[16]],
    cena: [foodDatabase[18], foodDatabase[4]],
  },
  Jueves: {
    desayuno: [foodDatabase[15], foodDatabase[11], foodDatabase[1]],
    media_manana: [foodDatabase[8], foodDatabase[9]],
    almuerzo: [foodDatabase[2], foodDatabase[3], foodDatabase[10]],
    merienda: [foodDatabase[7]],
    cena: [foodDatabase[14], foodDatabase[12], foodDatabase[11]],
  },
  Viernes: {
    desayuno: [foodDatabase[1], foodDatabase[10], foodDatabase[16]],
    media_manana: [foodDatabase[19], foodDatabase[16]],
    almuerzo: [foodDatabase[5], foodDatabase[3], foodDatabase[4]],
    merienda: [foodDatabase[8]],
    cena: [foodDatabase[18], foodDatabase[12], foodDatabase[17]],
  },
};

const meals: MealKey[] = ["desayuno", "media_manana", "almuerzo", "merienda", "cena"];

interface Props {
  activeDays: string[];
  plan: Record<DayKey, Record<MealKey, FoodItem[]>>;
  onPlanChange: (plan: Record<DayKey, Record<MealKey, FoodItem[]>>) => void;
}

function FoodSearch({ onAdd }: { onAdd: (food: FoodItem) => void }) {
  const [query, setQuery] = useState("");
  const results = query.length > 1
    ? foodDatabase.filter((f) => f.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
    : [];

  return (
    <div className="space-y-1">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Agregar alimento..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-7 pl-7 text-[11px] bg-muted/50"
        />
      </div>
      {results.length > 0 && (
        <div className="rounded-md border border-border bg-card shadow-lg max-h-32 overflow-y-auto">
          {results.map((f, i) => (
            <button
              key={i}
              onClick={() => { onAdd(f); setQuery(""); }}
              className="w-full text-left px-2 py-1.5 text-[11px] text-foreground hover:bg-muted/50 flex justify-between"
            >
              <span>{f.name}</span>
              <span className="text-muted-foreground">{f.kcal} kcal</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function WeeklyPlanGrid({ activeDays, plan, onPlanChange }: Props) {
  const days = activeDays.length > 0 ? activeDays : Object.keys(defaultPlan);

  const removeFood = (day: string, meal: MealKey, index: number) => {
    const updated = { ...plan };
    updated[day] = { ...updated[day] };
    updated[day][meal] = updated[day][meal].filter((_, i) => i !== index);
    onPlanChange(updated);
  };

  const addFood = (day: string, meal: MealKey, food: FoodItem) => {
    const updated = { ...plan };
    updated[day] = { ...updated[day] };
    updated[day][meal] = [...(updated[day][meal] || []), food];
    onPlanChange(updated);
  };

  const copyMeal = (fromDay: string, meal: MealKey) => {
    const updated = { ...plan };
    days.forEach((d) => {
      if (d !== fromDay) {
        updated[d] = { ...updated[d] };
        updated[d][meal] = [...(plan[fromDay]?.[meal] || [])];
      }
    });
    onPlanChange(updated);
    toast.success(`${mealLabels[meal]} de ${fromDay} copiado a los demás días`);
  };

  const getMealKcal = (day: string, meal: MealKey) =>
    (plan[day]?.[meal] || []).reduce((s, f) => s + f.kcal, 0);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold text-foreground">Plan Semanal</h3>
        <p className="text-xs text-muted-foreground">Asignación de alimentos por día y tiempo de comida</p>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header */}
          <div className="grid border-b border-border" style={{ gridTemplateColumns: `140px repeat(${days.length}, 1fr)` }}>
            <div className="px-3 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Comida</div>
            {days.map((d) => (
              <div key={d} className="px-3 py-2.5 text-xs font-semibold text-primary text-center border-l border-border">{d}</div>
            ))}
          </div>

          {/* Rows */}
          {meals.map((meal) => (
            <div
              key={meal}
              className="grid border-b border-border last:border-0"
              style={{ gridTemplateColumns: `140px repeat(${days.length}, 1fr)` }}
            >
              <div className="px-3 py-3 text-xs font-medium text-foreground flex items-start pt-3">
                {mealLabels[meal]}
              </div>
              {days.map((day) => {
                const foods = plan[day]?.[meal] || [];
                const totalKcal = getMealKcal(day, meal);
                return (
                  <div key={day} className="px-2 py-2 border-l border-border space-y-1.5 min-h-[100px]">
                    {foods.map((f, i) => (
                      <div key={i} className="flex items-center gap-1 group">
                        <span className="text-[11px] text-foreground flex-1 truncate">{f.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{f.kcal}</span>
                        <button
                          onClick={() => removeFood(day, meal, i)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        >
                          <X className="h-3 w-3 text-muted-foreground hover:text-accent" />
                        </button>
                      </div>
                    ))}
                    <FoodSearch onAdd={(f) => addFood(day, meal, f)} />
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-semibold text-primary">{totalKcal} kcal</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="text-muted-foreground hover:text-primary transition-colors">
                            <Copy className="h-3 w-3" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2" align="end">
                          <button
                            onClick={() => copyMeal(day, meal)}
                            className="text-xs text-foreground hover:text-primary px-2 py-1"
                          >
                            Copiar a todos los días
                          </button>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { defaultPlan, meals, mealLabels };
export type { MealKey, DayKey };
