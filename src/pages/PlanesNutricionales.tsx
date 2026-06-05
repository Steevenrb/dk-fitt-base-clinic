import { useMemo, useState, useEffect } from "react";
import { AlertTriangle, ArrowLeft, Ban, Loader2, Power, Search, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { ApiError, apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// sonner toast import removed to avoid shadowing useToast
import { WeeklyPlanGrid, defaultPlan } from "@/components/planes/WeeklyPlanGrid";
import { NutritionalSummary } from "@/components/planes/NutritionalSummary";
import type { FoodItem, MealKey, DayKey } from "@/components/planes/WeeklyPlanGrid";

type RecipeOption = {
  id_plato: number;
  nombre: string;
  calorias_totales: number;
  id_tiempo_comida?: number | null;
  generado_por_ia?: boolean;
};

type RecipeSlot = {
  day: string;
  meal: MealKey;
  food: FoodItem;
  currentKcal: number;
};

const PLAN_STATUS_OVERRIDES_KEY = "dkfitt-plan-status-overrides";

function savePlanStatusOverride(ids: Array<number | null>, status: "activo" | "suspendido") {
  const validIds = ids.filter((id): id is number => Boolean(id));
  if (validIds.length === 0) return;
  try {
    const raw = localStorage.getItem(PLAN_STATUS_OVERRIDES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const next = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    validIds.forEach((id) => {
      next[String(id)] = status;
    });
    localStorage.setItem(PLAN_STATUS_OVERRIDES_KEY, JSON.stringify(next));
  } catch {
    localStorage.setItem(PLAN_STATUS_OVERRIDES_KEY, JSON.stringify(Object.fromEntries(validIds.map((id) => [String(id), status]))));
  }
}

const computeDailyTotals = (
  plan: Record<DayKey, Record<MealKey, FoodItem[]>>,
  activeDays: string[],
) => {
  const days = activeDays.length > 0 ? activeDays : Object.keys(plan);
  return days.map((day) => {
    const dayPlan = plan[day];
    if (!dayPlan) return { day, kcal: 0 };
    const all = Object.values(dayPlan).flat();
    return {
      day,
      kcal: all.reduce((s, f) => s + f.kcal, 0),
    };
  });
};

const formatObjectiveDelta = (pct: number) => {
  const diff = pct - 100;
  if (diff > 0) return `${diff}% por encima del objetivo`;
  if (diff < 0) return `${Math.abs(diff)}% debajo del objetivo`;
  return "Dentro del objetivo";
};

const PlanesNutricionales = () => {
  const navigate = useNavigate();
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseLocalDate = (value: string) => {
    const [year, month, day] = value.split("T")[0].split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const getLunes = () => {
    const hoy = new Date();
    const dia = hoy.getDay();
    const diff = dia === 0 ? -6 : 1 - dia;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() + diff);
    return formatLocalDate(lunes);
  };

  const getViernes = () => {
    const lunes = parseLocalDate(getLunes());
    lunes.setDate(lunes.getDate() + 4);
    return formatLocalDate(lunes);
  };

  const getProximoLunesPermitido = () => {
    const lunesActual = parseLocalDate(getLunes());
    lunesActual.setDate(lunesActual.getDate() + 7);
    return formatLocalDate(lunesActual);
  };

  const getRangosSemanasPermitidas = () => {
    const lunesActual = getLunes();
    const proximoLunes = getProximoLunesPermitido();
    return [
      { inicio: lunesActual, fin: getViernesDesdeLunes(lunesActual) },
      { inicio: proximoLunes, fin: getViernesDesdeLunes(proximoLunes) },
    ];
  };

  const getViernesDesdeLunes = (lunesIso: string) => {
    const viernes = parseLocalDate(lunesIso);
    viernes.setDate(viernes.getDate() + 4);
    return formatLocalDate(viernes);
  };

  const getWeekStart = (week: Record<string, unknown>) =>
    String(week.fecha_inicio_semana ?? week.fecha_inicio ?? week.start_date ?? "").split("T")[0];

  const getWeekEnd = (week: Record<string, unknown>) =>
    String(week.fecha_fin_semana ?? week.fecha_fin ?? week.end_date ?? "").split("T")[0];

  const { id } = useParams();
  const { toast } = useToast();
  const patientId = Number(id || 0);
  const [patientName, setPatientName] = useState<string | null>("María González");
  const [status, setStatus] = useState<"activo" | "suspendido" | "pendiente" | "inactivo">("pendiente");
  const [profileId, setProfileId] = useState<number | null>(null);
  const [planId, setPlanId] = useState<number | null>(null);
  const [weekId, setWeekId] = useState<number | null>(null);
  const [planWeeks, setPlanWeeks] = useState<Array<{ id: number; start?: string; end?: string; label: string }>>([]);
  const [loadingPlanWeeks, setLoadingPlanWeeks] = useState(false);
  const [evaluationId, setEvaluationId] = useState<number | null>(null);
  const [generatingWeek, setGeneratingWeek] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("Preparando generacion...");
  const [activeDays, setActiveDays] = useState(["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]);
  const [plan, setPlan] = useState<Record<DayKey, Record<MealKey, FoodItem[]>>>(defaultPlan);
  const [targetKcal, setTargetKcal] = useState<number | null>(null);
  const [planGeneratedDate, setPlanGeneratedDate] = useState("--");
  const [activatingPlan, setActivatingPlan] = useState(false);
  const [modalActivar, setModalActivar] = useState(false);
  const [fechaActivacion, setFechaActivacion] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [modalGenerarSemana, setModalGenerarSemana] = useState(false);
  const [fechaInicioSemana, setFechaInicioSemana] = useState<string>(getLunes());
  const [fechaFinSemana, setFechaFinSemana] = useState<string>(getViernes());
  const [regenerarSemana, setRegenerarSemana] = useState(false);
  const [recipeSlot, setRecipeSlot] = useState<RecipeSlot | null>(null);
  const [modalRecetaExistente, setModalRecetaExistente] = useState(false);
  const [modalGenerarReceta, setModalGenerarReceta] = useState(false);
  const [recetasCatalogo, setRecetasCatalogo] = useState<RecipeOption[]>([]);
  const [busquedaReceta, setBusquedaReceta] = useState("");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [changingRecipe, setChangingRecipe] = useState(false);

  const statusConfig = {
    activo: { label: "Activo", className: "bg-[#C5EB6F]/30 text-[#253027] border-[#C5EB6F]/70" },
    suspendido: { label: "Suspendido", className: "bg-[#FA9C5C]/25 text-[#253027] border-[#FA9C5C]/60" },
    pendiente: { label: "Pendiente", className: "bg-[#F7CA5E]/30 text-[#253027] border-[#F7CA5E]/70" },
    inactivo: { label: "Inactivo", className: "bg-[#E6E6E6]/70 text-[#253027]/70 border-[#D2D2D2]" },
  };

  const sc = statusConfig[status];

  const parseNumber = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const cleaned = value.replace(/[^\x00-\x7F\d,.-]/g, "").replace(/,/g, "").trim();
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const pickCaloriesFromEvaluation = (evaluation: Record<string, unknown> | null) => {
    if (!evaluation) return null;
    const keys = [
      "calorias_diarias_calculadas",
      "calorias_diarias_recomendadas",
      "calorias_recomendadas",
      "calorias_objetivo",
      "energia_recomendada_kcal",
    ];
    for (const key of keys) {
      const value = parseNumber(evaluation[key]);
      if (value !== null) return Math.round(value);
    }
    return null;
  };

  const daysOrder = useMemo(() => ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"], []);

  const mealKeyByLabel: Record<string, MealKey> = {
    desayuno: "desayuno",
    "media manana": "media_manana",
    "media tarde": "merienda",
    "refrigerio manana": "media_manana",
    "refrigerio tarde": "merienda",
    almuerzo: "almuerzo",
    merienda: "merienda",
    cena: "cena",
  };

  const mealIdByKey: Record<MealKey, number> = {
    desayuno: 1,
    media_manana: 2,
    almuerzo: 3,
    merienda: 4,
    cena: 5,
  };

  const mealApiNameByKey: Record<MealKey, string> = {
    desayuno: "desayuno",
    media_manana: "media_manana",
    almuerzo: "almuerzo",
    merienda: "media_tarde",
    cena: "cena",
  };

  const normalizeText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[_-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const normalizeMealLabel = (value: string) => normalizeText(value);

  const getMenuLabel = (menu: any) => {
    if (!menu) return "";
    if (typeof menu.tiempo_comida === "string") return menu.tiempo_comida;
    if (menu.tiempo_comida && typeof menu.tiempo_comida === "object") {
      return String(menu.tiempo_comida.nombre ?? menu.tiempo_comida.label ?? menu.tiempo_comida.codigo ?? "");
    }
    return String(menu.tiempoComida ?? menu.comida ?? menu.meal ?? "");
  };

  const getMenuName = (menu: any) =>
    String(
      menu?.nombre_plato
      ?? menu?.plato?.nombre
      ?? menu?.plato
      ?? menu?.receta?.nombre
      ?? menu?.nombre
      ?? "Receta generada",
    );

  const getMenuCalories = (menu: any) => Number(menu?.calorias_aportadas ?? menu?.calorias ?? menu?.kcal ?? menu?.energia ?? 0);

  const getMenuMacro = (menu: any, keys: string[]) => {
    const sources = [menu, menu?.plato, menu?.receta, menu?.detalle, menu?.nutricion, menu?.macros].filter(Boolean);
    for (const source of sources) {
      for (const key of keys) {
        const value = toNumber(source?.[key]);
        if (typeof value === "number") return value;
      }
    }
    return 0;
  };

  const normalizeStringList = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value
        .map((item) => typeof item === "string" ? item : String((item as any)?.nombre ?? (item as any)?.name ?? (item as any)?.descripcion ?? ""))
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (typeof value === "string") {
      return value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  };

  const getMenuDescription = (menu: any) =>
    String(menu?.descripcion ?? menu?.plato?.descripcion ?? menu?.receta?.descripcion ?? menu?.detalle?.descripcion ?? "").trim();

  const getMenuIngredients = (menu: any) =>
    normalizeStringList(menu?.ingredientes ?? menu?.plato?.ingredientes ?? menu?.receta?.ingredientes ?? menu?.detalle?.ingredientes);

  const getMenuPreparation = (menu: any) =>
    String(
      menu?.preparacion
      ?? menu?.instrucciones
      ?? menu?.plato?.preparacion
      ?? menu?.plato?.instrucciones
      ?? menu?.receta?.preparacion
      ?? menu?.receta?.instrucciones
      ?? "",
    ).trim();

  const getMenuId = (menu: any) => toNumber(menu?.id_menu_diario ?? menu?.id_menu ?? menu?.menu_diario_id ?? menu?.id);

  const getMenuDishId = (menu: any) => toNumber(menu?.id_plato ?? menu?.plato?.id_plato ?? menu?.receta?.id_plato ?? menu?.plato_id);

  const calculateMacrosFromIngredients = (ingredients: any[] = []) => {
    const totals = ingredients.reduce((acc, item) => {
      const grams = toNumber(item?.cantidad_g ?? item?.cantidad ?? item?.gramos) ?? 0;
      return {
        protein: acc.protein + ((toNumber(item?.proteinas ?? item?.proteina ?? item?.protein) ?? 0) * grams / 100),
        carbs: acc.carbs + ((toNumber(item?.carbohidratos ?? item?.carbohidrato ?? item?.carbs ?? item?.carbohydrates) ?? 0) * grams / 100),
        fat: acc.fat + ((toNumber(item?.grasas ?? item?.grasa ?? item?.fat ?? item?.lipidos) ?? 0) * grams / 100),
      };
    }, { protein: 0, carbs: 0, fat: 0 });

    return {
      protein: Math.round(totals.protein * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
    };
  };

  const buildFoodFromDishDetail = (food: FoodItem, detail: any): FoodItem => {
    const base = detail?.plato ?? detail ?? {};
    const ingredients = detail?.ingredientes ?? base?.ingredientes ?? [];
    const ingredientMacros = Array.isArray(ingredients) ? calculateMacrosFromIngredients(ingredients) : { protein: 0, carbs: 0, fat: 0 };
    const protein = getMenuMacro(base, ["proteinas_totales", "proteinas_g", "proteinas", "proteina", "protein"]);
    const carbs = getMenuMacro(base, ["carbohidratos_totales", "carbohidratos_g", "carbohidratos", "carbs", "carbohydrates"]);
    const fat = getMenuMacro(base, ["grasas_totales", "grasas_g", "grasas", "grasa", "fat"]);

    return {
      ...food,
      name: String(base?.nombre ?? food.name),
      kcal: Math.round(Number(base?.calorias_totales ?? base?.calorias ?? food.kcal ?? 0)),
      protein: protein || ingredientMacros.protein,
      carbs: carbs || ingredientMacros.carbs,
      fat: fat || ingredientMacros.fat,
      description: String(base?.descripcion ?? food.description ?? "").trim(),
      preparation: String(base?.modo_preparacion ?? base?.preparacion ?? base?.instrucciones ?? food.preparation ?? "").trim(),
      ingredients: normalizeStringList(ingredients),
      recipeDetail: {
        ...base,
        ingredientes: Array.isArray(ingredients) ? ingredients : [],
        aptitudes: detail?.aptitudes ?? base?.aptitudes ?? [],
        proteinas_totales: protein || ingredientMacros.protein,
        carbohidratos_totales: carbs || ingredientMacros.carbs,
        grasas_totales: fat || ingredientMacros.fat,
      },
    };
  };

  const enrichPlanWithDishDetails = async (sourcePlan: Record<DayKey, Record<MealKey, FoodItem[]>>, token: string) => {
    const details = new Map<number, any>();
    const dishIds = Array.from(new Set(
      Object.values(sourcePlan)
        .flatMap((dayMeals) => Object.values(dayMeals).flat())
        .map((food) => food.id_plato)
        .filter((id): id is number => typeof id === "number" && Number.isFinite(id))
    ));

    for (const dishId of dishIds) {
      try {
        const response = await apiRequest<any>(`/dishes/${dishId}`, { method: "GET", accessToken: token });
        details.set(dishId, response?.data ?? response);
      } catch {
        // Keep the partial recipe if detail cannot be loaded.
      }
    }

    const enriched = { ...sourcePlan };
    Object.entries(sourcePlan).forEach(([day, dayMeals]) => {
      enriched[day] = { ...dayMeals };
      Object.entries(dayMeals).forEach(([meal, foods]) => {
        enriched[day][meal as MealKey] = foods.map((food) => {
          const detail = food.id_plato ? details.get(food.id_plato) : null;
          return detail ? buildFoodFromDishDetail(food, detail) : food;
        });
      });
    });

    return enriched;
  };

  const mapDiasToPlan = (dias: any[]) => {
    const nextPlan: Record<DayKey, Record<MealKey, FoodItem[]>> = {};
    const nextDays: string[] = [];

    dias.forEach((dia: any) => {
      const dayName = normalizeDay(String(dia?.dia_semana ?? dia?.dia ?? dia?.nombre_dia ?? dia?.nombreDia ?? ""));
      if (!dayName) return;
      if (!nextDays.includes(dayName)) nextDays.push(dayName);

      const dayMeals: Record<MealKey, FoodItem[]> = {
        desayuno: [],
        media_manana: [],
        almuerzo: [],
        merienda: [],
        cena: [],
      };

      const menus = dia?.menus ?? dia?.comidas ?? dia?.tiempos_comida ?? dia?.tiemposComida ?? dia?.menu ?? [];
      (menus ?? []).forEach((menu: any) => {
        const label = normalizeMealLabel(getMenuLabel(menu));
        const key = mealKeyByLabel[label];
        if (!key) return;
        dayMeals[key] = [{
          id_menu_diario: getMenuId(menu),
          id_plato: getMenuDishId(menu),
          mealKey: key,
          name: getMenuName(menu),
          portion: "",
          kcal: getMenuCalories(menu),
          protein: getMenuMacro(menu, ["proteinas_g", "proteina_g", "proteinas", "proteina", "protein", "protein_g"]),
          carbs: getMenuMacro(menu, ["carbohidratos_g", "carbohidrato_g", "carbohidratos", "carbohidrato", "carbs", "carbs_g", "carbohydrates"]),
          fat: getMenuMacro(menu, ["grasas_g", "grasa_g", "grasas", "grasa", "fat", "fat_g", "lipidos"]),
          description: getMenuDescription(menu),
          ingredients: getMenuIngredients(menu),
          preparation: getMenuPreparation(menu),
        }];
      });

      nextPlan[dayName] = dayMeals;
    });

    return { nextPlan, nextDays };
  };

  const toTitleCase = (value: string) => value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : value;

  const normalizeDay = (value: string) => {
    const raw = normalizeText(value);
    const numeric = Number(raw);
    if (Number.isFinite(numeric) && numeric >= 1 && numeric <= 7) {
      return ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][numeric - 1];
    }
    if (raw.startsWith("lun")) return "Lunes";
    if (raw.startsWith("mar")) return "Martes";
    if (raw.startsWith("mie")) return "Miércoles";
    if (raw.startsWith("jue")) return "Jueves";
    if (raw.startsWith("vie")) return "Viernes";
    if (raw.startsWith("sab")) return "Sábado";
    if (raw.startsWith("dom")) return "Domingo";
    return toTitleCase(value);
  };

  const toNumber = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const formatWeekDate = (iso?: string) => {
    if (!iso) return "";
    const d = parseLocalDate(String(iso));
    if (!d || Number.isNaN(d.getTime())) {
      const parts = String(iso).split("T")[0].split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return String(iso);
    }
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const pickDateValue = (source: Record<string, unknown> | null | undefined, keys: string[]) => {
    if (!source) return "";
    for (const key of keys) {
      const value = String(source[key] ?? "");
      const date = value ? parseLocalDate(value) : null;
      if (date && !Number.isNaN(date.getTime())) return value;
    }
    return "";
  };

  const pickEarliestDate = (rows: Record<string, unknown>[], keys: string[]) =>
    rows
      .map((row) => pickDateValue(row, keys))
      .filter((value) => {
        const date = parseLocalDate(value);
        return date && !Number.isNaN(date.getTime());
      })
      .sort((a, b) => parseLocalDate(a).getTime() - parseLocalDate(b).getTime())[0] ?? "";

  const getFirstPlanGeneratedDate = (planItem: Record<string, unknown> | null, weeks: Record<string, unknown>[]) => {
    const planGenerated = pickDateValue(planItem, [
      "fecha_generacion",
      "fecha_generado",
      "fecha_generada",
      "generado_en",
      "generated_at",
    ]);
    if (planGenerated) return formatWeekDate(planGenerated);

    const weekGenerated = pickEarliestDate(weeks, [
      "fecha_generacion",
      "fecha_generado",
      "fecha_generada",
      "generado_en",
      "generated_at",
      "created_at",
      "createdAt",
      "fecha_creacion",
    ]);
    if (weekGenerated) return formatWeekDate(weekGenerated);

    const planCreated = pickDateValue(planItem, ["created_at", "createdAt", "fecha_creacion"]);
    return planCreated ? formatWeekDate(planCreated) : "--";
  };

  const pickFirstNumber = (source: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
      if (source[key] !== undefined) {
        const parsed = toNumber(source[key]);
        if (parsed !== null) return parsed;
      }
    }
    return null;
  };

  const extractList = (raw: unknown): Record<string, unknown>[] => {
    if (Array.isArray(raw)) return raw as Record<string, unknown>[];
    if (!raw || typeof raw !== "object") return [];
    const root = raw as Record<string, unknown>;
    if (Array.isArray(root.data)) return root.data as Record<string, unknown>[];
    if (Array.isArray(root.rows)) return root.rows as Record<string, unknown>[];
    if (Array.isArray(root.items)) return root.items as Record<string, unknown>[];
    if (Array.isArray(root.results)) return root.results as Record<string, unknown>[];
    if (Array.isArray(root.planes)) return root.planes as Record<string, unknown>[];
    if (root.data && typeof root.data === "object") {
      const data = root.data as Record<string, unknown>;
      if (Array.isArray(data.rows)) return data.rows as Record<string, unknown>[];
      if (Array.isArray(data.items)) return data.items as Record<string, unknown>[];
      if (Array.isArray(data.results)) return data.results as Record<string, unknown>[];
      if (Array.isArray(data.planes)) return data.planes as Record<string, unknown>[];
    }
    return [];
  };

  const extractItem = (raw: unknown): Record<string, unknown> | null => {
    if (!raw || typeof raw !== "object") return null;
    if (Array.isArray(raw)) return (raw[0] as Record<string, unknown>) ?? null;
    const root = raw as Record<string, unknown>;
    if (root.data && typeof root.data === "object" && !Array.isArray(root.data)) {
      return root.data as Record<string, unknown>;
    }
    return root;
  };

  const normalizeStatus = (value: unknown) => String(value ?? "").toLowerCase();

  const pickActivePlan = (plans: Record<string, unknown>[]) => {
    const active = plans.find((planItem) => normalizeStatus(planItem.estado ?? planItem.status) === "activo");
    return active ?? plans[0] ?? null;
  };

  const pickWeekIdFromPlan = (planItem: Record<string, unknown> | null) => {
    if (!planItem) return null;
    const direct = pickFirstNumber(planItem, ["id_semana", "semana_id", "id_semana_plan", "semana_plan_id"]);
    if (direct) return direct;

    const semanaActual = planItem.semana_actual as Record<string, unknown> | undefined;
    if (semanaActual) {
      const weekId = pickFirstNumber(semanaActual, ["id_semana", "id_semana_plan", "semana_id"]);
      if (weekId) return weekId;
    }

    const semanas = (planItem.semanas || planItem.semanas_plan) as Record<string, unknown>[] | undefined;
    if (Array.isArray(semanas) && semanas.length > 0) {
      const weekId = pickFirstNumber(semanas[0], ["id_semana", "id_semana_plan", "semana_id"]);
      if (weekId) return weekId;
    }

    return null;
  };

  const pickLatestEvaluationId = (evaluations: Record<string, unknown>[]) => {
    if (evaluations.length === 0) return null;
    const withDates = evaluations.map((item) => {
      const rawDate = String(item.fecha_evaluacion ?? item.fecha_atencion ?? item.fecha ?? item.created_at ?? item.createdAt ?? "");
      const date = rawDate ? new Date(rawDate).getTime() : 0;
      return { item, date };
    });
    withDates.sort((a, b) => b.date - a.date);
    return pickFirstNumber(withDates[0].item, ["id_evaluacion", "id", "evaluation_id"]);
  };

  const pickLatestEvaluation = (evaluations: Record<string, unknown>[]) => {
    if (evaluations.length === 0) return null;
    const withDates = evaluations.map((item) => {
      const rawDate = String(item.fecha_evaluacion ?? item.fecha_atencion ?? item.fecha ?? item.created_at ?? item.createdAt ?? "");
      const date = rawDate ? new Date(rawDate).getTime() : 0;
      return { item, date };
    });
    withDates.sort((a, b) => b.date - a.date);
    return withDates[0].item;
  };

  const pickWeekDays = (payload: unknown, selectedWeekId?: number | null): Array<Record<string, unknown>> => {
    if (!payload || typeof payload !== "object") return [];
    const root = payload as Record<string, unknown>;
    const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
    const weeks = (data.semanas || data.semanas_plan || data.weeks || data.week_days) as unknown;
    const list = Array.isArray(weeks) ? (weeks as Record<string, unknown>[]) : [];
    if (!selectedWeekId) return list;
    return list.filter((item) => {
      if (!item || typeof item !== "object") return false;
      const resolved = pickFirstNumber(item as Record<string, unknown>, ["id_semana", "semana_id", "id_semana_plan", "semana_plan_id"]);
      return resolved === selectedWeekId;
    });
  };

  const mapPlanWeeks = (weeks: Record<string, unknown>[]) => weeks.map((w: any) => {
    const id = pickFirstNumber(w as Record<string, unknown>, ["id_semana", "semana_id", "id"]) ?? 0;
    const start = String(w.fecha_inicio_semana ?? w.fecha_inicio ?? w.start_date ?? "");
    const end = String(w.fecha_fin_semana ?? w.fecha_fin ?? w.end_date ?? "");
    const label = start
      ? `INICIO: ${formatWeekDate(start)}${end ? ` - FIN: ${formatWeekDate(end)}` : ""}`
      : String(w.numero ?? w.number ?? id);
    return { id, start, end, label };
  });

  const refreshPlanWeeks = async (targetPlanId: number, token: string, selectedId?: number | null) => {
    setLoadingPlanWeeks(true);
    try {
      const weeksRes = await apiRequest<unknown>(`/nutrition-plans/${targetPlanId}/weeks`, {
        method: "GET",
        accessToken: token,
      });
      const weeks = extractList(weeksRes);
      const mapped = mapPlanWeeks(weeks);
      setPlanWeeks(mapped);

      if (selectedId) {
        setWeekId(selectedId);
      } else if (mapped.length > 0) {
        const latestWeek = mapped.slice().sort((a, b) =>
          (parseLocalDate(b.start ?? "").getTime() || 0) -
          (parseLocalDate(a.start ?? "").getTime() || 0)
        )[0];
        if (latestWeek && latestWeek.id) setWeekId(latestWeek.id);
      }
      return weeks;
    } finally {
      setLoadingPlanWeeks(false);
    }
  };

  const mapRecipeOption = (item: Record<string, unknown>): RecipeOption | null => {
    const id = pickFirstNumber(item, ["id_plato", "id", "plato_id"]);
    if (!id) return null;
    return {
      id_plato: id,
      nombre: String(item.nombre ?? item.nombre_plato ?? item.name ?? "Receta"),
      calorias_totales: Number(item.calorias_totales ?? item.calorias ?? item.kcal ?? 0),
      id_tiempo_comida: pickFirstNumber(item, ["id_tiempo_comida", "tiempo_comida_id"]),
      generado_por_ia: Boolean(item.generado_por_ia),
    };
  };

  const loadRecipesCatalog = async () => {
    const token = localStorage.getItem("dkfitt-access-token");
    if (!token) return;

    setLoadingRecipes(true);
    try {
      const res = await apiRequest<unknown>("/dishes?page=1&limit=100", { method: "GET", accessToken: token });
      setRecetasCatalogo(extractList(res).map(mapRecipeOption).filter((item): item is RecipeOption => !!item));
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "No se pudo cargar el catalogo de recetas.";
      toast({ title: "Error al cargar recetas", description: message, variant: "destructive" });
    } finally {
      setLoadingRecipes(false);
    }
  };

  const updateRecipeInPlan = (slot: RecipeSlot, recipe: RecipeOption, detail?: any) => {
    const baseFood: FoodItem = {
      ...slot.food,
      id_plato: recipe.id_plato,
      name: recipe.nombre,
      kcal: Math.round(recipe.calorias_totales || slot.currentKcal),
      protein: 0,
      carbs: 0,
      fat: 0,
    };
    const nextFood = detail ? buildFoodFromDishDetail(baseFood, detail) : baseFood;

    setPlan((prev) => ({
      ...prev,
      [slot.day]: {
        ...prev[slot.day],
        [slot.meal]: [nextFood],
      },
    }));
  };

  const applyRecipeChange = async (slot: RecipeSlot, recipe: RecipeOption) => {
    const token = localStorage.getItem("dkfitt-access-token");
    if (!token) return;
    if (!slot.food.id_menu_diario) {
      toast({
        title: "No se puede cambiar esta receta",
        description: "No se encontro el id_menu_diario de este slot del plan.",
        variant: "destructive",
      });
      return;
    }

    setChangingRecipe(true);
    try {
      await apiRequest(`/menus-diarios/${slot.food.id_menu_diario}/plato`, {
        method: "PATCH",
        accessToken: token,
        body: { id_plato: recipe.id_plato },
      });
      let detail: any | undefined;
      try {
        const detailRes = await apiRequest<any>(`/dishes/${recipe.id_plato}`, { method: "GET", accessToken: token });
        detail = detailRes?.data ?? detailRes;
      } catch {
        detail = undefined;
      }
      updateRecipeInPlan(slot, recipe, detail);
      toast({
        title: "Receta actualizada",
        description: `${slot.food.name} fue reemplazada por ${recipe.nombre}.`,
      });
      setModalRecetaExistente(false);
      setModalGenerarReceta(false);
      setRecipeSlot(null);
      setSelectedRecipeId("");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "No se pudo cambiar la receta.";
      toast({ title: "Error al cambiar receta", description: message, variant: "destructive" });
    } finally {
      setChangingRecipe(false);
    }
  };

  const openExistingRecipeModal = async (slot: RecipeSlot) => {
    setRecipeSlot(slot);
    setBusquedaReceta("");
    setSelectedRecipeId("");
    setModalRecetaExistente(true);
    if (recetasCatalogo.length === 0) await loadRecipesCatalog();
  };

  const openGenerateRecipeModal = (slot: RecipeSlot) => {
    setRecipeSlot(slot);
    setModalGenerarReceta(true);
  };

  const generateReplacementRecipe = async () => {
    const token = localStorage.getItem("dkfitt-access-token");
    if (!token || !recipeSlot) return;

    setChangingRecipe(true);
    try {
      const res = await apiRequest<any>("/recipe-generator/generate-generic", {
        method: "POST",
        accessToken: token,
        body: {
          id_tiempo_comida: mealIdByKey[recipeSlot.meal],
          tiempo_comida_nombre: mealApiNameByKey[recipeSlot.meal],
          calorias_objetivo: Math.round(recipeSlot.currentKcal),
          forzar_nuevo: true,
        },
      });
      const generado = (res?.data ?? res) as Record<string, unknown>;
      const recipe = mapRecipeOption(generado);
      if (!recipe) {
        toast({ title: "Sin receta generada", description: "La IA no devolvio un id_plato valido.", variant: "destructive" });
        return;
      }
      await applyRecipeChange(recipeSlot, recipe);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "No se pudo generar la receta.";
      toast({ title: "Error al generar receta", description: message, variant: "destructive" });
      setChangingRecipe(false);
    }
  };

  useEffect(() => {
    const fetchPatientName = async () => {
      if (!patientId) return;
      const token = localStorage.getItem("dkfitt-access-token");
      if (!token) return;

      try {
        const response = await apiRequest<unknown>(`/patients/${patientId}`, {
          method: "GET",
          accessToken: token,
        });
        const list = extractList(response);
        const raw = list[0] ?? extractItem(response);
        if (!raw || typeof raw !== "object") return;
        const item = raw as Record<string, unknown>;
        const nombres = String(item.nombre_completo ?? "").trim() || `${String(item.nombres ?? "").trim()} ${String(item.apellidos ?? "").trim()}`.trim();
        const profileIdValue = pickFirstNumber(item, ["id_perfil", "perfil_id", "profile_id"]);
        if (nombres) setPatientName(nombres);
        if (profileIdValue) setProfileId(profileIdValue);
      } catch {
        toast({ title: "No se pudo cargar paciente", description: "El plan se mostrará con nombre por defecto." });
      }
    };

    void fetchPatientName();
  }, [patientId, toast]);

  useEffect(() => {
    const fetchPlanMeta = async () => {
      if (!profileId) return;
      const token = localStorage.getItem("dkfitt-access-token");
      if (!token) return;

      try {
        const plansRes = await apiRequest<unknown>(`/nutrition-plans/patient/${profileId}`, {
          method: "GET",
          accessToken: token,
        });
        const plans = extractList(plansRes);
        const activePlan = pickActivePlan(plans);
        const rawStatus = activePlan?.estado ?? activePlan?.status ?? "pendiente";
        const normalizedStatus = normalizeStatus(rawStatus);
        const resolvedStatus = normalizedStatus === "activo" || normalizedStatus === "suspendido" || normalizedStatus === "pendiente" || normalizedStatus === "inactivo"
          ? (normalizedStatus as "activo" | "suspendido" | "pendiente" | "inactivo")
          : "pendiente";
        setStatus(resolvedStatus);

        const resolvedPlanId = activePlan
          ? pickFirstNumber(activePlan, ["id_plan", "plan_id", "id_plan_nutricional", "plan_nutricional_id"])
          : null;

        if (!resolvedPlanId) {
          setPlanGeneratedDate("--");
        }

        if (resolvedPlanId) {
          setPlanId(resolvedPlanId);

          try {
            const weeks = await refreshPlanWeeks(resolvedPlanId, token);
            setPlanGeneratedDate(getFirstPlanGeneratedDate(activePlan, weeks ?? []));
          } catch {
            setPlanGeneratedDate(getFirstPlanGeneratedDate(activePlan, []));
          }
        }
      } catch {
        // no-op
      }
    };

    void fetchPlanMeta();
  }, [profileId]);

  useEffect(() => {
    const fetchTargetKcal = async () => {
      if (!profileId) return;
      const token = localStorage.getItem("dkfitt-access-token");
      if (!token) return;

      try {
        const evalRes = await apiRequest<unknown>(`/clinical-evaluations/patient/${profileId}`, {
          method: "GET",
          accessToken: token,
        });
        const evaluations = extractList(evalRes);
        const latestEval = pickLatestEvaluation(evaluations);
        const kcal = pickCaloriesFromEvaluation(latestEval);
        if (kcal !== null) setTargetKcal(kcal);
      } catch {
        // no-op
      }
    };

    void fetchTargetKcal();
  }, [profileId]);

  useEffect(() => {
    const fetchWeekMeals = async () => {
      if (!planId || !weekId) return;
      const token = localStorage.getItem("dkfitt-access-token");
      if (!token) return;

      try {
        const weeksRes = await apiRequest<unknown>(`/nutrition-plans/${planId}/weeks`, {
          method: "GET",
          accessToken: token,
        });
        const weeks = extractList(weeksRes);
        const selectedWeek = weeks.find((w: any) => pickFirstNumber(w, ["id_semana", "semana_id"]) === weekId) as Record<string, unknown> | undefined;
        const responseRoot = weeksRes as Record<string, unknown> | null;
        const responseData = (responseRoot as any)?.data as Record<string, unknown> | undefined;
        const responseDias = (responseRoot as any)?.dias as unknown;
        const dias = (
          selectedWeek?.dias
          ?? selectedWeek?.days
          ?? selectedWeek?.menus
          ?? selectedWeek?.plan
          ?? (responseData as any)?.dias
          ?? responseDias
          ?? []
        ) as any[];
        if (!Array.isArray(dias) || dias.length === 0) return;

        const { nextPlan, nextDays } = mapDiasToPlan(dias);
        const enrichedPlan = await enrichPlanWithDishDetails(nextPlan, token);
        if (nextDays.length > 0) {
          nextDays.sort((a, b) => daysOrder.indexOf(a) - daysOrder.indexOf(b));
          setActiveDays(nextDays);
        }
        if (Object.keys(enrichedPlan).length > 0) {
          setPlan(enrichedPlan);
        }
      } catch {
        // no-op
      }
    };

    void fetchWeekMeals();
  }, [planId, weekId]);

  const abrirModalGenerarSemana = async () => {
    const lunesActual = getLunes();
    setFechaInicioSemana(lunesActual);
    setFechaFinSemana(getViernesDesdeLunes(lunesActual));

    setModalGenerarSemana(true);
  };

  const handleGenerateWeek = async () => {
    const token = localStorage.getItem("dkfitt-access-token");
    if (!token || !profileId) {
      toast({ title: "Datos incompletos", description: "No se encontró el perfil del paciente.", variant: "destructive" });
      return;
    }

    const semanasPermitidas = getRangosSemanasPermitidas();
    const semanaPermitida = semanasPermitidas.some((semana) => semana.inicio === fechaInicioSemana);
    if (!semanaPermitida) {
      const rangosPermitidos = semanasPermitidas
        .map((semana) => `${formatWeekDate(semana.inicio)} al ${formatWeekDate(semana.fin)}`)
        .join(" o ");
      setModalGenerarSemana(false);
      toast({
        title: "No esta permitido generar este plan",
        description: `Solo puedes generar el plan de la semana actual o de la proxima semana (${rangosPermitidos}). No esta permitido adelantarse a una tercera semana porque las necesidades caloricas del paciente pueden cambiar segun su progreso.`,
        variant: "destructive",
      });
      setFechaInicioSemana(semanasPermitidas[0].inicio);
      setFechaFinSemana(semanasPermitidas[0].fin);
      return;
    }

    setModalGenerarSemana(false);
    setGeneratingWeek(true);

    try {
      const evalRes = await apiRequest<unknown>(`/clinical-evaluations/patient/${profileId}`, {
        method: "GET",
        accessToken: token,
      });
      const evaluations = extractList(evalRes);
      const latestEvalId = pickLatestEvaluationId(evaluations);
      const latestEval = pickLatestEvaluation(evaluations);
      setTargetKcal(pickCaloriesFromEvaluation(latestEval));

      if (!latestEvalId) {
        toast({ title: "Sin evaluaciones", description: "El paciente no tiene evaluaciones clínicas.", variant: "destructive" });
        return;
      }

      const plansRes = await apiRequest<unknown>(`/nutrition-plans/patient/${profileId}`, {
        method: "GET",
        accessToken: token,
      });
      const plans = extractList(plansRes);
      const existingPlan = plans.find((p) => ["activo", "pendiente", "suspendido"].includes(normalizeStatus(p.estado))) ?? null;

      let resolvedPlanId = existingPlan
        ? pickFirstNumber(existingPlan as Record<string, unknown>, ["id_plan", "plan_id"])
        : null;

      if (!resolvedPlanId) {
        const planRes = await apiRequest<unknown>(`/nutrition-plans/patient/${profileId}`, {
          method: "POST",
          accessToken: token,
          body: { id_evaluacion: latestEvalId, notas: "Plan nutricional" },
        });
        const planItem = extractItem(planRes);
        resolvedPlanId = planItem
          ? pickFirstNumber(planItem, ["id_plan", "plan_id"])
          : null;
      }

      if (!resolvedPlanId) {
        toast({ title: "Error", description: "No se pudo obtener o crear el plan.", variant: "destructive" });
        return;
      }

      let resolvedWeekId: number | null = null;

      try {
        // Obtener semanas existentes para calcular el numero correcto
        const semanasExistentes = await apiRequest<unknown>(
          `/nutrition-plans/${resolvedPlanId}/weeks`,
          { method: "GET", accessToken: token }
        );
        const semanasActuales = extractList(semanasExistentes);
        const numeroSemana = semanasActuales.length + 1; // ← numero correcto

        const semanaExistente = semanasActuales.find((w) =>
          getWeekStart(w) === fechaInicioSemana && getWeekEnd(w) === fechaFinSemana
        );

        if (semanaExistente && !regenerarSemana) {
          const existingWeekId = pickFirstNumber(semanaExistente, ["id_semana", "semana_id", "id"]);
          if (existingWeekId) {
            await refreshPlanWeeks(resolvedPlanId, token, existingWeekId);
          }
          toast({
            title: "La semana ya existe",
            description: "Ya hay un plan generado para estas fechas. Activa la opcion de regenerar si necesitas reemplazar sus recetas.",
            variant: "destructive",
          });
          return;
        }

        const semanaRes = semanaExistente ? null : await apiRequest<unknown>(
          `/nutrition-plans/${resolvedPlanId}/weeks`,
          {
            method: "POST",
            accessToken: token,
            body: {
              numero: numeroSemana, // ← usar este en lugar de plans.length + 1
              fecha_inicio_semana: fechaInicioSemana,
              fecha_fin_semana: fechaFinSemana,
            },
          }
        );
        const semanaItem = extractItem(semanaRes);
        resolvedWeekId = semanaExistente
          ? pickFirstNumber(semanaExistente, ["id_semana", "semana_id", "id"])
          : semanaItem
            ? pickFirstNumber(semanaItem, ["id_semana", "semana_id"])
            : null;

      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          // Ya existe semana con esas fechas — buscarla
          try {
            const weeksRes = await apiRequest<unknown>(
              `/nutrition-plans/${resolvedPlanId}/weeks`,
              { method: "GET", accessToken: token }
            );
            const weeks = extractList(weeksRes);
            const matching = weeks.find((w: any) =>
              String(w.fecha_inicio_semana ?? "").startsWith(fechaInicioSemana)
            ) as Record<string, unknown> | undefined;
            resolvedWeekId = matching
              ? pickFirstNumber(matching, ["id_semana", "semana_id"])
              : pickFirstNumber(
                weeks[weeks.length - 1] as Record<string, unknown>,
                ["id_semana", "semana_id"]
              );
          } catch {
            // no-op
          }
        } else {
          throw error;
        }
      }

      if (!resolvedWeekId) {
        toast({ title: "Error", description: "No se pudo crear o encontrar la semana del plan.", variant: "destructive" });
        return;
      }

      setPlanId(resolvedPlanId);
      setWeekId(resolvedWeekId);
      setEvaluationId(latestEvalId);
      await refreshPlanWeeks(resolvedPlanId, token, resolvedWeekId);

      const payload = {
        id_plan: resolvedPlanId,
        id_semana: resolvedWeekId,
        id_evaluacion: latestEvalId,
        regenerar: regenerarSemana,
      };

      console.log("IDs para generate-week:", payload);

      const response = await apiRequest<any>("/recipe-generator/generate-week", {
        method: "POST",
        accessToken: token,
        body: payload,
      });

      const result = response?.data ?? response;
      const dias = result?.dias ?? [];

      if (dias.length === 0) {
        toast({ title: "Sin resultados", description: "No se recibieron recetas para la semana." });
        return;
      }

      const { nextPlan, nextDays } = mapDiasToPlan(dias);
      const enrichedPlan = await enrichPlanWithDishDetails(nextPlan, token);

      if (nextDays.length > 0) {
        nextDays.sort((a, b) => daysOrder.indexOf(a) - daysOrder.indexOf(b));
        setActiveDays(nextDays);
      }

      setPlan(enrichedPlan);
      setProgress(100);
      setProgressMessage("¡Plan generado!");
      toast({ title: "Plan generado", description: `Semana del ${fechaInicioSemana} al ${fechaFinSemana} lista.` });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "No se pudo generar el plan.";
      toast({ title: "Error al generar", description: message, variant: "destructive" });
    } finally {
      setTimeout(() => setGeneratingWeek(false), 600);
    }
  };

  const handleActivarPlan = async () => {
    if (!planId) {
      toast({ title: "Error", description: "No hay plan asignado a este paciente.", variant: "destructive" });
      return;
    }

    setActivatingPlan(true);
    try {
      const token = localStorage.getItem("dkfitt-access-token");

      await apiRequest(`/nutrition-plans/${planId}/activate`, {
        method: "PATCH",
        accessToken: token ?? undefined,
        body: { fecha_inicio: fechaActivacion },
      });

      await apiRequest(`/nutrition-plans/${planId}/unlock-module`, {
        method: "PATCH",
        accessToken: token ?? undefined,
      });

      setStatus("activo");
      savePlanStatusOverride([profileId, patientId], "activo");
      window.dispatchEvent(new CustomEvent("dkfitt-plan-data-updated"));
      setModalActivar(false);
      toast({
        title: "Plan activado",
        description: `El paciente podrá ver su plan desde el ${new Date(`${fechaActivacion}T00:00:00`).toLocaleDateString("es-EC", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}.`,
      });
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : "No se pudo activar el plan. Intenta de nuevo.";
      toast({ title: "Error al activar", description: message, variant: "destructive" });
    } finally {
      setActivatingPlan(false);
    }
  };

  const handleSuspenderPlan = async () => {
    if (!planId) return;

    try {
      const token = localStorage.getItem("dkfitt-access-token");
      await apiRequest(`/nutrition-plans/${planId}/suspend`, { method: "PATCH", accessToken: token ?? undefined });
      await apiRequest(`/nutrition-plans/${planId}/lock-module`, { method: "PATCH", accessToken: token ?? undefined });
      setStatus("suspendido");
      savePlanStatusOverride([profileId, patientId], "suspendido");
      window.dispatchEvent(new CustomEvent("dkfitt-plan-data-updated"));
      toast({ title: "Plan suspendido", description: "El paciente no puede ver su plan en la app." });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Intenta de nuevo.";
      toast({ title: "Error al suspender", description: message, variant: "destructive" });
    }
  };

  const handleReactivarPlan = async () => {
    if (!planId) return;

    try {
      const token = localStorage.getItem("dkfitt-access-token");
      await apiRequest(`/nutrition-plans/${planId}/reactivate`, { method: "PATCH", accessToken: token ?? undefined });
      await apiRequest(`/nutrition-plans/${planId}/unlock-module`, { method: "PATCH", accessToken: token ?? undefined });
      setStatus("activo");
      savePlanStatusOverride([profileId, patientId], "activo");
      window.dispatchEvent(new CustomEvent("dkfitt-plan-data-updated"));
      toast({ title: "Plan reactivado", description: "El paciente puede ver su plan nuevamente." });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Intenta de nuevo.";
      toast({ title: "Error al reactivar", description: message, variant: "destructive" });
    }
  };

  const selectedWeekIndex = planWeeks.findIndex((w) => w.id === weekId);
  const selectedWeekLabel = selectedWeekIndex >= 0 ? planWeeks[selectedWeekIndex].label : undefined;
  const onExternalWeekChange = (index: number) => {
    const target = planWeeks[index];
    if (target) setWeekId(target.id);
  };
  const recetasFiltradas = useMemo(() => {
    const q = normalizeText(busquedaReceta);
    return recetasCatalogo
      .filter((r) => {
        const sameMeal = !recipeSlot?.meal || !r.id_tiempo_comida || r.id_tiempo_comida === mealIdByKey[recipeSlot.meal];
        const matches = !q || normalizeText(r.nombre).includes(q);
        return sameMeal && matches;
      })
      .sort((a, b) => Math.abs(a.calorias_totales - (recipeSlot?.currentKcal ?? 0)) - Math.abs(b.calorias_totales - (recipeSlot?.currentKcal ?? 0)))
      .slice(0, 25);
  }, [busquedaReceta, recetasCatalogo, recipeSlot]);
  const selectedRecipe = recetasCatalogo.find((r) => String(r.id_plato) === selectedRecipeId) ?? null;
  const selectedRecipeDiff = selectedRecipe && recipeSlot ? Math.round(selectedRecipe.calorias_totales - recipeSlot.currentKcal) : 0;
  const isPlanActive = status === "activo";
  const isPlanSuspended = status === "suspendido";
  const planVisibilityLabel = isPlanActive ? "Ocultar Módulo Mi Plan" : isPlanSuspended ? "Mostrar Módulo Mi Plan" : "Activar Módulo Mi Plan";
  const handlePlanVisibility = isPlanActive ? handleSuspenderPlan : isPlanSuspended ? handleReactivarPlan : () => setModalActivar(true);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/planes")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">Plan Nutricional — {patientName ?? "Paciente"}</h1>
                <Badge variant="outline" className={`text-[11px] ${sc.className}`}>{sc.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">Fecha en la que empezó el tratamiento: {planGeneratedDate}</p>
            </div>
          </div>
        </div>

        {/* Resumen + Calorías + IA (3 columnas) */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 items-stretch">
          <div className="md:col-span-1 h-full">
            <NutritionalSummary plan={plan} activeDays={activeDays} targetKcal={targetKcal} showPerDay={false} />
          </div>

          <div className="md:col-span-1 h-full">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 h-full flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Calorías por día</h3>
                <div className="space-y-3 mt-3">
                  {computeDailyTotals(plan, activeDays).map((d) => {
                    const hasTarget = typeof targetKcal === "number" && Number.isFinite(targetKcal) && targetKcal > 0;
                    const pct = hasTarget ? Math.round((d.kcal / targetKcal) * 100) : 0;
                    return (
                      <div key={d.day} className="flex items-center gap-3">
                        <div className="w-14 text-[13px] font-medium text-foreground">{d.day}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-[#C5EB6F]" style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <div className="w-20 text-right text-sm font-semibold">{d.kcal} kcal</div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{hasTarget ? formatObjectiveDelta(pct) : "Objetivo no calculado"}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Promedio</span>
                  <span className="font-semibold">{Math.round(computeDailyTotals(plan, activeDays).reduce((s, x) => s + x.kcal, 0) / Math.max(computeDailyTotals(plan, activeDays).length, 1))} kcal</span>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-1 h-full">
            <div className="rounded-xl border border-border bg-card p-5 h-full space-y-4">
              <div className="rounded-xl border border-[#F7CA5E]/50 bg-[#F7CA5E]/15 p-4">
                <Button
                  className="w-full gap-1.5 bg-[#F7CA5E] text-[#253027] hover:bg-[#F7CA5E]/90"
                  onClick={handlePlanVisibility}
                  disabled={!planId || (!isPlanActive && !isPlanSuspended && activatingPlan)}
                >
                  {isPlanActive ? <Ban className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                  {planVisibilityLabel}
                </Button>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Controla si el paciente puede ver su plan semanal desde la app. Puedes habilitarlo cuando el plan este listo o suspenderlo si necesita revision.
                </p>
              </div>

              <div className="rounded-xl border border-[#C5EB6F]/55 bg-[#C5EB6F]/15 p-4">
                <Button
                  className="w-full gap-1.5 bg-[#C5EB6F] text-[#253027] hover:bg-[#C5EB6F]/90"
                  onClick={abrirModalGenerarSemana}
                  disabled={generatingWeek}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generar plan semanal con IA
                </Button>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Crea una semana de recetas ajustadas al objetivo calorico del paciente y las organiza por dia y tiempo de comida.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Grid + Summary */}
        <div className="grid grid-cols-1 gap-6">
          <div>
            <WeeklyPlanGrid
              activeDays={activeDays}
              plan={plan}
              onPlanChange={setPlan}
              currentWeek={selectedWeekIndex >= 0 ? selectedWeekIndex : 0}
              maxWeeks={Math.max(planWeeks.length, 1)}
              weekLabel={selectedWeekLabel}
              onWeekChange={(idx) => onExternalWeekChange(idx)}
              onSelectExistingRecipe={openExistingRecipeModal}
              onGenerateRecipe={openGenerateRecipeModal}
            />
          </div>
        </div>

      </div>

      <Dialog open={modalGenerarSemana} onOpenChange={setModalGenerarSemana}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle>Generar plan semanal con IA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Selecciona las fechas de la semana a generar. El sistema creará las 25 recetas automáticamente.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Fecha inicio (lunes)</label>
              <input
                type="date"
                value={fechaInicioSemana}
                onChange={(e) => {
                  setFechaInicioSemana(e.target.value);
                  setFechaFinSemana(getViernesDesdeLunes(e.target.value));
                }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#F7CA5E]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Fecha fin (viernes)</label>
              <input
                type="date"
                value={fechaFinSemana}
                readOnly
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={regenerarSemana}
                onChange={(e) => setRegenerarSemana(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-foreground">Regenerar recetas existentes</span>
            </label>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setModalGenerarSemana(false)}>
                Cancelar
              </Button>
              <Button size="sm" className="bg-[#C5EB6F] text-[#253027] hover:bg-[#C5EB6F]/90" onClick={handleGenerateWeek} disabled={!fechaInicioSemana}>
                Generar semana
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={generatingWeek}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>Generando plan semanal con IA</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 px-6 gap-6">
            <div className="text-6xl animate-bounce">🍽️</div>
            <div className="w-full">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">{progressMessage}</span>
                <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all duration-500 bg-[#C5EB6F]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Esto puede tardar unos segundos mientras se generan las 25 recetas.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalRecetaExistente} onOpenChange={setModalRecetaExistente}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cambiar receta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Receta actual</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{recipeSlot?.food.name}</p>
                <Badge variant="outline">{Math.round(recipeSlot?.currentKcal ?? 0)} kcal</Badge>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={busquedaReceta}
                onChange={(e) => setBusquedaReceta(e.target.value)}
                placeholder="Buscar receta existente..."
                className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#F7CA5E]"
              />
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {loadingRecipes && (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando recetas...
                </div>
              )}
              {!loadingRecipes && recetasFiltradas.map((receta) => {
                const diff = Math.round(receta.calorias_totales - (recipeSlot?.currentKcal ?? 0));
                const exceeds = diff > 0;
                return (
                  <button
                    key={receta.id_plato}
                    onClick={() => setSelectedRecipeId(String(receta.id_plato))}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedRecipeId === String(receta.id_plato) ? "border-[#F7CA5E] bg-[#F7CA5E]/15" : "border-border hover:bg-[#E6E6E6]/30"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{receta.nombre}</p>
                        <p className={`mt-1 text-xs ${exceeds ? "text-[#A95F2F] dark:text-[#FA9C5C]" : "text-muted-foreground"}`}>
                          {Math.round(receta.calorias_totales)} kcal
                          {diff !== 0 ? ` (${diff > 0 ? "+" : ""}${diff} kcal vs actual)` : " (misma cantidad)"}
                        </p>
                      </div>
                      {receta.generado_por_ia && <Badge variant="outline" className="text-[10px]">IA</Badge>}
                    </div>
                  </button>
                );
              })}
              {!loadingRecipes && recetasFiltradas.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">No se encontraron recetas compatibles.</p>
              )}
            </div>

            {selectedRecipe && selectedRecipeDiff > 0 && (
              <div className="flex gap-2 rounded-lg border border-[#FA9C5C]/35 bg-[#FA9C5C]/12 p-3 text-xs text-[#A95F2F] dark:text-[#FA9C5C]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Esta receta excede la receta original por {selectedRecipeDiff} kcal. Revisa si sigue siendo adecuada para el plan del paciente.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setModalRecetaExistente(false)} disabled={changingRecipe}>
                Cancelar
              </Button>
              <Button
                size="sm"
                className="bg-[#F7CA5E] text-[#253027] hover:bg-[#F7CA5E]/90"
                disabled={!recipeSlot || !selectedRecipe || changingRecipe}
                onClick={() => recipeSlot && selectedRecipe && applyRecipeChange(recipeSlot, selectedRecipe)}
              >
                {changingRecipe && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Cambiar receta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalGenerarReceta} onOpenChange={setModalGenerarReceta}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Generar receta con IA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">La nueva receta se generara para respetar estas calorias objetivo.</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{recipeSlot?.food.name}</p>
                <Badge variant="outline">{Math.round(recipeSlot?.currentKcal ?? 0)} kcal</Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Se creara una alternativa para {recipeSlot ? mealApiNameByKey[recipeSlot.meal].replace("_", " ") : "este tiempo de comida"} y luego se reemplazara en este dia del plan.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setModalGenerarReceta(false)} disabled={changingRecipe}>
                Cancelar
              </Button>
              <Button size="sm" className="bg-[#C5EB6F] text-[#253027] hover:bg-[#C5EB6F]/90" onClick={generateReplacementRecipe} disabled={!recipeSlot || changingRecipe}>
                {changingRecipe ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-2 h-3.5 w-3.5" />}
                Generar y reemplazar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={modalActivar} onOpenChange={setModalActivar}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle>Activar plan nutricional</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              El paciente podrá visualizar su plan en la app móvil a partir de la fecha seleccionada.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Fecha de inicio
              </label>
              <input
                type="date"
                value={fechaActivacion}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setFechaActivacion(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#F7CA5E]"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalActivar(false)}
                disabled={activatingPlan}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-[#F7CA5E] text-[#253027] hover:bg-[#F7CA5E]/90"
                onClick={handleActivarPlan}
                disabled={activatingPlan || !fechaActivacion}
              >
                <Power className="h-3.5 w-3.5" />
                {activatingPlan ? "Activando..." : "Confirmar activación"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default PlanesNutricionales;
