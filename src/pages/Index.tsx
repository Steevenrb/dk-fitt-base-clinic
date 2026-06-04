import { useEffect, useMemo, useState } from "react";
import { Activity, ClipboardCheck, TrendingDown, Users } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { KpiCards, type DashboardKpi } from "@/components/dashboard/KpiCards";
import { WeightChart, type DashboardWeightPoint, type WeightPatientOption } from "@/components/dashboard/WeightChart";
import { CaloriesChart, type DashboardCaloriePoint } from "@/components/dashboard/CaloriesChart";
import { PatientsTable, type DashboardPatient } from "@/components/dashboard/PatientsTable";
import { AlertsPanel, type DashboardAlert } from "@/components/dashboard/AlertsPanel";
import { apiRequest, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ACCESS_TOKEN_KEY = "dkfitt-access-token";
const DASHBOARD_WEIGHT_SELECTION_KEY = "dkfitt-dashboard-weight-selection";
const PLAN_STATUS_OVERRIDES_KEY = "dkfitt-plan-status-overrides";
const PATIENTS_ENDPOINTS = ["/api/patients", "/patients", "/api/pacientes"];
const WEIGHT_RECORDS_CHART_ENDPOINTS = ["/api/weight-records", "/weight-records"];
const CALORIE_CONTROL_PATIENT_ENDPOINTS = ["/api/calorie-control/patient", "/calorie-control/patient"];

type AdherenceLevel = "alto" | "medio" | "bajo" | "sin-plan";

type DashboardPatientRow = {
  id: number;
  trackingId: number;
  name: string;
  status: string;
  adherence: AdherenceLevel;
  lastRecord: string;
};

type ApiAlert = {
  id_alerta_sistema: number;
  tipo: DashboardAlert["type"];
  mensaje: string;
  nombre_paciente: string;
  fecha_generacion: string;
  revisada: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeName(value?: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const parsed = Number(value.replace(/[^\d,.-]/g, "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function extractList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw.filter(isRecord);
  if (!isRecord(raw)) return [];
  if (Array.isArray(raw.data)) return raw.data.filter(isRecord);
  if (Array.isArray(raw.patients)) return raw.patients.filter(isRecord);
  if (Array.isArray(raw.pacientes)) return raw.pacientes.filter(isRecord);
  if (isRecord(raw.data)) {
    if (Array.isArray(raw.data.patients)) return raw.data.patients.filter(isRecord);
    if (Array.isArray(raw.data.pacientes)) return raw.data.pacientes.filter(isRecord);
    if (Array.isArray(raw.data.items)) return raw.data.items.filter(isRecord);
    if (Array.isArray(raw.data.results)) return raw.data.results.filter(isRecord);
  }
  return [];
}

function unwrapData(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;
  return raw.data ?? raw;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getWeekDates(date = new Date()): string[] {
  const day = date.getDay();
  const diff = day === 0 ? -6 : day === 6 ? -5 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return Array.from({ length: 5 }, (_, index) => {
    const current = new Date(monday);
    current.setDate(monday.getDate() + index);
    return formatLocalDate(current);
  });
}

function formatWeekSubtitle(weekDates: string[]): string {
  const first = parseDateKey(weekDates[0]);
  const last = parseDateKey(weekDates[weekDates.length - 1]);
  return `Resumen clinico - semana del ${first.toLocaleDateString("es-EC", { day: "2-digit", month: "long" })} al ${last.toLocaleDateString("es-EC", { day: "2-digit", month: "long", year: "numeric" })}`;
}

function formatCompactWeekLabel(weekDates: string[]): string {
  const first = parseDateKey(weekDates[0]);
  const last = parseDateKey(weekDates[weekDates.length - 1]);
  return `${first.toLocaleDateString("es-EC", { day: "2-digit", month: "short" })} - ${last.toLocaleDateString("es-EC", { day: "2-digit", month: "short" })}`;
}

function formatShortDate(value: unknown): string {
  if (!value) return "---";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "---";
  return date.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
}

function formatChartDateLabel(value: unknown): string {
  const key = dateKeyFromApi(value);
  if (!key) return "";
  return parseDateKey(key).toLocaleDateString("es-EC", { day: "2-digit", month: "short" }).replace(/\s/g, "-");
}

function dateKeyFromApi(value: unknown): string {
  const raw = String(value || "");
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? "" : formatLocalDate(date);
}

function normalizeAdherence(value: unknown): AdherenceLevel {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "alto" || raw === "alta") return "alto";
  if (raw === "bajo" || raw === "baja") return "bajo";
  return "medio";
}

function adherenceScore(level: AdherenceLevel): number {
  if (level === "alto") return 90;
  if (level === "medio") return 60;
  if (level === "bajo") return 30;
  return 0;
}

function mapPatient(item: Record<string, unknown>, index: number): DashboardPatientRow {
  const nombres = String(item.nombres ?? item.nombre ?? "").trim();
  const apellidos = String(item.apellidos ?? "").trim();
  const name = `${nombres} ${apellidos}`.trim() || String(item.nombre_completo ?? item.name ?? "Paciente");
  const id = Number(item.id_usuario ?? item.id_paciente ?? item.id ?? index + 1);
  const trackingId = Number(item.id_perfil ?? item.perfil_id ?? item.profile_id ?? item.id_paciente ?? id);

  return {
    id,
    trackingId,
    name,
    status: String(item.estado_tratamiento ?? item.estado_plan ?? item.estado ?? "").toLowerCase(),
    adherence: normalizeAdherence(item.nivel_adherencia ?? item.adherencia ?? item.adherence_level),
    lastRecord: formatShortDate(item.ultima_evaluacion ?? item.fecha_ultima_evaluacion ?? item.last_evaluation_date),
  };
}

async function requestFirstOk<T>(paths: string[], token: string): Promise<T> {
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

async function requestWithBaseFallback(bases: string[], buildPath: (base: string) => string, token: string): Promise<unknown> {
  let lastError: unknown;
  for (const base of bases) {
    try {
      return await apiRequest<unknown>(buildPath(base), { method: "GET", accessToken: token });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function isApiStatus(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.status === status;
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function settleSequential<T, R>(items: T[], mapper: (item: T) => Promise<R>, delayMs = 120): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  for (const item of items) {
    try {
      results.push({ status: "fulfilled", value: await mapper(item) });
    } catch (reason) {
      results.push({ status: "rejected", reason });
    }
    if (delayMs > 0) await wait(delayMs);
  }
  return results;
}

function buildKpis(patients: DashboardPatientRow[], alerts: ApiAlert[]): DashboardKpi[] {
  const activePatients = patients.filter((patient) => patient.status === "activo");
  const adherenceAvg = activePatients.length
    ? Math.round(activePatients.reduce((sum, patient) => sum + adherenceScore(patient.adherence), 0) / activePatients.length)
    : 0;
  const lowAdherence = activePatients.filter((patient) => patient.adherence === "bajo").length;
  const activePlans = activePatients.length;
  const weeklyProgress = activePatients.length
    ? Math.round((activePatients.filter((patient) => patient.adherence !== "bajo").length / activePatients.length) * 100)
    : 0;
  const pendingAlerts = alerts.filter((alert) => !alert.revisada).length;

  return [
    { label: "Adherencia Promedio", value: activePatients.length ? `${adherenceAvg}%` : "---", change: `${activePatients.length} planes activos`, trend: "up", icon: Activity, variant: "primary" },
    { label: "Baja Adherencia", value: String(lowAdherence), change: `${pendingAlerts} alertas sin revisar`, trend: lowAdherence > 0 ? "down" : "up", icon: TrendingDown, variant: lowAdherence > 0 ? "accent" : "primary" },
    { label: "Planes Activos", value: String(activePlans), change: `${patients.length} pacientes registrados`, trend: "up", icon: ClipboardCheck, variant: "primary" },
    { label: "Progreso Semanal", value: patients.length ? `${weeklyProgress}%` : "---", change: "Adherencia media/alta", trend: "up", icon: Users, variant: "primary" },
  ];
}

function buildPatientsTable(patients: DashboardPatientRow[], alerts: ApiAlert[]): DashboardPatient[] {
  return patients.slice(0, 8).map((patient) => {
    const patientKey = normalizeName(patient.name);
    const hasAlert = alerts.some((alert) => {
      const alertKey = normalizeName(alert.nombre_paciente);
      return !alert.revisada && (alertKey === patientKey || alertKey.includes(patientKey) || patientKey.includes(alertKey));
    });
    return {
      name: patient.name,
      adherence: patient.status === "activo" ? patient.adherence : "sin-plan",
      lastRecord: patient.lastRecord,
      hasAlert,
    };
  });
}

function buildAlertsPanel(alerts: ApiAlert[]): DashboardAlert[] {
  return alerts
    .filter((alert) => !alert.revisada)
    .sort((a, b) => new Date(b.fecha_generacion).getTime() - new Date(a.fecha_generacion).getTime())
    .slice(0, 5)
    .map((alert) => ({
      type: alert.tipo,
      patient: alert.nombre_paciente || "Paciente",
      date: formatShortDate(alert.fecha_generacion).replace(/\s\d{4}$/, ""),
      description: alert.mensaje,
      urgent: alert.tipo === "adherencia" || alert.tipo === "exceso_calorico",
    }));
}

function extractWeightRows(raw: unknown): Record<string, unknown>[] {
  const data = unwrapData(raw);
  if (Array.isArray(data)) return data.filter(isRecord);
  if (isRecord(data)) {
    if (Array.isArray(data.serie)) return data.serie.filter(isRecord);
    if (Array.isArray(data.data)) return data.data.filter(isRecord);
    if (Array.isArray(data.items)) return data.items.filter(isRecord);
    if (Array.isArray(data.results)) return data.results.filter(isRecord);
  }
  return extractList(raw);
}

type WeightPatientRows = { patient: DashboardPatientRow; rows: Record<string, unknown>[] };

function weightPatientId(item: WeightPatientRows): string {
  return String(item.patient.trackingId || item.patient.id);
}

function buildWeightChart(weightsByPatient: WeightPatientRows[], selectedIds: string[]): { data: DashboardWeightPoint[]; series: string[]; options: WeightPatientOption[] } {
  const availablePatients = weightsByPatient;
  const selectedPatients = availablePatients.filter((item) => selectedIds.includes(weightPatientId(item))).slice(0, 3);
  const series = selectedPatients
    .filter((item) => item.rows.length > 0)
    .map((item) => item.patient.name.split(/\s+/).slice(0, 2).join(" "));
  const labels = Array.from(new Set(selectedPatients.flatMap((item) =>
    item.rows.map((row) => dateKeyFromApi(row.fecha ?? row.fecha_registro ?? row.date ?? row.created_at)).filter(Boolean)
  ))).sort((a, b) => parseDateKey(a).getTime() - parseDateKey(b).getTime()).slice(-8);
  const data = labels.map((dateKey) => {
    const point: DashboardWeightPoint = { semana: formatChartDateLabel(dateKey) };
    selectedPatients.forEach((item) => {
      const key = item.patient.name.split(/\s+/).slice(0, 2).join(" ");
      const row = item.rows.find((candidate) => dateKeyFromApi(candidate.fecha ?? candidate.fecha_registro ?? candidate.date ?? candidate.created_at) === dateKey);
      const weight = parseNumber(row?.peso_kg ?? row?.peso ?? row?.peso_actual);
      if (weight !== undefined) point[key] = weight;
    });
    return point;
  });

  const options = availablePatients.map((item) => ({
    id: weightPatientId(item),
    name: item.rows.length > 0 ? item.patient.name : `${item.patient.name} (sin registros)`,
  }));

  return { data, series, options };
}

function buildCalorieChart(histories: unknown[], weekDates: string[]): DashboardCaloriePoint[] {
  const labels = ["Lun", "Mar", "Mie", "Jue", "Vie"];
  return weekDates.map((dateKey, index) => {
    const records = histories
      .flatMap((history) => extractList(history))
      .filter((record) => dateKeyFromApi(record.fecha ?? record.date) === dateKey);

    const plannedValues = records.map((record) => parseNumber(record.calorias_objetivo ?? record.meta_calorica)).filter((value): value is number => value !== undefined);
    const consumedValues = records.map((record) => parseNumber(record.calorias_totales_consumidas ?? record.calorias_consumidas)).filter((value): value is number => value !== undefined);

    const planned = plannedValues.length ? Math.round(plannedValues.reduce((sum, value) => sum + value, 0) / plannedValues.length) : 0;
    const consumed = consumedValues.length ? Math.round(consumedValues.reduce((sum, value) => sum + value, 0) / consumedValues.length) : 0;

    return { dia: labels[index], Planificadas: planned, Consumidas: consumed };
  });
}

function readSavedWeightSelection(): string[] {
  try {
    const raw = localStorage.getItem(DASHBOARD_WEIGHT_SELECTION_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String).slice(0, 3) : [];
  } catch {
    return [];
  }
}

function saveWeightSelection(ids: string[]) {
  localStorage.setItem(DASHBOARD_WEIGHT_SELECTION_KEY, JSON.stringify(ids.slice(0, 3)));
}

function readPlanStatusOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PLAN_STATUS_OVERRIDES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return isRecord(parsed) ? Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, String(value)])) : {};
  } catch {
    return {};
  }
}

function applyPlanStatusOverrides(patients: DashboardPatientRow[]): DashboardPatientRow[] {
  const overrides = readPlanStatusOverrides();
  return patients.map((patient) => {
    const override = overrides[String(patient.trackingId)] ?? overrides[String(patient.id)];
    return override ? { ...patient, status: override.toLowerCase() } : patient;
  });
}

const Index = () => {
  const { toast } = useToast();
  const weekDates = useMemo(() => getWeekDates(), []);
  const [refreshToken, setRefreshToken] = useState(0);
  const [patients, setPatients] = useState<DashboardPatientRow[]>([]);
  const [alerts, setAlerts] = useState<ApiAlert[]>([]);
  const [weightRows, setWeightRows] = useState<WeightPatientRows[]>([]);
  const [selectedWeightPatientIds, setSelectedWeightPatientIds] = useState<string[]>([]);
  const [weightPatientOptions, setWeightPatientOptions] = useState<WeightPatientOption[]>([]);
  const [weightData, setWeightData] = useState<DashboardWeightPoint[]>([]);
  const [weightSeries, setWeightSeries] = useState<string[]>([]);
  const [calorieData, setCalorieData] = useState<DashboardCaloriePoint[]>([]);
  const [loadingMain, setLoadingMain] = useState(true);
  const [loadingWeight, setLoadingWeight] = useState(true);
  const [loadingCalories, setLoadingCalories] = useState(true);

  useEffect(() => {
    let lastRefresh = Date.now();
    const refreshDashboard = (force = false) => {
      const now = Date.now();
      if (!force && now - lastRefresh < 60_000) return;
      lastRefresh = now;
      setRefreshToken((current) => current + 1);
    };
    const throttledRefreshDashboard = () => refreshDashboard();
    const forceRefreshDashboard = () => refreshDashboard(true);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshDashboard();
    };

    window.addEventListener("focus", throttledRefreshDashboard);
    window.addEventListener("dkfitt-patient-data-updated", throttledRefreshDashboard);
    window.addEventListener("dkfitt-plan-data-updated", forceRefreshDashboard);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const intervalId = window.setInterval(refreshDashboard, 600000);

    return () => {
      window.removeEventListener("focus", throttledRefreshDashboard);
      window.removeEventListener("dkfitt-patient-data-updated", throttledRefreshDashboard);
      window.removeEventListener("dkfitt-plan-data-updated", forceRefreshDashboard);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchDashboard = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) {
        setLoadingMain(false);
        setLoadingWeight(false);
        setLoadingCalories(false);
        toast({ title: "Sesion no valida", description: "No se encontro token de acceso.", variant: "destructive" });
        return;
      }

      const initialLoad = patients.length === 0 && alerts.length === 0 && weightRows.length === 0 && calorieData.length === 0;
      if (initialLoad) {
        setLoadingMain(true);
        setLoadingWeight(true);
        setLoadingCalories(true);
      }
      try {
        const [patientsResult, alertsResult] = await Promise.allSettled([
          requestFirstOk<unknown>(PATIENTS_ENDPOINTS, token),
          apiRequest<{ data?: ApiAlert[] }>("/alerts?page=1&limit=100", { method: "GET", accessToken: token }),
        ]);

        const patientRows = patientsResult.status === "fulfilled"
          ? extractList(patientsResult.value).map((item, index) => mapPatient(item, index))
          : [];
        const patientRowsWithOverrides = applyPlanStatusOverrides(patientRows);
        const alertRows = alertsResult.status === "fulfilled" && Array.isArray(alertsResult.value.data)
          ? alertsResult.value.data
          : [];

        if (cancelled) return;
        setPatients(patientRowsWithOverrides);
        setAlerts(alertRows);
        setLoadingMain(false);

        if (patientsResult.status === "rejected" && !isApiStatus(patientsResult.reason, 429)) {
          toast({ title: "No se pudo cargar pacientes", description: "Intenta actualizar la pagina en unos momentos.", variant: "destructive" });
        }

        const activeChartPatients = patientRowsWithOverrides.filter((patient) => patient.trackingId && patient.status === "activo");
        const savedWeightIds = readSavedWeightSelection();
        const chartPatients = (
          savedWeightIds.length > 0
            ? activeChartPatients.filter((patient) => savedWeightIds.includes(String(patient.trackingId || patient.id))).slice(0, 3)
            : activeChartPatients.slice(0, 3)
        );
        const caloriePatients = patientRowsWithOverrides.filter((patient) => patient.trackingId && patient.status === "activo");

        const [weightResults, calorieResults] = await Promise.all([
          settleSequential(chartPatients, async (patient) => {
            const raw = await requestWithBaseFallback(WEIGHT_RECORDS_CHART_ENDPOINTS, (base) => `${base}/patient/${patient.trackingId}/chart`, token);
            const rows = extractWeightRows(raw)
              .sort((a, b) => new Date(String(a.fecha ?? a.fecha_registro ?? a.date ?? a.created_at ?? "")).getTime() - new Date(String(b.fecha ?? b.fecha_registro ?? b.date ?? b.created_at ?? "")).getTime())
              .slice(-8);
            return { patient, rows };
          }),
          settleSequential(caloriePatients, (patient) =>
            requestWithBaseFallback(CALORIE_CONTROL_PATIENT_ENDPOINTS, (base) => `${base}/${patient.trackingId}/history`, token)
          ),
        ]);

        const weightsByPatient = weightResults
          .filter((result): result is PromiseFulfilledResult<{ patient: DashboardPatientRow; rows: Record<string, unknown>[] }> => result.status === "fulfilled")
          .map((result) => result.value);
        if (cancelled) return;
        setWeightRows(weightsByPatient);
        const availableIds = weightsByPatient.map(weightPatientId);
        const savedIds = readSavedWeightSelection().filter((id) => availableIds.includes(id));
        const selectedIds = savedIds.length > 0 ? savedIds.slice(0, 3) : availableIds.slice(0, 3);
        setSelectedWeightPatientIds(selectedIds);
        const weight = buildWeightChart(weightsByPatient, selectedIds);
        setWeightData(weight.data);
        setWeightSeries(weight.series);
        setWeightPatientOptions(weight.options);
        setLoadingWeight(false);

        const calorieHistories = calorieResults
          .filter((result): result is PromiseFulfilledResult<unknown> => result.status === "fulfilled")
          .map((result) => result.value);
        if (cancelled) return;
        setCalorieData(buildCalorieChart(calorieHistories, weekDates));
        setLoadingCalories(false);
      } catch (error) {
        if (!isApiStatus(error, 429)) {
          toast({
            title: "No se pudo actualizar el dashboard",
            description: "Intenta nuevamente en unos momentos.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setLoadingMain(false);
          setLoadingWeight(false);
          setLoadingCalories(false);
        }
      }
    };

    void fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, [toast, weekDates, refreshToken]);

  useEffect(() => {
    const weight = buildWeightChart(weightRows, selectedWeightPatientIds);
    setWeightData(weight.data);
    setWeightSeries(weight.series);
    setWeightPatientOptions(weight.options);
  }, [weightRows, selectedWeightPatientIds]);

  const toggleWeightPatient = (id: string) => {
    setSelectedWeightPatientIds((current) => {
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length >= 3
          ? current
          : [...current, id];
      saveWeightSelection(next);
      return next;
    });
  };

  const kpis = useMemo(() => buildKpis(patients, alerts), [patients, alerts]);
  const tablePatients = useMemo(() => buildPatientsTable(patients, alerts), [patients, alerts]);
  const panelAlerts = useMemo(() => buildAlertsPanel(alerts), [alerts]);

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1480px] space-y-5">
        <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card/70 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex w-fit items-center rounded-full border border-[#F7CA5E]/50 bg-[#F7CA5E]/15 px-3 py-1 text-xs font-semibold text-foreground">
              Seguimiento nutricional
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Dashboard</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{formatWeekSubtitle(weekDates)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
            <div className="rounded-xl bg-background/55 px-3.5 py-2.5">
              <p className="text-xs font-medium text-muted-foreground">Pacientes</p>
              <p className="mt-1 text-xl font-bold text-foreground">{loadingMain ? "..." : patients.length}</p>
            </div>
            <div className="rounded-xl bg-background/55 px-3.5 py-2.5">
              <p className="text-xs font-medium text-muted-foreground">Alertas</p>
              <p className="mt-1 text-xl font-bold text-foreground">{loadingMain ? "..." : panelAlerts.length}</p>
            </div>
          </div>
        </div>

        <KpiCards kpis={kpis} loading={loadingMain} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)]">
          <div className="space-y-4">
            <WeightChart
              data={weightData}
              series={weightSeries}
              loading={loadingWeight}
              patients={weightPatientOptions}
              selectedPatientIds={selectedWeightPatientIds}
              onTogglePatient={toggleWeightPatient}
            />
            <PatientsTable patients={tablePatients} loading={loadingMain} />
          </div>
          <div className="space-y-4">
            <CaloriesChart
              data={calorieData}
              loading={loadingCalories}
              weekLabel={formatCompactWeekLabel(weekDates)}
            />
            <AlertsPanel alerts={panelAlerts} loading={loadingMain} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
