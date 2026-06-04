import { ChevronLeft, ChevronRight, Coffee, CupSoda, Moon, Salad, Shuffle, Sparkles, Utensils } from "lucide-react";
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

const mealVisuals: Record<MealKey, { icon: typeof Coffee }> = {
  desayuno: { icon: Coffee },
  media_manana: { icon: CupSoda },
  almuerzo: { icon: Utensils },
  merienda: { icon: Salad },
  cena: { icon: Moon },
};

const dayTone: Record<string, { pill: string; card: string; text: string }> = {
  Lunes: { pill: "bg-[#C5EB6F]", card: "border-[#C5EB6F]/55 bg-[#C5EB6F]/20", text: "text-[#3F5512]" },
  Martes: { pill: "bg-[#F7CA5E]", card: "border-[#F7CA5E]/55 bg-[#F7CA5E]/20", text: "text-[#8A6B1F]" },
  Miércoles: { pill: "bg-[#FA9C5C]", card: "border-[#FA9C5C]/55 bg-[#FA9C5C]/20", text: "text-[#A95F2F]" },
  Miercoles: { pill: "bg-[#FA9C5C]", card: "border-[#FA9C5C]/55 bg-[#FA9C5C]/20", text: "text-[#A95F2F]" },
  Jueves: { pill: "bg-[#A8D1E7]", card: "border-[#A8D1E7]/55 bg-[#A8D1E7]/20", text: "text-[#376378]" },
  Viernes: { pill: "bg-[#F49C9C]", card: "border-[#F49C9C]/55 bg-[#F49C9C]/20", text: "text-[#9A4B4B]" },
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

  const getDayKcal = (day: string) =>
    meals.reduce((sum, meal) => sum + getMealKcal(day, meal), 0);

  const getDayTone = (day: string) =>
    dayTone[day] ?? { pill: "bg-[#E6E6E6]", card: "border-[#E6E6E6]/70 bg-[#E6E6E6]/25", text: "text-[#5F5F5F]" };

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
      <div className="border-b border-border px-5 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Plan Semanal</h3>
          <p className="text-xs text-muted-foreground">Asignación de alimentos por día y tiempo de comida</p>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 shadow-[0_8px_18px_rgba(37,48,39,0.08)]">
          <button
            onClick={handlePreviousWeek}
            disabled={!canNavigateWeeks || localWeek === 0}
            className="rounded-full border border-border bg-background p-1.5 transition-colors hover:bg-[#F7CA5E]/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-background"
            title="Semana anterior"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="min-w-28 text-center text-xs font-semibold text-foreground">{getWeekDisplayLabel()}</span>
          <button
            onClick={handleNextWeek}
            disabled={!canNavigateWeeks || localWeek >= maxWeeks - 1}
            className="rounded-full border border-border bg-background p-1.5 transition-colors hover:bg-[#F7CA5E]/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-background"
            title="Próxima semana"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto p-4">
        <div className="min-w-[980px]">
          <div className="grid gap-3" style={{ gridTemplateColumns: `170px repeat(${days.length}, minmax(150px, 1fr))` }}>
            <div />
            {days.map((day) => {
              const tone = getDayTone(day);
              return (
                <div key={`${day}-header`} className="flex justify-center">
                  <div className={`rounded-full px-4 py-2 text-center text-xs font-bold text-[#253027] ${tone.pill}`}>
                    <span className="block">{day}</span>
                    <span className="text-[11px] font-semibold">{getDayKcal(day).toLocaleString()} kcal</span>
                  </div>
                </div>
              );
            })}

            {meals.map((meal) => {
              const MealIcon = mealVisuals[meal].icon;
              return (
                <div key={meal} className="contents">
                  <div className="flex min-h-[108px] items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_8px_18px_rgba(37,48,39,0.06)]">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7CA5E]/25 text-[#253027]">
                      <MealIcon className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">{mealLabels[meal]}</p>
                  </div>

                  {days.map((day) => {
                    const foods = plan[day]?.[meal] || [];
                    const totalKcal = getMealKcal(day, meal);
                    const recipeName = getRecipeName(foods);
                    const isEmpty = foods.length === 0;
                    const tone = getDayTone(day);

                    return (
                      <div key={`${day}-${meal}`} className={`min-h-[108px] rounded-2xl border p-3 ${tone.card}`}>
                        {isEmpty ? (
                          <div className="flex h-full min-h-[82px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-white/30 text-xs text-muted-foreground dark:bg-background/25">
                            ---
                          </div>
                        ) : (
                          <div className="flex h-full flex-col justify-between gap-3 rounded-xl bg-white/45 p-3 dark:bg-background/35">
                            <button
                              type="button"
                              onClick={() => void openRecipeInfo(foods[0])}
                              className="line-clamp-2 text-left text-xs font-semibold leading-relaxed text-foreground transition-colors hover:text-[#8A6B1F] dark:hover:text-[#F7CA5E]"
                            >
                              {recipeName}
                            </button>
                            <div className="flex items-center justify-between gap-2">
                              <span className={`w-fit rounded-full bg-white/75 px-2.5 py-1 text-[10px] font-bold ${tone.text} dark:bg-background/70`}>
                                {totalKcal.toLocaleString()} kcal
                              </span>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-muted-foreground transition-colors hover:bg-[#F7CA5E] hover:text-[#253027] dark:bg-background/70"
                                    title="Cambiar receta"
                                  >
                                    <Shuffle className="h-3.5 w-3.5" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-52 p-2" align="end">
                                  <button
                                    onClick={() => openRecipeChange(day, meal, foods, totalKcal, "existing")}
                                    className="w-full rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-[#F7CA5E]/20 hover:text-[#8A6B1F] dark:hover:text-[#F7CA5E]"
                                  >
                                    <Shuffle className="mr-2 inline h-3.5 w-3.5" />
                                    Seleccionar existente
                                  </button>
                                  <button
                                    onClick={() => openRecipeChange(day, meal, foods, totalKcal, "ai")}
                                    className="w-full rounded-md px-2 py-1.5 text-left text-xs text-foreground hover:bg-[#C5EB6F]/20 hover:text-[#5F7428] dark:hover:text-[#C5EB6F]"
                                  >
                                    <Sparkles className="mr-2 inline h-3.5 w-3.5" />
                                    Generar con IA
                                  </button>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
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
              tiemposMap={{ 1: "Desayuno", 2: "Media Mañana", 3: "Almuerzo", 4: "Media Tarde", 5: "Cena" }}
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
