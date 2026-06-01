import { ChevronLeft, ChevronRight, Shuffle, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiRequest } from "@/lib/api";
import { RecetaDetailModal } from "@/components/alimentos/TabRecetas";

export interface FoodItem {
  id_menu_diario?: number | null;
  id_plato?: number | null;
  mealKey?: MealKey;
  name: string;
  portion: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  description?: string;
  ingredients?: string[];
  preparation?: string;
  recipeDetail?: any;
}

type MealKey = "desayuno" | "media_manana" | "almuerzo" | "merienda" | "cena";
type DayKey = string;

const mealLabels: Record<MealKey, string> = {
  desayuno: "Desayuno",
  media_manana: "Media Mañana",
  almuerzo: "Almuerzo",
  merienda: "Media Tarde",
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
  Lunes: { desayuno: [], media_manana: [], almuerzo: [], merienda: [], cena: [] },
  Martes: { desayuno: [], media_manana: [], almuerzo: [], merienda: [], cena: [] },
  Miércoles: { desayuno: [], media_manana: [], almuerzo: [], merienda: [], cena: [] },
  Jueves: { desayuno: [], media_manana: [], almuerzo: [], merienda: [], cena: [] },
  Viernes: { desayuno: [], media_manana: [], almuerzo: [], merienda: [], cena: [] },
};

const meals: MealKey[] = ["desayuno", "media_manana", "almuerzo", "merienda", "cena"];

interface Props {
  activeDays: string[];
  plan: Record<DayKey, Record<MealKey, FoodItem[]>>;
  onPlanChange: (plan: Record<DayKey, Record<MealKey, FoodItem[]>>) => void;
  onWeekChange?: (weekOffset: number) => void;
  currentWeek?: number;
  maxWeeks?: number;
  weekLabel?: string;
  onSelectExistingRecipe?: (payload: { day: string; meal: MealKey; food: FoodItem; currentKcal: number }) => void;
  onGenerateRecipe?: (payload: { day: string; meal: MealKey; food: FoodItem; currentKcal: number }) => void;
}

// Food search removed per request (no "Agregar alimento" inputs)

