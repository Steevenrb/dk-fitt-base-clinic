import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle, Flame, TrendingUp, UtensilsCrossed } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ACCESS_TOKEN_KEY = "dkfitt-access-token";
const ADDITIONAL_INTAKE_ENDPOINTS = ["/api/additional-intake/patient", "/additional-intake/patient"];
const ADDITIONAL_INTAKE_IMPACT_ENDPOINTS = ["/api/additional-intake/patient", "/additional-intake/patient"];

type AdditionalIntakeApiItem = {
  id_consumo_adicional: number;
  id_perfil: number;
  id_control: number | null;
  fecha: string;
  hora: string | null;
  descripcion_alimento: string | null;
  imagen_url: string | null;
  calorias_estimadas: number | null;
  confirmado: boolean | null;
  calorias_sumadas: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  porcion_g: number | null;
  proteinas_g: number | null;
  carbohidratos_g: number | null;
  grasas_g: number | null;
  confianza_pct: number | null;
  fuente_estimacion: string | null;
  mensaje: string | null;
  alimentos_detectados?: Array<{
    nombre: string;
    calorias: number | null;
    cantidad_g: number | null;
  }>;
};

type AdditionalIntakeImpactApi = {
  total_consumos: number;
  total_confirmados: number;
  total_descartados: number;
  calorias_totales: number;
  promedio_por_dia: number;
  clasificacion_impacto: string;
  analisis?: {
    mensaje?: string;
    pct_confirmacion?: number;
  };
};

type AdditionalIntakeCard = {
  id: number;
  name: string;
  description: string;
  rawDate: string;
  date: string;
  time: string;
  calories: number;
  portionValue: number | null;
  confirmed: boolean;
  summed: boolean;
  confidence: string;
  portion: string;
  proteins: string;
  carbs: string;
  fats: string;
  impact: "bajo" | "moderado" | "alto";
  imageUrl: string;
  source: string;
  detectedFoods: string;
};

const impactConfig = {
  bajo: { label: "Bajo", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  moderado: { label: "Moderado", className: "bg-primary/15 text-primary border-primary/30" },
  alto: { label: "Alto", className: "bg-accent/20 text-accent border-accent/30" },
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-foreground">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="text-xs text-muted-foreground">
          <span style={{ color: entry.color || entry.fill }}>â– </span> {entry.name}: {entry.value} kcal
        </p>
      ))}
    </div>
  );
};

function formatDateLabel(value?: string | null): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
}
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDateKey(value?: string | null): string {
  if (!value) return "";
  return String(value).split("T")[0];
}

function parseDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getWeekRange(dateKey: string) {
  const date = parseDateKey(dateKey);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(date);
  start.setDate(date.getDate() + diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: formatLocalDate(start), end: formatLocalDate(end) };
}

function formatDateTimeLabel(dateValue?: string | null, timeValue?: string | null): string {
  const datePart = formatDateLabel(dateValue);
  const timePart = timeValue ? timeValue.slice(0, 5) : "--:--";
  return `${datePart} HORA: ${timePart}`;
}

function formatValue(value?: number | null, unit = "g"): string {
  if (value === null || value === undefined) return "No disponible";
  return `${value.toLocaleString()} ${unit}`;
}

function buildImpactClass(classification?: string | null): "bajo" | "moderado" | "alto" {
  const normalized = String(classification || "").toLowerCase();
  if (normalized.includes("alto")) return "alto";
  if (normalized.includes("bajo")) return "bajo";
  return "moderado";
}

function buildCardImpact(item: AdditionalIntakeApiItem): "bajo" | "moderado" | "alto" {
  if (item.calorias_estimadas === null || item.calorias_estimadas === undefined) return "moderado";
  if (item.calorias_estimadas >= 500) return "alto";
  if (item.calorias_estimadas >= 180) return "moderado";
  return "bajo";
}

function unwrapResponse<T>(payload: { data?: T } | T): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as { data?: T }).data as T;
  }
  return payload as T;
}

