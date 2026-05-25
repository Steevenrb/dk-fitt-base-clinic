import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Droplets, Dumbbell, TrendingUp, TrendingDown } from "lucide-react";
import * as echarts from "echarts";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ACCESS_TOKEN_KEY = "dkfitt-access-token";
const DASHBOARD_PATIENT_ENDPOINTS = ["/api/dashboard/patient", "/dashboard/patient"];
const CLINICAL_EVALUATION_ENDPOINTS = [
  "/api/clinical-evaluations",
  "/clinical-evaluations",
  "/api/clinical-evaluation",
  "/clinical-evaluation",
];
const WEIGHT_RECORDS_CHART_ENDPOINTS = ["/api/weight-records", "/weight-records"];

type SummaryMetric = {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  positiveWhen: "up" | "down";
  icon: typeof Activity;
};

type ChartPoint = {
  fecha: string;
  fechaRaw: string;
  peso: number;
};

type BalanceView = {
  planned: string;
  consumed: string;
  balanceLabel: string;
  balanceSub: string;
  highlight: boolean;
};

type SummaryView = {
  metrics: SummaryMetric[];
  chartData: ChartPoint[];
  weightSummary: WeightSummary;
  balance: BalanceView;
};

type WeightSummary = {
  totalRegistros: string;
  pesoInicial: string;
  pesoActual: string;
  variacionTotal: string;
  periodoDias: string;
};

