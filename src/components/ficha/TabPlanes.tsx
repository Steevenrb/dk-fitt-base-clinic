import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit, CalendarDays, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ACCESS_TOKEN_KEY = "dkfitt-access-token";

type Meal = {
  comida: string;
  descripcion: string;
  kcal: number;
};

type DayPlan = {
  day: string;
  fecha?: string;
  meals: Meal[];
};

type PlanHeader = {
  id: number | null;
  status: string;
  start: string;
  end: string;
  targetKcal: number | null;
};

type TabPlanesProps = {
  patientId?: number;
  profileId?: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw.filter(isRecord);
  if (!isRecord(raw)) return [];
  if (Array.isArray(raw.data)) return raw.data.filter(isRecord);
  if (Array.isArray(raw.items)) return raw.items.filter(isRecord);
  if (Array.isArray(raw.results)) return raw.results.filter(isRecord);
  if (isRecord(raw.data)) {
    if (Array.isArray(raw.data.items)) return raw.data.items.filter(isRecord);
    if (Array.isArray(raw.data.results)) return raw.data.results.filter(isRecord);
    if (Array.isArray(raw.data.planes)) return raw.data.planes.filter(isRecord);
    if (Array.isArray(raw.data.weeks)) return raw.data.weeks.filter(isRecord);
  }
  return [];
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d,.-]/g, "").replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickNumber(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = toNumber(source[key]);
    if (value !== null) return value;
  }
  return null;
}

function localDateKey(value?: string) {
  if (!value) return "";
  return String(value).split("T")[0];
}

function parseLocalDate(value?: string) {
  const raw = localDateKey(value);
  const [year, month, day] = raw.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDate(value?: string) {
  const date = parseLocalDate(value);
  if (!date) return "---";
  return date.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDay(value: string) {
  const raw = normalizeText(value);
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric >= 1 && numeric <= 7) {
    return ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"][numeric - 1];
  }
  if (raw.startsWith("lun")) return "Lunes";
  if (raw.startsWith("mar")) return "Martes";
  if (raw.startsWith("mie")) return "Miercoles";
  if (raw.startsWith("jue")) return "Jueves";
  if (raw.startsWith("vie")) return "Viernes";
  if (raw.startsWith("sab")) return "Sabado";
  if (raw.startsWith("dom")) return "Domingo";
  return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : "Dia";
}

function getMealName(menu: Record<string, unknown>) {
  const tiempo = menu.tiempo_comida;
  if (typeof tiempo === "string") return tiempo;
  if (isRecord(tiempo)) return String(tiempo.nombre ?? tiempo.label ?? tiempo.codigo ?? "Comida");
  return String(menu.nombre_tiempo ?? menu.tiempoComida ?? menu.comida ?? menu.meal ?? "Comida");
}

function getRecipeName(menu: Record<string, unknown>) {
  const plato = menu.plato;
  const receta = menu.receta;
  return String(
    menu.nombre_plato
    ?? (isRecord(plato) ? plato.nombre : plato)
    ?? (isRecord(receta) ? receta.nombre : receta)
    ?? menu.nombre
    ?? "Receta asignada",
  );
}

function getMealCalories(menu: Record<string, unknown>) {
  return toNumber(menu.calorias_aportadas ?? menu.calorias ?? menu.kcal ?? menu.energia) ?? 0;
}

function getWeekDays(week: Record<string, unknown>) {
  const raw = week.dias ?? week.days ?? week.menus ?? week.plan ?? week.menu ?? [];
  return Array.isArray(raw) ? raw.filter(isRecord) : [];
}

function mapWeekToDays(week: Record<string, unknown>): DayPlan[] {
  const dayOrder = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
  return getWeekDays(week)
    .map((dia) => {
      const day = normalizeDay(String(dia.dia_semana ?? dia.dia ?? dia.nombre_dia ?? dia.nombreDia ?? ""));
      const menusRaw = dia.menus ?? dia.comidas ?? dia.tiempos_comida ?? dia.tiemposComida ?? dia.menu ?? [];
      const menus = Array.isArray(menusRaw) ? menusRaw.filter(isRecord) : [];
      const meals = menus.map((menu) => ({
        comida: getMealName(menu),
        descripcion: getRecipeName(menu),
        kcal: getMealCalories(menu),
      }));

      return {
        day,
        fecha: String(dia.fecha ?? dia.fecha_menu ?? ""),
        meals,
      };
    })
    .filter((day) => day.meals.length > 0)
    .sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));
}

function pickActivePlan(plans: Record<string, unknown>[]) {
  return plans.find((plan) => String(plan.estado ?? plan.status ?? "").toLowerCase() === "activo") ?? plans[0] ?? null;
}

function isCurrentWeek(week: Record<string, unknown>, today: Date) {
  const start = parseLocalDate(String(week.fecha_inicio_semana ?? week.fecha_inicio ?? week.start_date ?? ""));
  const end = parseLocalDate(String(week.fecha_fin_semana ?? week.fecha_fin ?? week.end_date ?? ""));
  if (!start || !end) return false;
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return today >= start && today <= end;
}

