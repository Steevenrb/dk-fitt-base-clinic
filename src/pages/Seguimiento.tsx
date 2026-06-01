import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Check, X, Utensils, Activity, Flame, CalendarDays, Search, Eye } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const ACCESS_TOKEN_KEY = "dkfitt-access-token";
const PATIENTS_ENDPOINTS = ["/api/patients", "/patients", "/api/pacientes"];

type PatientRow = {
  id: number;
  trackingId: number;
  name: string;
  initials: string;
  status: string;
  adherence: string;
  lastEvaluation: string;
};

type MealTrackingRow = {
  id_seguimiento_comida?: number;
  id_menu_diario?: number;
  fecha_registro?: string;
  realizado?: boolean;
  hora_registro?: string;
  nombre_plato?: string;
  nombre_tiempo?: string;
  calorias_aportadas?: number;
  dia_semana?: string;
  fecha_menu?: string;
};

type ExerciseTrackingRow = {
  id_seguimiento_ejercicio?: number;
  id_ejercicio?: number;
  id_rutina?: number;
  fecha_registro?: string;
  fecha?: string;
  realizado?: boolean;
  completado?: boolean;
  hora_registro?: string;
  nombre_ejercicio?: string;
  nombre?: string;
  descripcion?: string;
  duracion_min?: number;
  duracion_minutos?: number;
};

type MealRecord = {
  name: string;
  plate: string;
  actual: string | null;
  done: boolean;
  calories: number;
};

type ExerciseRecord = {
  name: string;
  actual: string | null;
  done: boolean;
  duration: number | null;
};

type DayData = {
  date: string;
  label: string;
  shortLabel: string;
  meals: MealRecord[];
  exercises: ExerciseRecord[];
  mealPct: number;
  exercisePct: number;
  plannedCalories: number;
  registeredCalories: number;
};

const normalizeStatus = (value: unknown) => {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "activo") return "Activo";
  if (raw === "pendiente") return "Pendiente";
  if (raw === "suspendido") return "Suspendido";
  if (raw === "finalizado") return "Finalizado";
  return "---";
};

const normalizeAdherence = (value: unknown) => {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "alto" || raw === "alta") return "Alta";
  if (raw === "medio" || raw === "media") return "Media";
  if (raw === "bajo" || raw === "baja") return "Baja";
  return "---";
};

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatDate = (value: unknown) => {
  if (!value) return "---";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "---";
  return date.toLocaleDateString("es-EC", { year: "numeric", month: "2-digit", day: "2-digit" });
};

const formatDisplayDate = (value: string) =>
  parseDateKey(value).toLocaleDateString("es-EC", { day: "2-digit", month: "long", year: "numeric" });

const formatShortDate = (value: string) =>
  parseDateKey(value).toLocaleDateString("es-EC", { weekday: "short", day: "2-digit" });

const formatTime = (value?: string | null) => {
  if (!value) return null;
  const [hour = "", minute = ""] = value.split(":");
  return hour && minute ? `${hour}:${minute}` : value;
};

const toInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
};

const getWeekDates = (dateKey = formatLocalDate(new Date())) => {
  const date = parseDateKey(dateKey);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return Array.from({ length: 5 }, (_, index) => {
    const current = new Date(monday);
    current.setDate(monday.getDate() + index);
    return formatLocalDate(current);
  });
};

const getDayIndex = (dateKey = formatLocalDate(new Date())) => {
  const day = parseDateKey(dateKey).getDay();
  if (day === 0 || day === 6) return 4;
  return day - 1;
};

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
          <span style={{ color: p.color || p.fill }}>●</span> {p.name}: {p.value}{p.name?.toLowerCase().includes("adherencia") || p.name?.toLowerCase().includes("ejercicio") ? "%" : " kcal"}
        </p>
      ))}
    </div>
  );
};

