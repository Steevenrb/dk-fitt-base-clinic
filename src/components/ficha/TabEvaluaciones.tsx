import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Activity, Bone, ChevronLeft, ChevronRight, Droplets, Dumbbell, Flame, Gauge, Percent, Ruler, Scale, Zap } from "lucide-react";

const ACCESS_TOKEN_KEY = "dkfitt-access-token";
const EVALUATIONS_PER_PAGE = 4;
const DASHBOARD_PATIENT_ENDPOINTS = ["/api/dashboard/patient", "/dashboard/patient"];
const CLINICAL_EVALUATION_ENDPOINTS = [
  "/api/clinical-evaluations",
  "/clinical-evaluations",
  "/api/clinical-evaluation",
  "/clinical-evaluation",
];
const CALORIE_CONTROL_PATIENT_ENDPOINTS = ["/api/calorie-control/patient", "/calorie-control/patient"];

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
  objetivo: number;
  consumidas: number;
  adicionales: number;
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
  if (isGood(value)) return { label: "Bien", className: "bg-[#C5EB6F]/20 text-foreground border-[#C5EB6F]/50" };
  return { label: "Mal", className: "bg-[#FA9C5C]/20 text-foreground border-[#FA9C5C]/50" };
}

function classifyImc(value: number): { label: string; className: string } {
  if (value < 16) return { label: "DESNUTRICION", className: "bg-sky-500/15 text-sky-600 border-sky-500/30" };
  if (value < 18.5) return { label: "BAJO PESO", className: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30" };
  if (value < 25) return { label: "NORMAL", className: "bg-[#C5EB6F]/20 text-foreground border-[#C5EB6F]/50" };
  if (value < 30) return { label: "SOBREPESO", className: "bg-[#F7CA5E]/25 text-foreground border-[#F7CA5E]/60" };
  if (value < 35) return { label: "OBESIDAD 1", className: "bg-[#FA9C5C]/20 text-foreground border-[#FA9C5C]/50" };
  return { label: "OBESIDAD 2+", className: "bg-[#FA9C5C]/25 text-foreground border-[#FA9C5C]/60" };
}

function imcRangeColor(imc: number): string {
  if (imc < 16) return "#1d9bf0";
  if (imc < 18.5) return "#4cd3ff";
  if (imc < 25) return "#C5EB6F";
  if (imc < 30) return "#F7CA5E";
  if (imc < 35) return "#FA9C5C";
  return "#B7602B";
}

function imcGaugeStops(min: number, max: number): Array<[number, string]> {
  const toPercent = (value: number) => (value - min) / (max - min);
  return [
    [toPercent(16), "#1d9bf0"],
    [toPercent(18.5), "#4cd3ff"],
    [toPercent(25), "#C5EB6F"],
    [toPercent(30), "#F7CA5E"],
    [toPercent(35), "#FA9C5C"],
    [1, "#B7602B"],
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
          "get_diario",
          "get_diario_kcal",
          "get_kcal_diario",
          "get_kcal_total",
          "gasto_energetico_total",
          "gasto_energetico_total_kcal",
          "gasto_energetico_total_diario",
          "gasto_energetico_total_calculado",
          "calorias_diarias_calculadas",
          "calorias_diarias_recomendadas",
          "calorias_recomendadas",
          "energia_recomendada_kcal",
          "otros_indicadores.get_kcal",
          "otros_indicadores.get",
          "otros_indicadores.gasto_energetico_total",
          "otros_indicadores.gasto_energetico_total_kcal",
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
      const explicitBalance = parseNumber(findFirstValue(item, [
        "balance_calorico",
        "balance",
        "caloric_balance",
        "diferencia_calorica",
        "delta_calorias",
      ]));
      const objetivo = parseNumber(findFirstValue(item, ["calorias_objetivo", "meta_calorica", "objetivo", "target_calories"])) ?? 0;
      const consumidas = parseNumber(findFirstValue(item, ["calorias_totales_consumidas", "calorias_consumidas", "consumed_calories"])) ?? 0;
      const adicionales = parseNumber(findFirstValue(item, ["calorias_consumidas_adicional", "calorias_adicionales"])) ?? 0;
      const restantes = parseNumber(findFirstValue(item, ["calorias_restantes"]));
      const balance = explicitBalance ?? (objetivo > 0 ? consumidas - objetivo : restantes !== undefined ? -restantes : 0);
      return {
        fecha: formatDateLabel(fechaRaw),
        fechaRaw,
        balance,
        objetivo,
        consumidas,
        adicionales,
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
  const [historyPage, setHistoryPage] = useState(1);

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
      const calorieControlId = profileId ?? patientId;

      const [evaluationResult, dashboardResult, weeklyResult, todayResult] = await Promise.allSettled([
        requestWithFallback(CLINICAL_EVALUATION_ENDPOINTS, (base) => `${base}/patient/${evaluationId}`, token),
        requestWithFallback(DASHBOARD_PATIENT_ENDPOINTS, (base) => `${base}/${patientId}`, token),
        requestWithFallback(CALORIE_CONTROL_PATIENT_ENDPOINTS, (base) => `${base}/${calorieControlId}/history`, token),
        requestWithFallback(CALORIE_CONTROL_PATIENT_ENDPOINTS, (base) => `${base}/${calorieControlId}/today`, token),
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
          const todayBalanceSource = findFirstValue(todayRaw, ["balance"]) ?? todayRaw;
          const objetivo = parseNumber(findFirstValue(todayBalanceSource, ["calorias_objetivo", "meta_calorica"])) ?? 0;
          const consumidas = parseNumber(findFirstValue(todayBalanceSource, ["calorias_totales_consumidas"])) ?? 0;
          const restantes = parseNumber(findFirstValue(todayBalanceSource, ["calorias_restantes"]));
          const todayBalance = parseNumber(findFirstValue(todayBalanceSource, ["balance_calorico", "diferencia_calorica", "delta_calorias"]))
            ?? (objetivo > 0 ? consumidas - objetivo : restantes !== undefined ? -restantes : undefined);
          if (todayBalance !== undefined) {
            balance = [{
              fecha: "Hoy",
              fechaRaw: new Date().toISOString(),
              balance: todayBalance,
              objetivo,
              consumidas,
              adicionales: parseNumber(findFirstValue(todayBalanceSource, ["calorias_consumidas_adicional", "calorias_adicionales"])) ?? 0,
            }];
          }
        }
      }

      setBalanceSeries(balance);
    };

    void fetchData();
  }, [patientId, profileId, toast]);

  const latestEvaluation = useMemo(() => (evaluations.length ? evaluations[evaluations.length - 1] : null), [evaluations]);
  const historyEvaluations = useMemo(
    () => [...evaluations].sort((left, right) => new Date(right.fechaRaw).getTime() - new Date(left.fechaRaw).getTime()),
    [evaluations],
  );
  const historyPageCount = Math.max(1, Math.ceil(evaluations.length / EVALUATIONS_PER_PAGE));
  const paginatedEvaluations = useMemo(() => {
    const start = (historyPage - 1) * EVALUATIONS_PER_PAGE;
    return historyEvaluations.slice(start, start + EVALUATIONS_PER_PAGE);
  }, [historyEvaluations, historyPage]);

  useEffect(() => {
    if (historyPage > historyPageCount) setHistoryPage(historyPageCount);
  }, [historyPage, historyPageCount]);

  useEffect(() => {
    if (!trendRef.current) return undefined;
    const chart = echarts.init(trendRef.current);
    const styles = getComputedStyle(document.documentElement);
    const borderColor = styles.getPropertyValue("--border").trim() || "0 0% 16%";
    const mutedForeground = styles.getPropertyValue("--muted-foreground").trim() || "0 0% 60%";
    const trendColors = {
      grasa: "#FA9C5C",
      peso: "#A8D1E7",
      musculo: "#E6E6E6",
    };

    const trendOption: echarts.EChartsOption = {
      backgroundColor: "transparent",
      color: [trendColors.peso, trendColors.grasa, trendColors.musculo],
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.96)",
        borderColor: "rgba(37, 48, 39, 0.08)",
        borderWidth: 1,
        padding: [10, 12],
        textStyle: { color: "#253027", fontSize: 12 },
        extraCssText: "box-shadow: 0 10px 24px rgba(37, 48, 39, 0.10); border-radius: 12px;",
        axisPointer: {
          type: "line",
          lineStyle: { color: "rgba(37, 48, 39, 0.18)", width: 1.5, type: "dashed" },
        },
      },
      legend: {
        top: 0,
        right: 0,
        itemWidth: 18,
        itemHeight: 8,
        icon: "roundRect",
        itemGap: 16,
        textStyle: { color: `hsl(${mutedForeground})`, fontSize: 11, fontWeight: 600 },
      },
      grid: { left: 8, right: 16, top: 42, bottom: 28, containLabel: true },
      xAxis: {
        type: "category",
        data: evaluations.map((item) => item.fecha),
        boundaryGap: false,
        axisLine: { lineStyle: { color: `hsl(${borderColor} / 0.35)` } },
        axisTick: { show: false },
        axisLabel: { color: `hsl(${mutedForeground})`, fontSize: 11, margin: 14 },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: `hsl(${borderColor} / 0.28)`, type: "dashed" } },
        axisLabel: { color: `hsl(${mutedForeground})`, fontSize: 11 },
      },
      series: [
        {
          name: "Peso",
          type: "line",
          smooth: true,
          data: evaluations.map((item) => item.peso),
          lineStyle: { width: 3, color: trendColors.peso },
          itemStyle: { color: trendColors.peso, borderColor: "#ffffff", borderWidth: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(168, 209, 231, 0.28)" },
              { offset: 1, color: "rgba(168, 209, 231, 0.03)" },
            ]),
          },
          symbol: "circle",
          symbolSize: 7,
          emphasis: { focus: "series", scale: 1.25 },
        },
        {
          name: "Grasa",
          type: "line",
          smooth: true,
          data: evaluations.map((item) => item.grasa),
          lineStyle: { width: 3, color: trendColors.grasa },
          itemStyle: { color: trendColors.grasa, borderColor: "#ffffff", borderWidth: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(250, 156, 92, 0.24)" },
              { offset: 1, color: "rgba(250, 156, 92, 0.03)" },
            ]),
          },
          symbol: "circle",
          symbolSize: 7,
          emphasis: { focus: "series", scale: 1.25 },
        },
        {
          name: "Músculo",
          type: "line",
          smooth: true,
          data: evaluations.map((item) => item.musculo),
          lineStyle: { width: 3, color: trendColors.musculo },
          itemStyle: { color: trendColors.musculo, borderColor: "#253027", borderWidth: 1.5 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(230, 230, 230, 0.34)" },
              { offset: 1, color: "rgba(230, 230, 230, 0.04)" },
            ]),
          },
          symbol: "circle",
          symbolSize: 7,
          emphasis: { focus: "series", scale: 1.25 },
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
          progress: { show: true, width: 12, itemStyle: { color: "#F7CA5E" } },
          axisLine: { lineStyle: { width: 12, color: [[1, "rgba(163, 163, 163, 0.2)"]] } },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          pointer: { show: true },
          detail: { formatter: (value: number) => value.toFixed(1), fontSize: 18, color: "#8A6B1F", offsetCenter: [0, "45%"] },
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
          progress: { show: true, width: 10, itemStyle: { color: "#F7CA5E" } },
          axisLine: { lineStyle: { width: 10, color: [[1, "rgba(247, 202, 94, 0.22)"]] } },
          pointer: { show: true },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          detail: { formatter: (v: number) => `${Math.round(v)}%`, fontSize: 18, color: "#8A6B1F", offsetCenter: [0, "45%"] },
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
      tooltip: {
        trigger: "axis",
        formatter: (params) => {
          const rows = Array.isArray(params) ? params : [params];
          const title = rows[0]?.axisValueLabel ?? "";
          return [
            `<div style="font-weight:600;margin-bottom:4px;">${title}</div>`,
            ...rows.map((row: any) => `${row.marker} ${row.seriesName}: ${Number(row.value ?? 0).toLocaleString()} kcal`),
          ].join("");
        },
      },
      legend: {
        top: 0,
        right: 0,
        itemWidth: 14,
        itemHeight: 8,
        itemGap: 14,
        textStyle: { color: `hsl(${mutedForeground})`, fontSize: 11, fontWeight: 600 },
      },
      grid: { left: 8, right: 16, top: 38, bottom: isMobile ? 36 : 24, containLabel: true },
      xAxis: {
        type: "category",
        data: balanceSeries.map((item) => item.fecha),
        axisLine: { lineStyle: { color: `hsl(${borderColor} / 0.55)` } },
        axisTick: { show: false },
        axisLabel: { color: `hsl(${mutedForeground})`, fontSize: 11 },
      },
      yAxis: [
        {
          type: "value",
          name: "kcal",
          nameTextStyle: { color: `hsl(${mutedForeground})`, fontSize: 10, padding: [0, 0, 0, 24] },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: `hsl(${borderColor} / 0.35)`, type: "dashed" } },
          axisLabel: { color: `hsl(${mutedForeground})`, fontSize: 11 },
        },
        {
          type: "value",
          name: "balance",
          nameTextStyle: { color: `hsl(${mutedForeground})`, fontSize: 10 },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { color: `hsl(${mutedForeground})`, fontSize: 11 },
        },
      ],
      dataZoom: balanceSeries.length > 5
        ? [
          { type: "inside" },
          { type: "slider", height: isMobile ? 14 : 10, show: isMobile },
        ]
        : [],
      series: [
        {
          name: "Objetivo",
          type: "bar",
          data: balanceSeries.map((item) => item.objetivo),
          barMaxWidth: 26,
          itemStyle: { color: "#C5EB6F", borderRadius: [8, 8, 2, 2] },
        },
        {
          name: "Consumidas",
          type: "bar",
          data: balanceSeries.map((item) => item.consumidas),
          barMaxWidth: 26,
          itemStyle: { color: "#FA9C5C", borderRadius: [8, 8, 2, 2] },
        },
        {
          name: "Balance",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          data: balanceSeries.map((item) => item.balance),
          lineStyle: { width: 3, color: "#4cd3ff" },
          itemStyle: { color: "#4cd3ff", borderColor: "#ffffff", borderWidth: 2 },
          symbol: "circle",
          symbolSize: 7,
          emphasis: { focus: "series", scale: 1.2 },
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
    <div className="space-y-6 min-w-0">
      <div className="rounded-xl border border-border bg-card p-5 shadow-[0_10px_22px_rgba(37,48,39,0.06)]">
        <h3 className="mb-1 text-sm font-semibold text-foreground">Tendencias Clínicas</h3>
        <p className="mb-5 text-xs text-muted-foreground">Evolución por fechas de atención</p>
        <div ref={trendRef} className="h-[300px] w-full" />
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
        <div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-foreground">Historial de Evaluaciones</h3>
        </div>
        <div className="p-5">
          {evaluations.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
                {paginatedEvaluations.map((evaluation) => (
                  <EvaluationHistoryCard key={`${evaluation.id}-${evaluation.fechaRaw}`} evaluation={evaluation} />
                ))}
              </div>

              <div className="mt-5 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                  disabled={historyPage === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Pagina anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: historyPageCount }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setHistoryPage(page)}
                    className={`h-8 min-w-8 rounded-full border px-2 text-xs font-semibold transition-colors ${
                      page === historyPage
                        ? "border-[#F7CA5E] bg-[#F7CA5E] text-[#253027]"
                        : "border-border text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setHistoryPage((page) => Math.min(historyPageCount, page + 1))}
                  disabled={historyPage === historyPageCount}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Pagina siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-8 text-center text-sm text-muted-foreground">
              Sin evaluaciones registradas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EvaluationHistoryCard({ evaluation }: { evaluation: EvaluationRow }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-[0_10px_24px_rgba(37,48,39,0.08)] transition-transform duration-200 hover:-translate-y-0.5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-foreground">{evaluation.fecha}</p>
          <p className="text-xs text-muted-foreground">Evaluacion clinica</p>
        </div>
        <Badge variant="outline" className={`text-[11px] ${evaluation.imc >= 30 ? "bg-[#FA9C5C]/20 text-foreground border-[#FA9C5C]/50" : "bg-[#F7CA5E]/25 text-foreground border-[#F7CA5E]/60"}`}>
          IMC {formatMetric(evaluation.imc)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FeaturedEvaluationMetric icon={<Scale className="h-5 w-5" />} label="Peso" value={formatMetric(evaluation.peso, " kg", 1)} tone="bg-[#A8D1E7]/35 text-[#253027]" />
        <FeaturedEvaluationMetric icon={<Percent className="h-5 w-5" />} label="% Grasa" value={formatMetric(evaluation.grasa, "%", 1)} tone="bg-[#FA9C5C]/25 text-[#253027]" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <CompactEvaluationMetric icon={<Dumbbell className="h-4 w-4" />} label="Masa muscular" value={formatMetric(evaluation.musculo, " kg", 1)} />
        <CompactEvaluationMetric icon={<Gauge className="h-4 w-4" />} label="Grasa visceral" value={formatMetric(evaluation.grasaVisceral, "", 1)} />
        <CompactEvaluationMetric icon={<Ruler className="h-4 w-4" />} label="Altura" value={formatMetric(evaluation.altura, " cm", 1)} />
        <CompactEvaluationMetric icon={<Droplets className="h-4 w-4" />} label="% Agua" value={formatMetric(evaluation.agua, "%", 1)} />
        <CompactEvaluationMetric icon={<Bone className="h-4 w-4" />} label="Masa osea" value={formatMetric(evaluation.masaOsea, " kg", 1)} />
        <CompactEvaluationMetric icon={<Flame className="h-4 w-4" />} label="TMB" value={formatMetric(evaluation.tmb, " kcal", 0)} />
        <CompactEvaluationMetric icon={<Zap className="h-4 w-4" />} label="GET" value={formatMetric(evaluation.get, " kcal", 0)} />
        <CompactEvaluationMetric icon={<Activity className="h-4 w-4" />} label="Edad metab." value={formatMetric(evaluation.edadMetabolica, " anos", 0)} />
      </div>
    </article>
  );
}

function FeaturedEvaluationMetric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
      <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
        {icon}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function CompactEvaluationMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/25 px-2.5 py-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E6E6E6]/70 text-[#253027]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-xs font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