function getPlanCalories(plan: Record<string, unknown> | null, week: Record<string, unknown> | null) {
  if (week) {
    const weekKcal = pickNumber(week, ["calorias_objetivo", "meta_calorica", "calorias_diarias", "target_kcal"]);
    if (weekKcal !== null) return weekKcal;
  }
  return plan ? pickNumber(plan, ["calorias_objetivo", "meta_calorica", "calorias_diarias", "target_kcal"]) : null;
}

export function TabPlanes({ patientId, profileId }: TabPlanesProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [planHeader, setPlanHeader] = useState<PlanHeader>({ id: null, status: "Sin plan", start: "", end: "", targetKcal: null });
  const [days, setDays] = useState<DayPlan[]>([]);

  useEffect(() => {
    const fetchActivePlan = async () => {
      const resolvedProfileId = profileId ?? patientId;
      if (!resolvedProfileId) {
        setLoading(false);
        return;
      }

      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) {
        setLoading(false);
        toast({ title: "Sesion no valida", description: "No se encontro token de acceso.", variant: "destructive" });
        return;
      }

      setLoading(true);
      try {
        const plansRes = await apiRequest<unknown>(`/nutrition-plans/patient/${resolvedProfileId}`, {
          method: "GET",
          accessToken: token,
        });
        const plans = extractList(plansRes);
        const activePlan = pickActivePlan(plans);
        const planId = activePlan ? pickNumber(activePlan, ["id_plan", "plan_id", "id_plan_nutricional"]) : null;

        if (!activePlan || !planId) {
          setPlanHeader({ id: null, status: "Sin plan", start: "", end: "", targetKcal: null });
          setDays([]);
          return;
        }

        const weeksRes = await apiRequest<unknown>(`/nutrition-plans/${planId}/weeks`, {
          method: "GET",
          accessToken: token,
        });
        const weeks = extractList(weeksRes);
        const today = new Date();
        const selectedWeek =
          weeks.find((week) => isCurrentWeek(week, today))
          ?? weeks.slice().sort((a, b) =>
            (parseLocalDate(String(b.fecha_inicio_semana ?? b.fecha_inicio ?? b.start_date ?? ""))?.getTime() ?? 0)
            - (parseLocalDate(String(a.fecha_inicio_semana ?? a.fecha_inicio ?? a.start_date ?? ""))?.getTime() ?? 0)
          )[0]
          ?? null;

        setPlanHeader({
          id: planId,
          status: String(activePlan.estado ?? activePlan.status ?? "Activo"),
          start: String(selectedWeek?.fecha_inicio_semana ?? selectedWeek?.fecha_inicio ?? selectedWeek?.start_date ?? activePlan.fecha_inicio ?? ""),
          end: String(selectedWeek?.fecha_fin_semana ?? selectedWeek?.fecha_fin ?? selectedWeek?.end_date ?? ""),
          targetKcal: getPlanCalories(activePlan, selectedWeek),
        });
        setDays(selectedWeek ? mapWeekToDays(selectedWeek) : []);
      } catch (error) {
        setPlanHeader({ id: null, status: "Sin plan", start: "", end: "", targetKcal: null });
        setDays([]);
        toast({ title: "No se pudo cargar el plan", description: "Verifica el plan activo y sus semanas.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    void fetchActivePlan();
  }, [patientId, profileId, toast]);

  const totalWeekKcal = useMemo(() => days.reduce((sum, day) => sum + day.meals.reduce((daySum, meal) => daySum + meal.kcal, 0), 0), [days]);
  const avgDailyKcal = days.length > 0 ? Math.round(totalWeekKcal / days.length) : null;

  const handleEditPlan = () => {
    if (patientId) navigate(`/planes/ver/${patientId}`);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Plan Nutricional Activo</h3>
              <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 text-[11px]">
                {planHeader.status}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                Semana: {formatDate(planHeader.start)}{planHeader.end ? ` - ${formatDate(planHeader.end)}` : ""}
              </span>
              
              <span>Promedio semana actual: {avgDailyKcal ? `${avgDailyKcal.toLocaleString()} kcal/dia` : "---"}</span>
            </div>
          </div>
          <Button size="sm" className="gap-1.5 text-xs" onClick={handleEditPlan} disabled={!patientId}>
            <Edit className="h-3.5 w-3.5" /> Editar plan
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando plan activo...
        </div>
      ) : days.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-medium text-foreground">No hay comidas para mostrar en la semana actual.</p>
          <p className="mt-1 text-xs text-muted-foreground">Genera o revisa el plan nutricional del paciente para ver sus recetas aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {days.map((day) => (
            <div key={`${day.day}-${day.fecha || ""}`} className="rounded-xl border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <p className="text-xs font-semibold text-primary">{day.day}</p>
                <p className="text-[11px] text-muted-foreground">
                  {day.meals.reduce((s, m) => s + m.kcal, 0).toLocaleString()} kcal total
                </p>
              </div>
              <div className="divide-y divide-border">
                {day.meals.map((meal) => (
                  <div key={`${day.day}-${meal.comida}`} className="px-4 py-2.5">
                    <p className="text-[11px] font-semibold text-foreground">{meal.comida}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{meal.descripcion}</p>
                    <p className="mt-1 text-[10px] font-medium text-primary">{meal.kcal.toLocaleString()} kcal</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