async function requestWithFallback<T>(paths: string[], token: string): Promise<T> {
  let lastError: unknown;
  for (const path of paths) {
    try {
      return await apiRequest<T>(path, { method: "GET", accessToken: token });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function extractList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  if (Array.isArray(root.data)) return root.data as Record<string, unknown>[];
  if (Array.isArray(root.patients)) return root.patients as Record<string, unknown>[];
  if (Array.isArray(root.pacientes)) return root.pacientes as Record<string, unknown>[];
  if (root.data && typeof root.data === "object") {
    const data = root.data as Record<string, unknown>;
    if (Array.isArray(data.patients)) return data.patients as Record<string, unknown>[];
    if (Array.isArray(data.pacientes)) return data.pacientes as Record<string, unknown>[];
    if (Array.isArray(data.items)) return data.items as Record<string, unknown>[];
    if (Array.isArray(data.results)) return data.results as Record<string, unknown>[];
  }
  return [];
}

function extractMealRows(raw: unknown): MealTrackingRow[] {
  if (Array.isArray(raw)) return raw as MealTrackingRow[];
  if (!raw || typeof raw !== "object") return [];
  const data = (raw as { data?: unknown }).data;
  return Array.isArray(data) ? data as MealTrackingRow[] : [];
}

function extractExerciseRows(raw: unknown): ExerciseTrackingRow[] {
  if (Array.isArray(raw)) return raw as ExerciseTrackingRow[];
  if (!raw || typeof raw !== "object") return [];
  const data = (raw as { data?: unknown }).data;
  return Array.isArray(data) ? data as ExerciseTrackingRow[] : [];
}

function mapPatient(item: Record<string, unknown>, index: number): PatientRow {
  const nombres = String(item.nombres ?? item.nombre ?? "").trim();
  const apellidos = String(item.apellidos ?? "").trim();
  const name = `${nombres} ${apellidos}`.trim() || String(item.nombre_completo ?? item.name ?? "Paciente");
  const id = Number(item.id_usuario ?? item.id_paciente ?? item.id ?? index + 1);
  const trackingId = Number(item.id_perfil ?? item.perfil_id ?? item.profile_id ?? item.id_paciente ?? id);

  return {
    id,
    trackingId,
    name,
    initials: toInitials(name),
    status: normalizeStatus(item.estado_tratamiento ?? item.estado_plan ?? item.estado),
    adherence: normalizeAdherence(item.nivel_adherencia ?? item.adherencia ?? item.adherence_level),
    lastEvaluation: formatDate(item.ultima_evaluacion ?? item.fecha_ultima_evaluacion ?? item.last_evaluation_date),
  };
}

const mapTrackingToDay = (date: string, mealRows: MealTrackingRow[], exerciseRows: ExerciseTrackingRow[] = []): DayData => {
  const meals = mealRows.map((row) => ({
    name: row.nombre_tiempo || "Comida",
    plate: row.nombre_plato || "Sin nombre de plato",
    actual: formatTime(row.hora_registro),
    done: row.realizado === true,
    calories: Number(row.calorias_aportadas ?? 0),
  }));
  const exercises = exerciseRows.map((row) => ({
    name: row.nombre_ejercicio || row.nombre || row.descripcion || "Ejercicio",
    actual: formatTime(row.hora_registro),
    done: row.realizado === true || row.completado === true,
    duration: Number(row.duracion_min ?? row.duracion_minutos) || null,
  }));
  const done = meals.filter((meal) => meal.done).length;
  const doneExercises = exercises.filter((exercise) => exercise.done).length;
  const mealPct = meals.length > 0 ? Math.round((done / meals.length) * 100) : 0;
  const exercisePct = exercises.length > 0 ? Math.round((doneExercises / exercises.length) * 100) : 0;
  const plannedCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const registeredCalories = meals.reduce((sum, meal) => sum + (meal.done ? meal.calories : 0), 0);

  return {
    date,
    label: formatDisplayDate(date),
    shortLabel: formatShortDate(date),
    meals,
    exercises,
    mealPct,
    exercisePct,
    plannedCalories,
    registeredCalories,
  };
};

const Seguimiento = () => {
  const { toast } = useToast();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
  const [selectedDay, setSelectedDay] = useState(() => getDayIndex());
  const [weekDates, setWeekDates] = useState(() => getWeekDates());
  const [dailyData, setDailyData] = useState<DayData[]>([]);
  const [loadingTracking, setLoadingTracking] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) {
        setLoadingPatients(false);
        toast({ title: "Sesion no valida", description: "No se encontro token de acceso.", variant: "destructive" });
        return;
      }

      setLoadingPatients(true);
      try {
        const response = await requestWithFallback<unknown>(PATIENTS_ENDPOINTS, token);
        setPatients(extractList(response).map((item, index) => mapPatient(item, index)));
      } catch {
        setPatients([]);
        toast({
          title: "No se pudo cargar pacientes",
          description: "Verifica que el endpoint GET /patients este disponible para nutricionista.",
          variant: "destructive",
        });
      } finally {
        setLoadingPatients(false);
      }
    };

    void fetchPatients();
  }, [toast]);

  useEffect(() => {
    const fetchTracking = async () => {
      if (!selectedPatient) return;
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) return;

      setLoadingTracking(true);
      try {
        const results = await Promise.all(weekDates.map(async (date) => {
          const [mealResult, exerciseResult] = await Promise.allSettled([
            apiRequest<unknown>(
              `/meal-tracking/patient/${selectedPatient.trackingId}?fecha=${date}`,
              { method: "GET", accessToken: token },
            ),
            apiRequest<unknown>(
              `/exercise-tracking/patient/${selectedPatient.trackingId}?fecha=${date}`,
              { method: "GET", accessToken: token },
            ),
          ]);
          return mapTrackingToDay(
            date,
            mealResult.status === "fulfilled" ? extractMealRows(mealResult.value) : [],
            exerciseResult.status === "fulfilled" ? extractExerciseRows(exerciseResult.value) : [],
          );
        }));
        setDailyData(results);
      } catch {
        setDailyData(weekDates.map((date) => mapTrackingToDay(date, [])));
        toast({
          title: "No se pudo cargar seguimiento",
          description: "Verifica los endpoints de comidas y ejercicios del paciente.",
          variant: "destructive",
        });
      } finally {
        setLoadingTracking(false);
      }
    };

    void fetchTracking();
  }, [selectedPatient, weekDates, toast]);

  const filteredPatients = useMemo(() => {
    const q = search.toLowerCase();
    return patients.filter((patient) => patient.name.toLowerCase().includes(q));
  }, [patients, search]);

  const day = dailyData[selectedDay] ?? mapTrackingToDay(weekDates[selectedDay] ?? formatLocalDate(new Date()), []);
  const weekMealAvg = dailyData.length > 0
    ? Math.round(dailyData.reduce((sum, item) => sum + item.mealPct, 0) / dailyData.length)
    : 0;
  const weekExerciseAvg = dailyData.length > 0
    ? Math.round(dailyData.reduce((sum, item) => sum + item.exercisePct, 0) / dailyData.length)
    : 0;
  const weekCalories = dailyData.reduce((sum, item) => sum + item.registeredCalories, 0);
  const totalMeals = dailyData.reduce((sum, item) => sum + item.meals.length, 0);
  const totalDoneMeals = dailyData.reduce((sum, item) => sum + item.meals.filter((meal) => meal.done).length, 0);
  const totalExercises = dailyData.reduce((sum, item) => sum + item.exercises.length, 0);
  const totalDoneExercises = dailyData.reduce((sum, item) => sum + item.exercises.filter((exercise) => exercise.done).length, 0);

  const kpis = [
    { label: "Cumplimiento Alimentario", value: `${weekMealAvg}%`, icon: Utensils, high: weekMealAvg >= 70 },
    { label: "Cumplimiento Ejercicio", value: `${weekExerciseAvg}%`, icon: Activity, high: weekExerciseAvg >= 70 },
    { label: "Comidas Cumplidas", value: `${totalDoneMeals}/${totalMeals}`, icon: Check, high: totalMeals > 0 && totalDoneMeals / totalMeals >= 0.7 },
    { label: "Ejercicios Cumplidos", value: `${totalDoneExercises}/${totalExercises}`, icon: Activity, high: totalExercises > 0 && totalDoneExercises / totalExercises >= 0.7 },
    { label: "Calorias Registradas", value: `${weekCalories.toLocaleString()} kcal`, icon: Flame, high: true },
    { label: "Dias con Registro", value: `${dailyData.filter((item) => item.meals.length > 0 || item.exercises.length > 0).length}/5`, icon: CalendarDays, high: true },
  ];

  const chartData = dailyData.map((item) => ({
    dia: item.shortLabel,
    "Adherencia alimentos": item.mealPct,
    "Adherencia ejercicio": item.exercisePct,
    Planificadas: item.plannedCalories,
    Registradas: item.registeredCalories,
  }));

  if (!selectedPatient) {
    return (
      <AppLayout>
        <div className="space-y-6 min-w-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Seguimiento</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Selecciona un paciente para revisar su seguimiento alimentario.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-muted pl-9 text-sm"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <p className="text-xs text-muted-foreground">{filteredPatients.length} pacientes disponibles</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Paciente</th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Estado</th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Adherencia</th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Ultima Evaluacion</th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPatients && (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">Cargando pacientes...</td>
                    </tr>
                  )}
                  {!loadingPatients && filteredPatients.map((patient) => (
                    <tr key={patient.id} className="border-b border-border transition-colors last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-border">
                            <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">{patient.initials}</AvatarFallback>
                          </Avatar>
                          <p className="font-medium text-foreground">{patient.name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3"><Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 text-[11px]">{patient.status}</Badge></td>
                      <td className="px-5 py-3"><Badge variant="outline" className={`text-[11px] ${getLevel(patient.adherence === "Alta" ? 90 : patient.adherence === "Media" ? 60 : 30).className}`}>{patient.adherence}</Badge></td>
                      <td className="px-5 py-3 text-muted-foreground">{patient.lastEvaluation}</td>
                      <td className="px-5 py-3">
                        <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-primary" onClick={() => setSelectedPatient(patient)}>
                          <Eye className="h-3.5 w-3.5" />
                          Ver seguimiento
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!loadingPatients && filteredPatients.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">No se encontraron pacientes.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 min-w-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedPatient(null)} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">Seguimiento - {selectedPatient.name}</h1>
                <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 text-[11px]">{selectedPatient.status}</Badge>
                <Badge variant="outline" className={`text-[11px] ${getLevel(weekMealAvg).className}`}>{getLevel(weekMealAvg).label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Semana del {formatDisplayDate(weekDates[0])} al {formatDisplayDate(weekDates[4])}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={weekDates[selectedDay]}
              onChange={(e) => {
                setWeekDates(getWeekDates(e.target.value));
                setSelectedDay(getDayIndex(e.target.value));
              }}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="text-right mr-2">
              <p className={`text-3xl font-bold ${pctColor(weekMealAvg)}`}>{weekMealAvg}%</p>
              <p className="text-[11px] text-muted-foreground">adherencia semanal</p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDay(Math.max(0, selectedDay - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium text-foreground px-2 min-w-[100px] text-center">{day.shortLabel}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDay(Math.min(4, selectedDay + 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

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
            </div>
          ))}
        </div>

        {loadingTracking && (
          <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">Cargando seguimiento alimentario...</div>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-xl border border-border bg-card xl:col-span-2">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-sm font-semibold text-foreground">Comidas del Dia</h3>
              <p className="text-xs text-muted-foreground">{day.meals.filter((m) => m.done).length} de {day.meals.length} cumplidas</p>
            </div>
            <div className="divide-y divide-border">
              {day.meals.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">No hay registros de comidas para este dia.</div>
              ) : day.meals.map((meal, index) => (
                <div key={`${meal.name}-${index}`} className="flex items-center gap-3 px-5 py-3">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${meal.done ? "bg-emerald-500/15 text-emerald-400" : "bg-accent/15 text-accent"}`}>
                    {meal.done ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${meal.done ? "text-foreground" : "text-muted-foreground"}`}>{meal.name}</p>
                    <p className="text-[11px] text-muted-foreground">{meal.plate}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-foreground">{meal.calories} kcal</p>
                    <p className="text-[11px] text-muted-foreground">{meal.actual ?? "--:--"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-5">
            <h3 className="text-sm font-semibold text-foreground">Indicadores de Adherencia</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Alimentos diario</span>
                  <span className={`font-semibold ${pctColor(day.mealPct)}`}>{day.mealPct}%</span>
                </div>
                <Progress value={day.mealPct} className="h-3" />
                <p className={`text-[11px] font-medium ${pctColor(day.mealPct)}`}>{getLevel(day.mealPct).label}</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Ejercicio diario</span>
                  <span className={`font-semibold ${pctColor(day.exercisePct)}`}>{day.exercisePct}%</span>
                </div>
                <Progress value={day.exercisePct} className="h-3" />
                <p className={`text-[11px] font-medium ${pctColor(day.exercisePct)}`}>{getLevel(day.exercisePct).label}</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Alimentos semanal</span>
                  <span className={`font-semibold ${pctColor(weekMealAvg)}`}>{weekMealAvg}%</span>
                </div>
                <Progress value={weekMealAvg} className="h-3" />
                <p className={`text-[11px] font-medium ${pctColor(weekMealAvg)}`}>{getLevel(weekMealAvg).label}</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Ejercicio semanal</span>
                  <span className={`font-semibold ${pctColor(weekExerciseAvg)}`}>{weekExerciseAvg}%</span>
                </div>
                <Progress value={weekExerciseAvg} className="h-3" />
                <p className={`text-[11px] font-medium ${pctColor(weekExerciseAvg)}`}>{getLevel(weekExerciseAvg).label}</p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-muted-foreground">Adherencia por dia</p>
              {dailyData.map((dd, i) => (
                <button
                  key={dd.date}
                  onClick={() => setSelectedDay(i)}
                  className={`w-full flex items-center gap-3 rounded-md px-2 py-1 transition-colors ${i === selectedDay ? "bg-muted" : "hover:bg-muted/30"}`}
                >
                  <span className="text-[11px] text-muted-foreground w-16 text-left shrink-0">{dd.shortLabel}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${dd.mealPct >= 70 ? "bg-primary" : "bg-accent"}`} style={{ width: `${dd.mealPct}%` }} />
                  </div>
                  <span className={`text-[11px] font-medium w-8 text-right ${pctColor(dd.mealPct)}`}>{dd.mealPct}%</span>
                  <span className={`text-[11px] font-medium w-8 text-right ${pctColor(dd.exercisePct)}`}>{dd.exercisePct}%</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-1 text-sm font-semibold text-foreground">Adherencia Semanal</h3>
            <p className="mb-5 text-xs text-muted-foreground">Porcentaje de comidas y ejercicios realizados por dia</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" />
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip content={<ChartTooltip />} />
                <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Adherencia alimentos" name="Adherencia alimentos" stroke="#e5b106" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Adherencia ejercicio" name="Adherencia ejercicio" stroke="#22c55e" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-1 text-sm font-semibold text-foreground">Calorias Planificadas vs Registradas</h3>
            <p className="mb-5 text-xs text-muted-foreground">Comparacion semanal entre calorias del plan y comidas realizadas</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend verticalAlign="top" align="right" iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Planificadas" fill="#e5b106" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Registradas" fill="#cc8c02" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Seguimiento;
