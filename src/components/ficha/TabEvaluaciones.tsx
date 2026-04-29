import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import { Badge } from "@/components/ui/badge";
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
const CALORIE_CONTROL_WEEKLY_ENDPOINTS = [
  "/api/calorie-control/me/weekly",
  "/calorie-control/me/weekly",
  "/api/calorie-control/me/history",
  "/calorie-control/me/history",
];
const CALORIE_CONTROL_TODAY_ENDPOINTS = [
  "/api/calorie-control/patient",
  "/calorie-control/patient",
];

type EvaluationRow = {
  id: number;
  fecha: string;
  fechaRaw: string;
  peso: number;
  grasa: number;
  musculo: number;
  imc: number;
  grasaVisceral: number;
  altura: number | undefined;
  agua: number | undefined;
  masaOsea: number | undefined;
  tmb: number | undefined;
  get: number | undefined;
  calorias: number | undefined;
  edadMetabolica: number | undefined;
};

type BalancePoint = {
  fecha: string;
  fechaRaw: string;
  balance: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function unwrapData(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const candidates = [
    value.data,
    isRecord(value.data) ? value.data.data : undefined,
    value.perfil,
    value.dashboard,
    value.summary,
  ].filter((candidate) => candidate !== undefined);
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

function formatMetric(value: number | undefined, suffix = "", digits = 2): string {
  if (value === undefined || Number.isNaN(value)) return "---";
  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(digits);
  return `${formatted}${suffix}`;
}

function statusBadge(value: number | undefined, isGood: (value: number) => boolean): { label: string; className: string } {
  if (value === undefined || Number.isNaN(value)) return { label: "Sin datos", className: "bg-muted/40 text-muted-foreground border-border" };
  if (isGood(value)) return { label: "Bien", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" };
  return { label: "Mal", className: "bg-rose-500/15 text-rose-600 border-rose-500/30" };
}

function classifyImc(value: number): { label: string; className: string } {
  if (value < 16) return { label: "DESNUTRICION", className: "bg-sky-500/15 text-sky-600 border-sky-500/30" };
  if (value < 18.5) return { label: "BAJO PESO", className: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30" };
  if (value < 25) return { label: "NORMAL", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" };
  if (value < 30) return { label: "SOBREPESO", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" };
  if (value < 35) return { label: "OBESIDAD 1", className: "bg-orange-500/15 text-orange-600 border-orange-500/30" };
  return { label: "OBESIDAD 2+", className: "bg-rose-500/15 text-rose-600 border-rose-500/30" };
}

function imcRangeColor(imc: number): string {
  if (imc < 16) return "#1d9bf0";
  if (imc < 18.5) return "#4cd3ff";
  if (imc < 25) return "#60c14b";
  if (imc < 30) return "#f4e14c";
  if (imc < 35) return "#ff8a34";
  return "#e11d48";
}

function imcGaugeStops(min: number, max: number): Array<[number, string]> {
  const toPercent = (value: number) => (value - min) / (max - min);
  return [
    [toPercent(16), "#1d9bf0"],
    [toPercent(18.5), "#4cd3ff"],
    [toPercent(25), "#60c14b"],
    [toPercent(30), "#f4e14c"],
    [toPercent(35), "#ff8a34"],
    [1, "#e11d48"],
  ];
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

function extractArray(source: unknown, keys: string[] = ["items", "rows", "results", "evaluaciones", "trends", "data"]): Record<string, unknown>[] {
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

function buildEvaluations(source: unknown): EvaluationRow[] {
  const records = extractArray(source, ["data", "items", "rows", "results"]);
  return records
    .map((item) => {
      const fechaRaw = String(findFirstValue(item, ["fecha_evaluacion", "fecha_atencion", "fecha", "created_at", "createdAt"]) ?? "");
      return {
        id: parseNumber(findFirstValue(item, ["id_evaluacion", "id"])) ?? 0,
        fecha: formatDateLabel(fechaRaw),
        fechaRaw,
        peso: parseNumber(findFirstValue(item, ["peso_kg", "peso", "peso_actual"])) ?? 0,
        grasa: parseNumber(findFirstValue(item, ["porcentaje_grasa", "grasa_corporal_pct"])) ?? 0,
        musculo: parseNumber(findFirstValue(item, ["masa_muscular_kg", "musculo"])) ?? 0,
        imc: parseNumber(findFirstValue(item, ["imc", "indice_masa_corporal"])) ?? 0,
        grasaVisceral: parseNumber(findFirstValue(item, ["grasa_visceral", "grasa_visceral_nivel"])) ?? 0,
        altura: parseNumber(findFirstValue(item, ["altura_cm", "altura", "estatura_cm"])),
        agua: parseNumber(findFirstValue(item, ["agua_corporal_pct", "porcentaje_agua", "agua_corporal"])),
        masaOsea: parseNumber(findFirstValue(item, ["masa_osea_kg", "masa_osea"])),
        tmb: parseNumber(findFirstValue(item, ["tmb_kcal", "tmb", "tasa_metabolica_basal", "tasa_metabolica_basal_kcal"])),
        get: parseNumber(findFirstValue(item, [
          "get_kcal",
          "get",
          "get_calculado",
          "gasto_energetico_total",
          "gasto_energetico_total_kcal",
          "otros_indicadores.get_kcal",
          "otros_indicadores.get",
        ])),
        calorias: parseNumber(findFirstValue(item, [
          "calorias_diarias_calculadas",
          "calorias_diarias_recomendadas",
          "calorias_recomendadas",
          "calorias_objetivo",
          "energia_recomendada_kcal",
        ])),
        edadMetabolica: parseNumber(findFirstValue(item, [
          "edad_metabolica",
          "edad_metabolica_anos",
          "metabolic_age",
          "otros_indicadores.edad_metabolica",
        ])),
      };
    })
    .filter((item) => item.fechaRaw && item.peso > 0)
    .sort((left, right) => new Date(left.fechaRaw).getTime() - new Date(right.fechaRaw).getTime());
}

function buildBalanceSeries(source: unknown): BalancePoint[] {
  const records = extractArray(source, ["data", "items", "rows", "results", "history", "weekly"]);
  return records
    .map((item) => {
      const fechaRaw = String(findFirstValue(item, ["fecha", "date", "dia", "day", "created_at"]) ?? "");
      const balanceRaw = parseNumber(findFirstValue(item, [
        "balance_calorico",
        "balance",
        "caloric_balance",
        "diferencia_calorica",
        "delta_calorias",
        "calorias_restantes",
      ]));
      const objetivo = parseNumber(findFirstValue(item, ["calorias_objetivo", "objetivo", "target_calories"]));
      const consumidas = parseNumber(findFirstValue(item, ["calorias_totales_consumidas", "calorias_consumidas", "consumed_calories"]));
      const balance = balanceRaw ?? ((consumidas !== undefined && objetivo !== undefined) ? consumidas - objetivo : undefined);
      return {
        fecha: formatDateLabel(fechaRaw),
        fechaRaw,
        balance: balance ?? 0,
      };
    })
    .filter((item) => item.fechaRaw)
    .sort((left, right) => new Date(left.fechaRaw).getTime() - new Date(right.fechaRaw).getTime());
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

export function TabEvaluaciones({ patientId, profileId }: { patientId: number; profileId?: number | null }) {
  const { toast } = useToast();
  const trendRef = useRef<HTMLDivElement | null>(null);
  const imcRef = useRef<HTMLDivElement | null>(null);
  const visceralRef = useRef<HTMLDivElement | null>(null);
  const adherenceRef = useRef<HTMLDivElement | null>(null);
  const balanceRef = useRef<HTMLDivElement | null>(null);
  const [themeKey, setThemeKey] = useState(() => (document.documentElement.classList.contains("light") ? "light" : "dark"));
  const [evaluations, setEvaluations] = useState<EvaluationRow[]>([]);
  const [adherenceValue, setAdherenceValue] = useState<number | null>(null);
  const [balanceSeries, setBalanceSeries] = useState<BalancePoint[]>([]);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setThemeKey(root.classList.contains("light") ? "light" : "dark");
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!patientId || Number.isNaN(patientId)) return;

      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) {
        toast({ title: "Sesion no valida", description: "No se encontro token de acceso.", variant: "destructive" });
        return;
      }

      const evaluationId = profileId ?? patientId;

      const [evaluationResult, dashboardResult, weeklyResult, todayResult] = await Promise.allSettled([
        requestWithFallback(CLINICAL_EVALUATION_ENDPOINTS, (base) => `${base}/patient/${evaluationId}`, token),
        requestWithFallback(DASHBOARD_PATIENT_ENDPOINTS, (base) => `${base}/${patientId}`, token),
        requestWithFallback(CALORIE_CONTROL_WEEKLY_ENDPOINTS, (base) => `${base}`, token),
        requestWithFallback(CALORIE_CONTROL_TODAY_ENDPOINTS, (base) => `${base}/${patientId}/today`, token),
      ]);

      if (evaluationResult.status === "fulfilled") {
        setEvaluations(buildEvaluations(evaluationResult.value));
      }

      if (dashboardResult.status === "fulfilled") {
        const dashboard = unwrapData(dashboardResult.value);
        const adherence = parseNumber(findFirstValue(dashboard, ["adherencia_semana_actual.adherencia", "adherencia_actual", "adherencia"]));
        setAdherenceValue(typeof adherence === "number" ? adherence : null);
      }

      let balance = weeklyResult.status === "fulfilled" ? buildBalanceSeries(weeklyResult.value) : [];
      if (balance.length === 0 && todayResult.status === "fulfilled") {
        balance = buildBalanceSeries(todayResult.value);
        if (balance.length === 0) {
          const todayRaw = unwrapData(todayResult.value);
          const todayBalance = parseNumber(findFirstValue(todayRaw, ["balance_calorico", "balance", "calorias_restantes"]));
          if (todayBalance !== undefined) {
            balance = [{
              fecha: "Hoy",
              fechaRaw: new Date().toISOString(),
              balance: todayBalance,
            }];
          }
        }
      }

      setBalanceSeries(balance);
    };

    void fetchData();
  }, [patientId, profileId, toast]);

  const latestEvaluation = useMemo(() => (evaluations.length ? evaluations[evaluations.length - 1] : null), [evaluations]);

  useEffect(() => {
    if (!trendRef.current) return undefined;
    const chart = echarts.init(trendRef.current);
    const styles = getComputedStyle(document.documentElement);
    const borderColor = styles.getPropertyValue("--border").trim() || "0 0% 16%";
    const mutedForeground = styles.getPropertyValue("--muted-foreground").trim() || "0 0% 60%";

    const trendOption: echarts.EChartsOption = {
      backgroundColor: "transparent",
      tooltip: { trigger: "axis" },
      legend: { top: 0, right: 0, textStyle: { color: `hsl(${mutedForeground})`, fontSize: 11 } },
      grid: { left: 8, right: 16, top: 28, bottom: 24, containLabel: true },
      xAxis: {
        type: "category",
        data: evaluations.map((item) => item.fecha),
        axisLine: { lineStyle: { color: `hsl(${borderColor} / 0.55)` } },
        axisTick: { show: false },
        axisLabel: { color: `hsl(${mutedForeground})`, fontSize: 11, margin: 14 },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: `hsl(${borderColor} / 0.35)`, type: "dashed" } },
        axisLabel: { color: `hsl(${mutedForeground})`, fontSize: 11 },
      },
      series: [
        {
          name: "Peso",
          type: "line",
          stack: "total",
          smooth: true,
          data: evaluations.map((item) => item.peso),
          lineStyle: { width: 2, color: "#4cd3ff" },
          itemStyle: { color: "#1d4ed8" },
          areaStyle: { color: "rgba(76, 211, 255, 0.12)" },
          symbol: "circle",
          symbolSize: 6,
        },
        {
          name: "% Grasa",
          type: "line",
          stack: "total",
          smooth: true,
          data: evaluations.map((item) => item.grasa),
          lineStyle: { width: 2, color: "#f4e14c" },
          itemStyle: { color: "#7c4a1f" },
          areaStyle: { color: "rgba(244, 225, 76, 0.12)" },
          symbol: "circle",
          symbolSize: 6,
        },
        {
          name: "Músculo",
          type: "line",
          stack: "total",
          smooth: true,
          data: evaluations.map((item) => item.musculo),
          lineStyle: { width: 2, color: "#9ca3af" },
          itemStyle: { color: "#111827" },
          areaStyle: { color: "rgba(156, 163, 175, 0.12)" },
          symbol: "circle",
          symbolSize: 6,
        },
      ],
      graphic: evaluations.length === 0
        ? [{ type: "text", left: "center", top: "middle", style: { text: "Sin evaluaciones", fill: `hsl(${mutedForeground})`, fontSize: 13, fontWeight: 500 } }]
        : [],
    };

    chart.setOption(trendOption);
    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [evaluations, themeKey]);

  useEffect(() => {
    if (!imcRef.current) return undefined;
    const chart = echarts.init(imcRef.current);
    const imcValue = latestEvaluation?.imc ?? 0;
    const imcMin = 12;
    const imcMax = 45;
    const imcOption: echarts.EChartsOption = {
      series: [
        {
          type: "gauge",
          startAngle: 200,
          endAngle: -20,
          radius: "95%",
          progress: { show: false },
          axisLine: {
            lineStyle: {
              width: 14,
              color: imcGaugeStops(imcMin, imcMax),
            },
          },
          pointer: { show: true },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          detail: {
            valueAnimation: true,
            formatter: (value: number) => `${value.toFixed(1)}`,
            fontSize: 18,
            color: imcRangeColor(imcValue),
            offsetCenter: [0, "45%"],
          },
          data: [{ value: imcValue }],
          min: imcMin,
          max: imcMax,
          title: { show: false },
        },
      ],
    };

    chart.setOption(imcOption);
    return () => chart.dispose();
  }, [latestEvaluation, themeKey]);

  useEffect(() => {
    if (!visceralRef.current) return undefined;
    const chart = echarts.init(visceralRef.current);
    const visceralValue = latestEvaluation?.grasaVisceral ?? 0;
    const option: echarts.EChartsOption = {
      series: [
        {
          type: "gauge",
          progress: { show: true, width: 12, itemStyle: { color: "#e5b106" } },
          axisLine: { lineStyle: { width: 12, color: [[1, "rgba(163, 163, 163, 0.2)"]] } },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          pointer: { show: true },
          detail: { formatter: (value: number) => value.toFixed(1), fontSize: 18, color: "#e5b106", offsetCenter: [0, "45%"] },
          data: [{ value: visceralValue }],
          min: 0,
          max: 30,
          title: { show: false },
        },
      ],
    };

    chart.setOption(option);
    return () => chart.dispose();
  }, [latestEvaluation, themeKey]);

  useEffect(() => {
    if (!adherenceRef.current) return undefined;
    const chart = echarts.init(adherenceRef.current);
    const value = adherenceValue ?? 0;
    const option: echarts.EChartsOption = {
      series: [
        {
          type: "gauge",
          startAngle: 225,
          endAngle: -45,
          progress: { show: true, width: 10, itemStyle: { color: "#22c55e" } },
          axisLine: { lineStyle: { width: 10, color: [[1, "rgba(34, 197, 94, 0.2)"]] } },
          pointer: { show: true },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          detail: { formatter: (v: number) => `${Math.round(v)}%`, fontSize: 18, color: "#22c55e", offsetCenter: [0, "45%"] },
          data: [{ value }],
          min: 0,
          max: 100,
          title: { show: false },
        },
      ],
    };

    chart.setOption(option);
    return () => chart.dispose();
  }, [adherenceValue, themeKey]);

  useEffect(() => {
    if (!balanceRef.current) return undefined;
    const chart = echarts.init(balanceRef.current);
    const styles = getComputedStyle(document.documentElement);
    const borderColor = styles.getPropertyValue("--border").trim() || "0 0% 16%";
    const mutedForeground = styles.getPropertyValue("--muted-foreground").trim() || "0 0% 60%";
    const isMobile = balanceRef.current.clientWidth < 640;

    const option: echarts.EChartsOption = {
      tooltip: { trigger: "axis" },
      grid: { left: 8, right: 16, top: 16, bottom: isMobile ? 36 : 24, containLabel: true },
      xAxis: {
        type: "category",
        data: balanceSeries.map((item) => item.fecha),
        axisLine: { lineStyle: { color: `hsl(${borderColor} / 0.55)` } },
        axisTick: { show: false },
        axisLabel: { color: `hsl(${mutedForeground})`, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: `hsl(${borderColor} / 0.35)`, type: "dashed" } },
        axisLabel: { color: `hsl(${mutedForeground})`, fontSize: 11 },
      },
      dataZoom: balanceSeries.length > 5
        ? [
          { type: "inside" },
          { type: "slider", height: isMobile ? 14 : 10, show: isMobile },
        ]
        : [],
      series: [
        {
          name: "Balance",
          type: "line",
          smooth: true,
          data: balanceSeries.map((item) => item.balance),
          lineStyle: { width: 2, color: "#e5b106" },
          symbol: "circle",
          symbolSize: 6,
          areaStyle: { color: "rgba(229, 177, 6, 0.12)" },
        },
      ],
      graphic: balanceSeries.length === 0
        ? [{ type: "text", left: "center", top: "middle", style: { text: "Sin balance calórico", fill: `hsl(${mutedForeground})`, fontSize: 13, fontWeight: 500 } }]
        : [],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [balanceSeries, themeKey]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-1 text-sm font-semibold text-foreground">Tendencias Clínicas</h3>
        <p className="mb-5 text-xs text-muted-foreground">Evolución por fechas de atención</p>
        <div ref={trendRef} className="h-[260px] w-full" />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Métricas Corporales</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">IMC</p>
            <div ref={imcRef} className="h-[180px]" />
            {latestEvaluation?.imc !== undefined ? (
              <Badge variant="outline" className={`mt-2 text-[11px] ${classifyImc(latestEvaluation.imc).className}`}>
                {classifyImc(latestEvaluation.imc).label}
              </Badge>
            ) : (
              <Badge variant="outline" className="mt-2 text-[11px] bg-muted/40 text-muted-foreground border-border">
                Sin datos
              </Badge>
            )}
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Grasa visceral</p>
            <div ref={visceralRef} className="h-[180px]" />
            <Badge variant="outline" className={`mt-2 text-[11px] ${statusBadge(latestEvaluation?.grasaVisceral, (value) => value <= 12).className}`}>
              {statusBadge(latestEvaluation?.grasaVisceral, (value) => value <= 12).label}
            </Badge>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Adherencia</p>
            <div ref={adherenceRef} className="h-[180px]" />
            <Badge variant="outline" className={`mt-2 text-[11px] ${statusBadge(adherenceValue ?? undefined, (value) => value >= 80).className}`}>
              {statusBadge(adherenceValue ?? undefined, (value) => value >= 80).label}
            </Badge>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Balance calórico</h3>
        <div ref={balanceRef} className="h-[220px]" />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold text-foreground">Historial de Evaluaciones</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Fecha</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Peso (kg)</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">% Grasa</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Masa Muscular (kg)</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">IMC</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Grasa visceral</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Altura (cm)</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">% Agua</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Masa osea (kg)</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">TMB (kcal)</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">GET (kcal)</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Edad metabolica</th>
                
              </tr>
            </thead>
            <tbody>
              {evaluations.map((e) => (
                <tr key={`${e.id}-${e.fechaRaw}`} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-medium text-foreground">{e.fecha}</td>
                  <td className="px-5 py-3 text-foreground">{formatMetric(e.peso)}</td>
                  <td className="px-5 py-3 text-foreground">{formatMetric(e.grasa, "%")}</td>
                  <td className="px-5 py-3 text-foreground">{formatMetric(e.musculo)}</td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className={`text-[11px] ${e.imc >= 30 ? "bg-accent/20 text-accent border-accent/30" : "bg-primary/15 text-primary border-primary/30"}`}>
                      {formatMetric(e.imc)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-foreground">{formatMetric(e.grasaVisceral)}</td>
                  <td className="px-5 py-3 text-foreground">{formatMetric(e.altura)}</td>
                  <td className="px-5 py-3 text-foreground">{formatMetric(e.agua, "%")}</td>
                  <td className="px-5 py-3 text-foreground">{formatMetric(e.masaOsea)}</td>
                  <td className="px-5 py-3 text-foreground">{formatMetric(e.tmb)}</td>
                  <td className="px-5 py-3 text-foreground">{formatMetric(e.get)}</td>
                  <td className="px-5 py-3 text-foreground">{formatMetric(e.edadMetabolica, " años", 0)}</td>
                  
                </tr>
              ))}
              {evaluations.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-5 py-6 text-center text-sm text-muted-foreground">
                    Sin evaluaciones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
