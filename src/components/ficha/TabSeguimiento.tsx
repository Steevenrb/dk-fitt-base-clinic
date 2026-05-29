import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ACCESS_TOKEN_KEY = "dkfitt-access-token";

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

type ApiListResponse = {
  success?: boolean;
  data?: MealTrackingRow[];
};

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(value?: string) {
  if (!value) return "--:--";
  const [hour = "", minute = ""] = value.split(":");
  return hour && minute ? `${hour}:${minute}` : value;
}

function extractRows(payload: unknown): MealTrackingRow[] {
  if (Array.isArray(payload)) return payload as MealTrackingRow[];
  if (!payload || typeof payload !== "object") return [];
  const root = payload as ApiListResponse;
  return Array.isArray(root.data) ? root.data : [];
}

const getLevel = (pct: number) => {
  if (pct >= 80) return { label: "Alta", className: "bg-primary/15 text-primary border-primary/30" };
  if (pct >= 50) return { label: "Media", className: "bg-muted text-muted-foreground border-border" };
  return { label: "Baja", className: "bg-accent/20 text-accent border-accent/30" };
};

export function TabSeguimiento({ patientId, profileId }: { patientId: number; profileId?: number | null }) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(() => formatLocalDate(new Date()));
  const [meals, setMeals] = useState<MealTrackingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const resolvedPatientRefId = profileId ?? patientId;

  useEffect(() => {
    const fetchMeals = async () => {
      if (!resolvedPatientRefId || Number.isNaN(resolvedPatientRefId)) return;
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) {
        toast({ title: "Sesion no valida", description: "No se encontro token de acceso.", variant: "destructive" });
        return;
      }

      setLoading(true);
      try {
        const response = await apiRequest<unknown>(
          `/meal-tracking/patient/${resolvedPatientRefId}?fecha=${selectedDate}`,
          { method: "GET", accessToken: token }
        );
        setMeals(extractRows(response));
      } catch {
        setMeals([]);
        toast({
          title: "No se pudo cargar seguimiento",
          description: "Verifica endpoint GET /meal-tracking/patient/{id}?fecha=YYYY-MM-DD.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void fetchMeals();
  }, [resolvedPatientRefId, selectedDate, toast]);

  const mealsDone = useMemo(() => meals.filter((m) => m.realizado).length, [meals]);
  const mealAdherence = meals.length > 0 ? Math.round((mealsDone / meals.length) * 100) : 0;
  const level = getLevel(mealAdherence);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Adherencia del Dia</h3>
          <Badge variant="outline" className={`text-[11px] ${level.className}`}>{level.label}</Badge>
        </div>
        <div className="flex items-center gap-4">
          <Progress value={mealAdherence} className="flex-1 h-3" />
          <span className="text-lg font-bold text-primary">{mealAdherence}%</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {mealsDone}/{meals.length} comidas cumplidas
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground">Comidas del Dia</h3>
            <p className="text-xs text-muted-foreground">
              {loading ? "Cargando..." : `${mealsDone} de ${meals.length} cumplidas`}
            </p>
          </div>
          <div className="divide-y divide-border">
            {loading && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">Cargando comidas...</div>
            )}

            {!loading && meals.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No hay registros de comidas para esta fecha.
              </div>
            )}

            {!loading && meals.map((m) => {
              const done = m.realizado === true;
              const mealName = [m.nombre_tiempo, m.nombre_plato].filter(Boolean).join(" - ") || "Comida registrada";
              return (
                <div key={m.id_seguimiento_comida ?? m.id_menu_diario ?? mealName} className="flex items-center gap-3 px-5 py-3">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${done ? "bg-emerald-500/15 text-emerald-400" : "bg-accent/15 text-accent"}`}>
                    {done ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}>{mealName}</p>
                    {typeof m.calorias_aportadas === "number" && (
                      <p className="text-xs text-muted-foreground">{m.calorias_aportadas} kcal</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatTime(m.hora_registro)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground">Ejercicios del Dia</h3>
            <p className="text-xs text-muted-foreground">Pendiente de integracion</p>
          </div>
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            Aun no hay endpoint disponible para consultar ejercicios cumplidos.
          </div>
        </div>
      </div>
    </div>
  );
}