export function WeeklyPlanGrid({ 
  activeDays, 
  plan, 
  onPlanChange,
  onWeekChange,
  currentWeek = 0,
  maxWeeks = 4,
  weekLabel = "Semana Actual",
  onSelectExistingRecipe,
  onGenerateRecipe,
}: Props) {
  const [localWeek, setLocalWeek] = useState(currentWeek);
  const [selectedRecipe, setSelectedRecipe] = useState<FoodItem | null>(null);
  const [recipeDetail, setRecipeDetail] = useState<any | null>(null);
  const canNavigateWeeks = typeof onWeekChange === "function" && maxWeeks > 1;

  useEffect(() => {
    setLocalWeek(currentWeek);
  }, [currentWeek]);

  const days = activeDays.length > 0 ? activeDays : Object.keys(defaultPlan);

  const handlePreviousWeek = () => {
    if (localWeek > 0) {
      setLocalWeek(localWeek - 1);
      onWeekChange?.(localWeek - 1);
    }
  };

  const handleNextWeek = () => {
    if (localWeek < maxWeeks - 1) {
      setLocalWeek(localWeek + 1);
      onWeekChange?.(localWeek + 1);
    }
  };

  const getWeekDisplayLabel = () => {
    if (weekLabel) return weekLabel;
    if (localWeek === 0) return "Semana Actual";
    if (localWeek === 1) return "Próxima Semana";
    return `Semana ${localWeek + 1}`;
  };

  const getMealKcal = (day: string, meal: MealKey) =>
    (plan[day]?.[meal] || []).reduce((s, f) => s + f.kcal, 0);

  const openRecipeChange = (day: string, meal: MealKey, foods: FoodItem[], currentKcal: number, mode: "existing" | "ai") => {
    const food = foods[0];
    if (!food) return;
    const payload = { day, meal, food, currentKcal };
    if (mode === "existing") onSelectExistingRecipe?.(payload);
    else onGenerateRecipe?.(payload);
  };

  const getRecipeName = (foods: FoodItem[]) => {
    if (foods.length === 0) return "Comida no asignada aun.";
    if (foods.length === 1) return foods[0].name;

    const first = foods[0].name;
    const second = foods[1].name.toLowerCase();
    return `${first} con ${second}`;
  };

  const openRecipeInfo = async (food: FoodItem) => {
    setSelectedRecipe(food);
    setRecipeDetail(food.recipeDetail ?? null);
    if (!food.id_plato) return;
    const token = localStorage.getItem("dkfitt-access-token");
    if (!token) return;
    try {
      const res = await apiRequest<any>(`/dishes/${food.id_plato}`, { method: "GET", accessToken: token });
      const detail = res?.data ?? res;
      const base = detail?.plato ?? detail;
      setRecipeDetail({
        ...base,
        ingredientes: detail?.ingredientes ?? base?.ingredientes ?? food.recipeDetail?.ingredientes ?? [],
        aptitudes: detail?.aptitudes ?? base?.aptitudes ?? food.recipeDetail?.aptitudes ?? [],
      });
    } catch {
      // Keep the partial recipe information already available in the plan.
    }
  };

  const modalRecipe = recipeDetail || (selectedRecipe ? {
    id_plato: selectedRecipe.id_plato ?? 0,
    nombre: selectedRecipe.name,
    descripcion: selectedRecipe.description ?? null,
    modo_preparacion: selectedRecipe.preparation ?? "",
    calorias_totales: selectedRecipe.kcal,
    proteinas_totales: selectedRecipe.protein,
    carbohidratos_totales: selectedRecipe.carbs,
    grasas_totales: selectedRecipe.fat,
    tiempo_preparacion_min: null,
    generado_por_ia: false,
    activo: true,
    id_tiempo_comida: null,
    imagen_url: null,
    created_at: new Date().toISOString(),
    ingredientes: [],
  } : null);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Plan Semanal</h3>
          <p className="text-xs text-muted-foreground">Asignación de alimentos por día y tiempo de comida</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{getWeekDisplayLabel()}</span>
          <button
            onClick={handlePreviousWeek}
            disabled={!canNavigateWeeks || localWeek === 0}
            className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
            title="Semana anterior"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={handleNextWeek}
            disabled={!canNavigateWeeks || localWeek >= maxWeeks - 1}
            className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
            title="Próxima semana"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
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
                const recipeName = getRecipeName(foods);
                const isEmpty = foods.length === 0;
                return (
                  <div key={day} className="px-2 py-2 border-l border-border min-h-[100px]">
                    <div className="h-full rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5 flex flex-col justify-between gap-2">
                      <button
                        type="button"
                        disabled={isEmpty}
                        onClick={() => !isEmpty && void openRecipeInfo(foods[0])}
                        className={`text-left text-xs font-medium leading-tight ${isEmpty ? "text-muted-foreground cursor-default" : "text-foreground hover:text-primary"} line-clamp-2`}
                      >
                        {recipeName}
                      </button>
                      {!isEmpty && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-primary">{totalKcal} kcal</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-muted-foreground hover:text-primary transition-colors" title="Cambiar receta">
                                <Shuffle className="h-3.5 w-3.5" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-52 p-2" align="end">
                              <button
                                onClick={() => openRecipeChange(day, meal, foods, totalKcal, "existing")}
                                className="w-full rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-muted hover:text-primary"
                              >
                                <Shuffle className="mr-2 inline h-3.5 w-3.5" />
                                Seleccionar existente
                              </button>
                              <button
                                onClick={() => openRecipeChange(day, meal, foods, totalKcal, "ai")}
                                className="w-full rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-muted hover:text-primary"
                              >
                                <Sparkles className="mr-2 inline h-3.5 w-3.5" />
                                Generar con IA
                              </button>
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <Dialog open={!!selectedRecipe} onOpenChange={(open) => {
        if (!open) {
          setSelectedRecipe(null);
          setRecipeDetail(null);
        }
      }}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
          {modalRecipe && (
            <RecetaDetailModal
              receta={modalRecipe}
              tiemposMap={{ 1: "Desayuno", 2: "Media MaÃ±ana", 3: "Almuerzo", 4: "Media Tarde", 5: "Cena" }}
              onClose={() => setSelectedRecipe(null)}
              readOnly
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { defaultPlan, meals, mealLabels };
export type { MealKey, DayKey };