const defaultSummary = (): SummaryView => ({
  metrics: [
    { label: "Peso Actual", value: "---", change: "Sin comparación", trend: "down", positiveWhen: "down", icon: Activity },
    { label: "% Grasa Corporal", value: "---", change: "Sin comparación", trend: "down", positiveWhen: "down", icon: Droplets },
    { label: "Masa Muscular", value: "---", change: "Sin comparación", trend: "up", positiveWhen: "up", icon: Dumbbell },
    { label: "Adherencia General", value: "---", change: "Sin comparación", trend: "up", positiveWhen: "up", icon: TrendingUp },
  ],
  chartData: [],
  weightSummary: {
    totalRegistros: "---",
    pesoInicial: "---",
    pesoActual: "---",
    variacionTotal: "Sin comparación",
    periodoDias: "---",
  },
  balance: {
    planned: "---",
    consumed: "---",
    balanceLabel: "Sin datos",
    balanceSub: "No se encontro balance semanal",
    highlight: false,
  },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function unwrapData(value: unknown): unknown {
  if (!isRecord(value)) return value;

  const candidates = [value.data, isRecord(value.data) ? value.data.data : undefined, value.perfil, value.dashboard, value.summary, value.metricas].filter((candidate) => candidate !== undefined);
  return candidates[0] ?? value;
}

function getValueByPath(source: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = source;

  for (const part of parts) {
    if (!isRecord(current)) return undefined;
    current = current[part];
  }

  return current;
}

function findFirstValue(source: unknown, keys: string[], depth = 3): unknown {
  if (depth < 0 || source === null || source === undefined) return undefined;

  if (Array.isArray(source)) {
    for (const item of source) {
      const found = findFirstValue(item, keys, depth - 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  if (!isRecord(source)) return undefined;

  for (const key of keys) {
    const value = key.includes(".") ? getValueByPath(source, key) : source[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  for (const value of Object.values(source)) {
    const found = findFirstValue(value, keys, depth - 1);
    if (found !== undefined) return found;
  }

  return undefined;
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;

  const cleaned = value.replace(/[^\d,.-]/g, "").replace(/,/g, "");
  if (!cleaned) return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatNumber(value: number | undefined, unit = "", digits = 1): string {
  if (value === undefined || Number.isNaN(value)) return "---";
  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(digits);
  return `${formatted}${unit}`;
}

function formatDelta(value: number | undefined, unit = "", digits = 1): string {
  if (value === undefined || Number.isNaN(value)) return "Sin comparación";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, unit, digits)}`;
}

function formatDateLabel(value: unknown): string {
  if (!value) return "---";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const utcDate = new Date(Date.UTC(year, month, day));
  return utcDate.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

function extractArray(source: unknown, keys: string[] = ["items", "rows", "results", "evaluations", "trends", "data"]): Record<string, unknown>[] {
  const unwrapped = unwrapData(source);
  if (Array.isArray(unwrapped)) return unwrapped.filter(isRecord);
  if (!isRecord(unwrapped)) return [];

  for (const key of keys) {
    const candidate = unwrapped[key];
    if (Array.isArray(candidate)) return candidate.filter(isRecord);
  }

  for (const value of Object.values(unwrapped)) {
    const nested = extractArray(value, keys);
    if (nested.length > 0) return nested;
  }

  return [];
}

function buildBalanceView(source: unknown): BalanceView {
  const planned = parseNumber(findFirstValue(source, ["calorias_planificadas", "calorias_planeadas", "calorias_objetivo", "planned_calories", "target_calories"]));
  const consumed = parseNumber(findFirstValue(source, ["calorias_consumidas", "calorias_reales", "consumed_calories", "real_calories"]));
  const balance = parseNumber(findFirstValue(source, ["balance_calorico", "caloric_balance", "balance", "diferencia_calorica", "delta_calorias"]));

  const inferredBalance = balance ?? ((consumed !== undefined && planned !== undefined) ? consumed - planned : undefined);
  const balanceLabel = inferredBalance === undefined ? "Sin datos" : inferredBalance > 0 ? "Superavit leve" : inferredBalance < 0 ? "Deficit leve" : "Equilibrio";
  const balanceSub = inferredBalance === undefined ? "No se encontro balance semanal" : `${formatDelta(inferredBalance, " kcal/dia", 0)}`;

  return {
    planned: formatNumber(planned, " kcal"),
    consumed: formatNumber(consumed, " kcal"),
    balanceLabel,
    balanceSub,
    highlight: Boolean(inferredBalance !== undefined && inferredBalance !== 0),
  };
}

function buildChartData(source: unknown): ChartPoint[] {
  const records = (() => {
    const unwrapped = unwrapData(source);
    if (isRecord(unwrapped) && Array.isArray(unwrapped.serie)) return unwrapped.serie.filter(isRecord);
    if (Array.isArray(unwrapped)) return unwrapped.filter(isRecord);
    return extractArray(source, ["serie", "data", "items", "rows", "results"]);
  })();

  return records
    .map((item) => {
      const fechaRaw = String(findFirstValue(item, ["fecha", "fecha_atencion", "fecha_evaluacion", "created_at", "createdAt"]) ?? "");
      return {
        fecha: formatDateLabel(fechaRaw),
        fechaRaw,
        peso: parseNumber(findFirstValue(item, ["peso_actual", "peso_kg", "peso", "weight"])) ?? 0,
      };
    })
    .filter((item) => item.peso > 0)
    .sort((left, right) => new Date(left.fechaRaw).getTime() - new Date(right.fechaRaw).getTime());
}

function getLatestEvaluations(source: unknown): Record<string, unknown>[] {
  const records = extractArray(source, ["evaluaciones", "data", "items", "rows", "results"]);

  return records
    .map((item) => ({
      ...item,
      __date: String(findFirstValue(item, ["fecha_atencion", "fecha_evaluacion", "fecha", "created_at", "createdAt"]) ?? ""),
    }))
    .sort((left, right) => new Date(String(right["__date"])).getTime() - new Date(String(left["__date"])).getTime())
    .slice(0, 2);
}

function buildSummaryView(dashboardSource: unknown, evaluationsSource: unknown, weightChartSource: unknown): SummaryView {
  const dashboard = unwrapData(dashboardSource);
  const latestEvaluations = getLatestEvaluations(evaluationsSource);
  const latest = latestEvaluations[0];
  const previous = latestEvaluations[1];
  const weightChartPayload = unwrapData(weightChartSource);
  const weightSeries = buildChartData(weightChartPayload);
  const latestWeightPoint = weightSeries.length > 0 ? weightSeries[weightSeries.length - 1] : undefined;
  const previousWeightPoint = weightSeries.length > 1 ? weightSeries[weightSeries.length - 2] : undefined;

  const currentWeight = parseNumber(findFirstValue(weightChartPayload, [
    "peso_actual",
    "peso_fin",
    "current_weight",
  ])) ?? latestWeightPoint?.peso;
  const previousWeight = previousWeightPoint?.peso;

  const currentFat = parseNumber(findFirstValue(latest, ["porcentaje_grasa", "grasa", "grasa_corporal_pct"]));
  const previousFat = parseNumber(findFirstValue(previous, ["porcentaje_grasa", "grasa", "grasa_corporal_pct"]));

  const currentMuscle = parseNumber(findFirstValue(latest, ["masa_muscular", "masa_muscular_kg", "musculo", "muscle_mass_kg"]));
  const previousMuscle = parseNumber(findFirstValue(previous, ["masa_muscular", "masa_muscular_kg", "musculo", "muscle_mass_kg"]));

  const currentAdherence = parseNumber(findFirstValue(latest, ["adherencia_general", "adherencia_pct", "adherence", "adherence_pct"]));
  const previousAdherence = parseNumber(findFirstValue(previous, ["adherencia_general", "adherencia_pct", "adherence", "adherence_pct"]));

  const metrics: SummaryMetric[] = [
    {
      label: "Peso Actual",
      value: formatNumber(currentWeight, " kg"),
      change: formatDelta(currentWeight !== undefined && previousWeight !== undefined ? currentWeight - previousWeight : undefined, " kg"),
      trend: "down",
      positiveWhen: "down",
      icon: Activity,
    },
    {
      label: "% Grasa Corporal",
      value: formatNumber(currentFat, "%"),
      change: formatDelta(currentFat !== undefined && previousFat !== undefined ? currentFat - previousFat : undefined, "%"),
      trend: "down",
      positiveWhen: "down",
      icon: Droplets,
    },
    {
      label: "Masa Muscular",
      value: formatNumber(currentMuscle, " kg"),
      change: formatDelta(currentMuscle !== undefined && previousMuscle !== undefined ? currentMuscle - previousMuscle : undefined, " kg"),
      trend: "up",
      positiveWhen: "up",
      icon: Dumbbell,
    },
    {
      label: "Adherencia General",
      value: formatNumber(currentAdherence, "%"),
      change: formatDelta(currentAdherence !== undefined && previousAdherence !== undefined ? currentAdherence - previousAdherence : undefined, "%"),
      trend: "up",
      positiveWhen: "up",
      icon: TrendingUp,
    },
  ];

  const totalRegistros = parseNumber(findFirstValue(weightChartPayload, ["total_registros", "total", "count"])) ?? parseNumber(findFirstValue(weightChartSource, ["meta.total", "total"]));
  const pesoInicial = parseNumber(findFirstValue(weightChartPayload, ["peso_inicial", "peso_inicio", "initial_weight"])) ?? undefined;
  const pesoActual = parseNumber(findFirstValue(weightChartPayload, ["peso_actual", "peso_fin", "current_weight"])) ?? currentWeight;
  const variacionTotal = parseNumber(findFirstValue(weightChartPayload, ["variacion_total", "delta", "weight_change"])) ?? undefined;
  const periodoDias = parseNumber(findFirstValue(weightChartPayload, ["periodo_dias", "dias", "period_days"])) ?? undefined;

  return {
    metrics,
    chartData: weightSeries,
    weightSummary: {
      totalRegistros: totalRegistros === undefined ? "---" : formatNumber(totalRegistros, "", 0),
      pesoInicial: formatNumber(pesoInicial, " kg"),
      pesoActual: formatNumber(pesoActual, " kg"),
      variacionTotal: formatDelta(variacionTotal, " kg"),
      periodoDias: periodoDias === undefined ? "---" : formatNumber(periodoDias, " dias", 0),
    },
    balance: buildBalanceView(dashboard),
  };
}

async function requestWithFallback(bases: string[], buildPath: (base: string) => string, token: string): Promise<unknown> {
  let lastError: unknown;

  for (const base of bases) {
    try {
      return await apiRequest<unknown>(buildPath(base), {
        method: "GET",
        accessToken: token,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export function TabResumen({ patientId, profileId }: { patientId: number; profileId?: number | null }) {
  const { toast } = useToast();
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<echarts.EChartsType | null>(null);
  const [summary, setSummary] = useState<SummaryView>(defaultSummary());
  const [refreshToken, setRefreshToken] = useState(0);
  const [themeKey, setThemeKey] = useState(() => (document.documentElement.classList.contains("light") ? "light" : "dark"));

  useEffect(() => {
    const handlePatientDataUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ patientId?: number }>;
      if (customEvent.detail?.patientId === patientId) {
        setRefreshToken((current) => current + 1);
      }
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        setRefreshToken((current) => current + 1);
      }
    };

    window.addEventListener("dkfitt-patient-data-updated", handlePatientDataUpdated as EventListener);
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    const root = document.documentElement;
    const themeObserver = new MutationObserver(() => {
      setThemeKey(root.classList.contains("light") ? "light" : "dark");
    });
    themeObserver.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => {
      window.removeEventListener("dkfitt-patient-data-updated", handlePatientDataUpdated as EventListener);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      themeObserver.disconnect();
    };
  }, [patientId]);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!patientId || Number.isNaN(patientId)) {
        setSummary(defaultSummary());
        return;
      }

      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) {
        setSummary(defaultSummary());
        toast({ title: "Sesion no valida", description: "No se encontro token de acceso.", variant: "destructive" });
        return;
      }

      const resolvedEvaluationId = profileId ?? patientId;
      const resolvedWeightId = profileId ?? patientId;
      const [dashboardResult, evaluationsResult, weightChartResult] = await Promise.allSettled([
        requestWithFallback(DASHBOARD_PATIENT_ENDPOINTS, (base) => `${base}/${patientId}`, token),
        requestWithFallback(CLINICAL_EVALUATION_ENDPOINTS, (base) => `${base}/patient/${resolvedEvaluationId}`, token),
        requestWithFallback(WEIGHT_RECORDS_CHART_ENDPOINTS, (base) => `${base}/patient/${resolvedWeightId}/chart`, token),
      ]);

      if (dashboardResult.status === "rejected" && evaluationsResult.status === "rejected" && weightChartResult.status === "rejected") {
        setSummary(defaultSummary());
        toast({
          title: "No se pudo cargar el resumen",
          description: "Verifica los endpoints /dashboard/patient/{id}, /clinical-evaluation/patient/{id} y /weight-records/patient/{id}/chart.",
          variant: "destructive",
        });
        return;
      }

      setSummary(buildSummaryView(
        dashboardResult.status === "fulfilled" ? dashboardResult.value : undefined,
        evaluationsResult.status === "fulfilled" ? evaluationsResult.value : undefined,
        weightChartResult.status === "fulfilled" ? weightChartResult.value : undefined,
      ));
    };

    void fetchSummary();
  }, [patientId, profileId, refreshToken, toast]);

  const metricCards = useMemo(() => summary.metrics, [summary.metrics]);
  const chartData = useMemo(() => summary.chartData, [summary.chartData]);

  useEffect(() => {
    if (!chartRef.current) return undefined;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.dispose();
      chartInstanceRef.current = null;
    }

    const chart = echarts.init(chartRef.current);
    chartInstanceRef.current = chart;

    const styles = getComputedStyle(document.documentElement);
    const borderColor = styles.getPropertyValue("--border").trim() || "0 0% 16%";
    const mutedForeground = styles.getPropertyValue("--muted-foreground").trim() || "0 0% 60%";

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      grid: { left: 8, right: 16, top: 16, bottom: 24, containLabel: true },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(24, 24, 27, 0.98)",
        borderColor: "rgba(255, 255, 255, 0.08)",
        textStyle: { color: "#f4f4f5", fontSize: 12 },
        axisPointer: { type: "line", lineStyle: { color: "#e5b106", width: 1 } },
        formatter: (params) => {
          const point = Array.isArray(params) ? params[0] : params;
          const value = Array.isArray(params) ? params[0]?.data?.[1] : point?.data?.[1];
          return `<div style="min-width: 120px;"><div style="font-weight: 600; margin-bottom: 4px;">${point?.axisValueLabel ?? ""}</div><div style="color: #d4d4d8;">Peso: ${value ?? "--"} kg</div></div>`;
        },
      },
      xAxis: {
        type: "category",
        data: chartData.map((item) => item.fecha),
        axisLine: { lineStyle: { color: `hsl(${borderColor} / 0.55)` } },
        axisTick: { show: false },
        splitLine: { show: true, lineStyle: { color: `hsl(${borderColor} / 0.35)`, type: "dashed" } },
        axisLabel: { color: `hsl(${mutedForeground})`, fontSize: 11, margin: 14 },
      },
      yAxis: {
        type: "value",
        scale: true,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: `hsl(${borderColor} / 0.55)`, type: "dashed" } },
        axisLabel: { color: `hsl(${mutedForeground})`, fontSize: 11, formatter: (value) => `${value} kg` },
      },
      series: [
        {
          name: "Peso",
          type: "line",
          data: chartData.map((item) => [item.fecha, item.peso]),
          smooth: true,
          symbol: "circle",
          symbolSize: 9,
          showSymbol: true,
          lineStyle: { width: 3, color: "#e5b106" },
          itemStyle: { color: "#e5b106" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(229, 177, 6, 0.28)" },
              { offset: 1, color: "rgba(229, 177, 6, 0.02)" },
            ]),
          },
        },
      ],
      graphic: chartData.length === 0
        ? [{ type: "text", left: "center", top: "middle", style: { text: "Sin registros de peso", fill: `hsl(${mutedForeground})`, fontSize: 13, fontWeight: 500 } }]
        : [],
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => chart.resize()) : null;
    if (observer && chartRef.current) observer.observe(chartRef.current);

    return () => {
      window.removeEventListener("resize", handleResize);
      observer?.disconnect();
      chart.dispose();
      if (chartInstanceRef.current === chart) chartInstanceRef.current = null;
    };
  }, [chartData, themeKey]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => {
          const isPositive = metric.trend === metric.positiveWhen;
          const changeClass = metric.change === "Sin comparación" ? "text-muted-foreground" : isPositive ? "text-emerald-500" : "text-rose-500";

          return (
            <div key={metric.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{metric.label}</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <metric.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold text-foreground">{metric.value}</p>
              <div className="mt-2 flex items-center gap-1.5">
                {metric.change === "Sin comparación" ? (
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                )}
                <span className={`text-xs font-medium ${changeClass}`}>{metric.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-1 text-sm font-semibold text-foreground">Evolución de Peso</h3>
        <p className="mb-5 text-xs text-muted-foreground">Registro diario en la app movil</p>
        <div ref={chartRef} className="h-[260px] w-full" />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h4 className="mb-3 text-sm font-semibold text-foreground">Resumen del registro</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Total de registros", value: summary.weightSummary.totalRegistros },
            { label: "Peso inicial", value: summary.weightSummary.pesoInicial },
            { label: "Peso actual", value: summary.weightSummary.pesoActual },
            { label: "Variacion total", value: summary.weightSummary.variacionTotal },
            { label: "Periodo", value: summary.weightSummary.periodoDias },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-lg font-bold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Balance Calórico Semanal</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Calorías Planificadas", value: summary.balance.planned, sub: "Meta promedio semanal" },
            { label: "Calorías Consumidas", value: summary.balance.consumed, sub: "Promedio real semanal" },
            { label: "Balance", value: summary.balance.balanceLabel, sub: summary.balance.balanceSub, highlight: summary.balance.highlight },
          ].map((item) => (
            <div key={item.label} className={`rounded-lg border p-4 ${item.highlight ? "border-accent/40 bg-accent/5" : "border-border bg-muted/30"}`}>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`mt-1 text-lg font-bold ${item.highlight ? "text-accent" : "text-foreground"}`}>{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