async function requestWithFallback<T>(bases: string[], buildPath: (base: string) => string, token: string): Promise<T> {
  let lastError: unknown;
  for (const base of bases) {
    try {
      return await apiRequest<T>(buildPath(base), { method: "GET", accessToken: token });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export function TabConsumo({ patientId, profileId }: { patientId: number; profileId?: number | null }) {
  const { toast } = useToast();
  const [items, setItems] = useState<AdditionalIntakeCard[]>([]);
  const [impact, setImpact] = useState<AdditionalIntakeImpactApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => formatLocalDate(new Date()));
  const resolvedPatientRefId = profileId ?? patientId;

  useEffect(() => {
    const fetchData = async () => {
      if (!resolvedPatientRefId || Number.isNaN(resolvedPatientRefId)) {
        setItems([]);
        setImpact(null);
        setLoading(false);
        return;
      }

      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) {
        setItems([]);
        setImpact(null);
        setLoading(false);
        toast({ title: "Sesion no valida", description: "No se encontro token de acceso.", variant: "destructive" });
        return;
      }

      setLoading(true);
      const [itemsResult, impactResult] = await Promise.allSettled([
        requestWithFallback<{ success?: boolean; data?: AdditionalIntakeApiItem[] }>(
          ADDITIONAL_INTAKE_ENDPOINTS,
          (base) => `${base}/${resolvedPatientRefId}`,
          token,
        ),
        requestWithFallback<{ success?: boolean; data?: AdditionalIntakeImpactApi }>(
          ADDITIONAL_INTAKE_IMPACT_ENDPOINTS,
          (base) => `${base}/${resolvedPatientRefId}/impact`,
          token,
        ),
      ]);

      if (itemsResult.status === "fulfilled") {
        const rawItems = unwrapResponse(itemsResult.value);
        setItems(rawItems.map((item) => ({
          id: item.id_consumo_adicional,
          name: item.descripcion_alimento || "Consumo adicional",
          description: item.descripcion_alimento || "Sin descripción",
          rawDate: normalizeDateKey(item.fecha),
          date: formatDateLabel(item.fecha),
          time: item.hora ? item.hora.slice(0, 5) : "--:--",
          calories: item.calorias_estimadas ?? 0,
          portionValue: item.porcion_g ?? null,
          confirmed: Boolean(item.confirmado),
          summed: Boolean(item.calorias_sumadas),
          confidence: item.confianza_pct === null || item.confianza_pct === undefined ? "No disponible" : `${item.confianza_pct}%`,
          portion: formatValue(item.porcion_g),
          proteins: formatValue(item.proteinas_g),
          carbs: formatValue(item.carbohidratos_g),
          fats: formatValue(item.grasas_g),
          impact: buildCardImpact(item),
          imageUrl: item.imagen_url || "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&h=260&fit=crop",
          source: item.fuente_estimacion || "Estimación del sistema",
          detectedFoods: item.alimentos_detectados?.map((food) => food.nombre).filter(Boolean).join(", ") || "Sin detección detallada",
        })));
      } else {
        setItems([]);
      }

      if (impactResult.status === "fulfilled") {
        setImpact(unwrapResponse(impactResult.value));
      } else {
        setImpact(null);
      }

      if (itemsResult.status === "rejected" && impactResult.status === "rejected") {
        toast({
          title: "No se pudo cargar el consumo adicional",
          description: "Verifica los endpoints /additional-intake/patient/{id} y /additional-intake/patient/{id}/impact.",
          variant: "destructive",
        });
      }

      setLoading(false);
    };

    void fetchData();
  }, [resolvedPatientRefId, toast]);

  const dayItems = useMemo(() => items.filter((item) => item.rawDate === selectedDate), [items, selectedDate]);
  const selectedWeek = useMemo(() => getWeekRange(selectedDate), [selectedDate]);
  const weekItems = useMemo(() => items
    .filter((item) => item.rawDate >= selectedWeek.start && item.rawDate <= selectedWeek.end)
    .sort((a, b) => `${a.rawDate} ${a.time}`.localeCompare(`${b.rawDate} ${b.time}`)), [items, selectedWeek]);
  const dayTotalCals = dayItems.reduce((sum, item) => sum + item.calories, 0);
  const weekTotalCals = weekItems.reduce((sum, item) => sum + item.calories, 0);
  const avgDaily = Math.round(weekTotalCals / 7);
  const impactClass = buildImpactClass(impact?.clasificacion_impacto);
  const deviationLevel = weekTotalCals > 1200 ? "Alto" : weekTotalCals > 600 ? "Medio" : "Bajo";
  const dayImpactLevel = dayTotalCals > 1200 ? "Alto" : dayTotalCals > 600 ? "Medio" : "Bajo";
  const deviationColor = deviationLevel === "Alto" ? "text-accent" : deviationLevel === "Medio" ? "text-primary" : "text-emerald-400";
  const totalConfirmed = dayItems.filter((item) => item.confirmed).length;
  const totalDiscarded = dayItems.filter((item) => !item.confirmed).length;
  const dayPctConfirmation = dayItems.length > 0 ? Math.round((totalConfirmed / dayItems.length) * 100) : 0;
  const pctConfirmation = impact?.analisis?.pct_confirmacion ?? (items.length > 0 ? Math.round((totalConfirmed / items.length) * 100) : 0);
  const impactMessage = impact?.analisis?.mensaje || "Sin anÃ¡lisis de impacto disponible.";

  const chartData = useMemo(() => {
    let accumulated = 0;
    return weekItems.map((item) => {
      accumulated += item.calories;
      return {
        dia: `${item.date} ${item.time}`,
        adicionales: item.calories,
        acumulado: accumulated,
      };
    });
  }, [weekItems]);

  return (
    <div className="space-y-6 min-w-0">
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Análisis de Consumo Adicional</h3>
          <p className="text-xs text-muted-foreground mt-1">Alimentos y bebidas fuera del plan nutricional</p>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary sm:w-auto"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "CalorÃ­as adicionales totales", value: `${weekTotalCals.toLocaleString()} kcal`, icon: Flame, accent: true },
          { label: "Promedio diario de exceso", value: `${avgDaily} kcal`, icon: TrendingUp, accent: avgDaily > 150 },
          { label: "Registros de consumo", value: weekItems.length.toString(), icon: UtensilsCrossed, accent: false },
          { label: "Clasificación de impacto", value: impact?.clasificacion_impacto || "Sin datos", icon: AlertTriangle, accent: impactClass === "alto" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={`h-4 w-4 ${kpi.accent ? "text-accent" : "text-primary"}`} />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
            </div>
            <p className={`text-xl font-bold ${kpi.accent ? "text-accent" : "text-foreground"}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-1">Resumen de consumo por dia</h4>
            <p className="text-xs text-muted-foreground">
              Total del {formatDateLabel(selectedDate)}: {dayTotalCals.toLocaleString()} kcal en {dayItems.length} consumos adicionales.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Consumos diarios</p>
              <p className="text-sm font-semibold text-foreground">{dayItems.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-background/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Calorias diarias</p>
              <p className="text-sm font-semibold text-foreground">{dayTotalCals.toLocaleString()} kcal</p>
            </div>
            <div className="rounded-lg border border-border bg-background/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Clase de impacto</p>
              <p className="text-sm font-semibold text-foreground">{dayImpactLevel}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Registro de Consumos</h4>
        {loading ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">Cargando consumos adicionales...</div>
        ) : dayItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">No hay consumos adicionales registrados para este dia.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {dayItems.map((item) => {
              const itemImpact = impactConfig[item.impact];
              return (
                <div key={item.id} className="rounded-xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-lg hover:shadow-primary/5">
                  <Dialog>
                    <DialogTrigger asChild>
                      <img src={item.imageUrl} alt={item.name} className="h-32 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity" />
                    </DialogTrigger>
                    <DialogContent className="max-w-lg p-0 overflow-hidden">
                      <img src={item.imageUrl} alt={item.name} className="w-full" />
                    </DialogContent>
                  </Dialog>
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${itemImpact.className}`}>{itemImpact.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] ${item.confirmed ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground border-border"}`}>
                        {item.confirmed ? "Confirmado" : "Pendiente"}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] ${item.summed ? "bg-sky-500/15 text-sky-400 border-sky-500/30" : "bg-muted text-muted-foreground border-border"}`}>
                        {item.summed ? "Sumado" : "No sumado"}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground pt-1 border-t border-border">
                      <div className="flex items-center justify-between gap-2">
                        <span>{item.date} HORA: {item.time}</span>
                        <span className="font-semibold text-foreground">{item.calories} kcal</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span>Confianza</span>
                        <span className="text-foreground">{item.confidence}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h4 className="text-sm font-semibold text-foreground mb-1">Detalle de consumos adicionales</h4>
        <p className="text-xs text-muted-foreground mb-4">Listado de registros recibidos desde el endpoint</p>
        <div className="overflow-x-auto">
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-xs">Fecha</TableHead>
                <TableHead className="text-xs">Descripción</TableHead>
                <TableHead className="text-xs text-right">Calorías</TableHead>
                <TableHead className="text-xs text-right">Porción</TableHead>
                <TableHead className="text-xs text-right">Proteínas</TableHead>
                <TableHead className="text-xs text-right">Carbohidratos</TableHead>
                <TableHead className="text-xs text-right">Grasas</TableHead>
                <TableHead className="text-xs text-right">Confianza</TableHead>
                <TableHead className="text-xs">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dayItems.map((row) => {
                const cls = impactConfig[row.impact];
                return (
                  <TableRow key={row.id} className="border-border">
                    <TableCell className="text-xs font-medium">{formatDateTimeLabel(row.date, row.time)}</TableCell>
                    <TableCell className="text-xs">{row.description}</TableCell>
                    <TableCell className="text-xs text-right font-medium">{row.calories.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-right">{row.portion}</TableCell>
                    <TableCell className="text-xs text-right">{row.proteins}</TableCell>
                    <TableCell className="text-xs text-right">{row.carbs}</TableCell>
                    <TableCell className="text-xs text-right">{row.fats}</TableCell>
                    <TableCell className="text-xs text-right">{row.confidence}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <span className={`text-xs font-medium ${cls.className}`}>{cls.label}</span>
                        <span className={`text-xs font-medium ${row.confirmed ? "text-emerald-400" : "text-muted-foreground"}`}>{row.confirmed ? "Confirmado" : "Pendiente"}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="border-border bg-muted/30">
                <TableCell className="text-xs font-semibold">Acumulado</TableCell>
                <TableCell className="text-xs font-semibold">{dayItems.length} consumos</TableCell>
                <TableCell className="text-xs text-right font-semibold">{dayTotalCals.toLocaleString()}</TableCell>
                <TableCell className="text-xs text-right font-semibold">
                  {dayItems.reduce((sum, row) => sum + (row.portionValue ?? 0), 0).toLocaleString()} g
                </TableCell>
                <TableCell className="text-xs text-right font-semibold">{dayItems.reduce((sum, row) => sum + (Number(row.proteins.replace(/[^\d.-]/g, "")) || 0), 0).toLocaleString()} g</TableCell>
                <TableCell className="text-xs text-right font-semibold">{dayItems.reduce((sum, row) => sum + (Number(row.carbs.replace(/[^\d.-]/g, "")) || 0), 0).toLocaleString()} g</TableCell>
                <TableCell className="text-xs text-right font-semibold">{dayItems.reduce((sum, row) => sum + (Number(row.fats.replace(/[^\d.-]/g, "")) || 0), 0).toLocaleString()} g</TableCell>
                <TableCell className="text-xs text-right font-semibold">{dayPctConfirmation}%</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h4 className="text-sm font-semibold text-foreground mb-1">Exceso Calórico Acumulado</h4>
          <p className="text-xs text-muted-foreground mb-4">Tendencia acumulada de la semana seleccionada</p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} unit=" kcal" />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="acumulado" name="Acumulado" stroke="hsl(44 90% 46%)" strokeWidth={2} dot={{ fill: "hsl(44 90% 46%)", r: 4 }} />
              <Line type="monotone" dataKey="adicionales" name="Registro" stroke="hsl(38 98% 40%)" strokeWidth={1.5} strokeDasharray="4 4" dot={{ fill: "hsl(38 98% 40%)", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
