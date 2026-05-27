import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";
import {
  AlertTriangle,
  Check,
  Clock,
  Edit,
  Loader2,
  Moon,
  Plus,
  Search,
  Sun,
  Trash2,
  UtensilsCrossed,
  Users,
  X,
  Apple,
} from "lucide-react";
import { toast } from "sonner";
import { apiRequest, ApiError } from "@/lib/api";

interface Ingrediente {
  id_alimento_detalle: number | null;
  id_alimento?: number | null;
  nombre: string;
  cantidad_g: number;
  calorias_aportadas: number;
  proteinas?: number | null;
  carbohidratos?: number | null;
  grasas?: number | null;
  fibra?: number | null;
  azucares?: number | null;
  sodio?: number | null;
}

interface Receta {
  id_plato: number;
  nombre: string;
  descripcion: string | null;
  modo_preparacion: string;
  calorias_totales: number;
  proteinas_totales?: number | null;
  carbohidratos_totales?: number | null;
  grasas_totales?: number | null;
  tiempo_preparacion_min: number | null;
  generado_por_ia: boolean;
  activo: boolean;
  id_tiempo_comida: number | null;
  imagen_url: string | null;
  created_at: string;
  usos_totales?: number;
  ingredientes?: Ingrediente[];
  tiene_restricciones?: boolean;
  aptitudes?: Array<{ codigo?: string; id_aptitud?: number; nombre?: string }>;
}

interface RecetaDetalle extends Receta {
  ingredientes: Ingrediente[];
}

interface GenerarRecetaPayload {
  id_tiempo_comida: number;
  tiempo_comida_nombre: string;
  calorias_objetivo: number;
  restricciones?: string[];
  aptitudes?: number[];
  forzar_nuevo?: boolean;
}

interface RecetaGeneradaResponse {
  id_plato: number;
  nombre: string;
  descripcion: string | null;
  calorias_totales: number;
  tiempo_preparacion_min: number | null;
  ingredientes: Ingrediente[];
  guardado_en_menu: boolean;
  uso_gpt: boolean;
}

interface ApiListResponse<T> {
  success?: boolean;
  data?: T[];
  items?: T[];
  results?: T[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    total_pages?: number;
    totalPages?: number;
  };
}

type TiempoComida = {
  id?: number;
  id_tiempo_comida?: number;
  nombre?: string;
  tiempo_comida_nombre?: string;
};

type ManualFormState = {
  nombre: string;
  descripcion: string;
  id_tiempo_comida: string;
  calorias_totales: string;
  tiempo_preparacion_min: string;
  modo_preparacion: string;
  aptitudes: number[];
};

type GenerarFormState = {
  id_tiempo_comida: string;
  calorias_objetivo: string;
  restricciones: string[];
  restriccionInput: string;
  aptitudes: number[];
};

const PLATOS_ENDPOINTS = ["/dishes"];
const TIEMPOS_ENDPOINTS = ["/tiempos-comida"];
const GENERATE_ENDPOINTS = ["/recipe-generator/generate-generic"];
const APTITUDES_ENDPOINTS = ["/aptitudes-clinicas"];

const APTITUDES_CATALOGO = [
  { codigo: "general", nombre: "Pacientes en general" },
  { codigo: "diabetes", nombre: "Diabéticos" },
  { codigo: "hipertension", nombre: "Hipertensos" },
  { codigo: "celiaco", nombre: "Celíacos (sin gluten)" },
  { codigo: "lactosa", nombre: "Intolerantes a la lactosa" },
  { codigo: "vegetariano", nombre: "Vegetarianos" },
  { codigo: "vegano", nombre: "Veganos" },
  { codigo: "renal", nombre: "Insuficiencia renal" },
];

const chartConfig = {
  proteinas: { label: "Proteínas", color: "hsl(var(--primary))" },
  carbohidratos: { label: "Carbohidratos", color: "hsl(38, 98%, 40%)" },
  grasas: { label: "Grasas", color: "hsl(0, 84%, 60%)" },
};

const emptyManualForm: ManualFormState = {
  nombre: "",
  descripcion: "",
  id_tiempo_comida: "",
  calorias_totales: "",
  tiempo_preparacion_min: "",
  modo_preparacion: "",
  aptitudes: [],
};

const emptyGenerarForm: GenerarFormState = {
  id_tiempo_comida: "",
  calorias_objetivo: "",
  restricciones: [],
  restriccionInput: "",
  aptitudes: [],
};

const normalizeTimeName = (value?: string | null) => (value || "").toLowerCase();
const normalizeTiempoNombreForApi = (value?: string | null) =>
  (value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "_");

const tiempoApiById: Record<number, string> = {
  1: "desayuno",
  2: "media_manana",
  3: "almuerzo",
  4: "media_tarde",
  5: "cena",
};

const timeIconMap: Record<string, { icon: ComponentType<{ className?: string }>; bg: string; color: string }> = {
  desayuno: { icon: Sun, bg: "bg-amber-100", color: "text-amber-600" },
  almuerzo: { icon: UtensilsCrossed, bg: "bg-orange-100", color: "text-orange-600" },
  cena: { icon: Moon, bg: "bg-sky-100", color: "text-sky-600" },
  snack: { icon: Apple, bg: "bg-emerald-100", color: "text-emerald-600" },
  "media mañana": { icon: Apple, bg: "bg-emerald-100", color: "text-emerald-600" },
  "media tarde": { icon: Apple, bg: "bg-emerald-100", color: "text-emerald-600" },
};

const calcularMacros = (ingredientes: Ingrediente[]) => {
  const totales = ingredientes.reduce(
    (acc, ing) => ({
      proteinas: acc.proteinas + (Number(ing.proteinas ?? 0) * ing.cantidad_g / 100),
      carbohidratos: acc.carbohidratos + (Number(ing.carbohidratos ?? 0) * ing.cantidad_g / 100),
      grasas: acc.grasas + (Number(ing.grasas ?? 0) * ing.cantidad_g / 100),
      fibra: acc.fibra + (Number(ing.fibra ?? 0) * ing.cantidad_g / 100),
      sodio: acc.sodio + (Number(ing.sodio ?? 0) * ing.cantidad_g / 100),
    }),
    { proteinas: 0, carbohidratos: 0, grasas: 0, fibra: 0, sodio: 0 },
  );

  return {
    proteinas: Math.round(totales.proteinas * 10) / 10,
    carbohidratos: Math.round(totales.carbohidratos * 10) / 10,
    grasas: Math.round(totales.grasas * 10) / 10,
    fibra: Math.round(totales.fibra * 10) / 10,
    sodio: Math.round(totales.sodio * 10) / 10,
  };
};

const parsearPreparacion = (texto: string): string[] => {
  if (!texto?.trim()) return [];
  if (texto.includes("\n")) {
    return texto.split("\n").map((s) => s.trim()).filter(Boolean);
  }
  return texto
    .split(/(?=\d+\.\s)/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const buildMacroData = (totals: { proteinas: number; carbohidratos: number; grasas: number }) => {
  const calProt = totals.proteinas * 4;
  const calCarb = totals.carbohidratos * 4;
  const calGras = totals.grasas * 9;
  const total = calProt + calCarb + calGras || 1;
  return [
    { name: "Proteínas", value: Math.round((calProt / total) * 100), fill: "hsl(var(--primary))" },
    { name: "Carbohidratos", value: Math.round((calCarb / total) * 100), fill: "hsl(38, 98%, 40%)" },
    { name: "Grasas", value: Math.round((calGras / total) * 100), fill: "hsl(0, 84%, 60%)" },
  ];
};

const extractList = <T,>(payload: ApiListResponse<T> | T[]): T[] => {
  if (Array.isArray(payload)) return payload;
  return payload.data || payload.items || payload.results || [];
};

const extractMeta = (payload: ApiListResponse<unknown> | unknown): {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
} => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  const root = payload as ApiListResponse<unknown> & { data?: { meta?: ApiListResponse<unknown>['meta'] } };
  const meta = root.meta || root.data?.meta;
  if (!meta) return {};
  return {
    page: meta.page,
    limit: meta.limit,
    total: meta.total,
    totalPages: meta.total_pages ?? meta.totalPages,
  };
};

const extractItem = <T,>(payload: { data?: T } | T): T => {
  if (payload && typeof payload === "object" && "data" in payload && payload.data) {
    return payload.data;
  }
  return payload as T;
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    const payload = error.payload as { message?: string; error?: { message?: string } } | null;
    return payload?.error?.message || payload?.message || error.message || fallback;
  }
  if (error instanceof Error) return error.message || fallback;
  return fallback;
};

const getTiempoId = (item: TiempoComida) => item.id ?? item.id_tiempo_comida ?? null;
const getTiempoNombre = (item: TiempoComida) => item.nombre || item.tiempo_comida_nombre || "";

const formatCantidad = (value: number) => {
  if (value < 10) return `${value.toFixed(1)} ml`;
  return `${Math.round(value)} g`;
};

const requestFirstOk = async <T,>(endpoints: string[], options: Parameters<typeof apiRequest>[1]) => {
  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      return await apiRequest<T>(endpoint, options);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};

type TabRecetasProps = {
  onCreateManual?: () => void;
  refreshSignal?: number;
};

export function TabRecetas({ onCreateManual, refreshSignal }: TabRecetasProps) {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [recetaDetalle, setRecetaDetalle] = useState<RecetaDetalle | null>(null);
  const [tiemposComida, setTiemposComida] = useState<TiempoComida[]>([]);
  const [aptitudesCatalogo, setAptitudesCatalogo] = useState<Array<{ id_aptitud: number; nombre: string; codigo?: string }>>([]);

  const [loading, setLoading] = useState(false);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [loadingGenerar, setLoadingGenerar] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [mensajeProgreso, setMensajeProgreso] = useState("");
  const progresoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [errorGenerar, setErrorGenerar] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [modalDetalle, setModalDetalle] = useState(false);
  const [modalCrearManual, setModalCrearManual] = useState(false);
  const [modalGenerarIA, setModalGenerarIA] = useState(false);
  const [recetaEditando, setRecetaEditando] = useState<Receta | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [filtroTiempo, setFiltroTiempo] = useState<number | "todas">("todas");
  const [filtroOrigen, setFiltroOrigen] = useState<"todos" | "ia" | "manual">("todos");
  const [pagina, setPagina] = useState(1);
  const recetasPorPagina = 12;

  const [manualForm, setManualForm] = useState<ManualFormState>(emptyManualForm);
  const [generarForm, setGenerarForm] = useState<GenerarFormState>(emptyGenerarForm);
  const [loadingDetalleId, setLoadingDetalleId] = useState<number | null>(null);

  const canGenerateIA = true;

  const tiemposNormalized = useMemo(() => {
    return tiemposComida
      .map((item) => ({ id: getTiempoId(item), nombre: getTiempoNombre(item) }))
      .filter((item): item is { id: number; nombre: string } => typeof item.id === "number" && !!item.nombre);
  }, [tiemposComida]);

  const tiemposMap = useMemo(() => {
    return tiemposNormalized.reduce<Record<number, string>>((acc, item) => {
      acc[item.id] = item.nombre;
      return acc;
    }, {});
  }, [tiemposNormalized]);

  const loadInitialData = useCallback(async () => {
    const token = localStorage.getItem("dkfitt-access-token");
    if (!token) {
      setError("Sesion no valida");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fetchAllRecetas = async () => {
        const limit = 50;
        let page = 1;
        let all: Receta[] = [];
        let totalPages: number | undefined;

        for (let i = 0; i < 50; i += 1) {
          const recetasRes = await requestFirstOk<ApiListResponse<Receta> | Receta[]>(
            PLATOS_ENDPOINTS.map((base) => {
              const withActive = base.includes("?") ? `${base}&activo=true` : `${base}?activo=true`;
              const separator = withActive.includes("?") ? "&" : "?";
              return `${withActive}${separator}page=${page}&limit=${limit}`;
            }),
            { method: "GET", accessToken: token },
          );

          const list = extractList(recetasRes);
          all = all.concat(list);

          const meta = extractMeta(recetasRes);
          if (meta.totalPages) {
            totalPages = meta.totalPages;
          }

          if (totalPages && page >= totalPages) break;
          if (!totalPages && list.length < limit) break;

          page += 1;
        }

        return all;
      };

      const [recetasAll, tiemposRes] = await Promise.all([
        fetchAllRecetas(),
        requestFirstOk<ApiListResponse<TiempoComida> | TiempoComida[]>(
          TIEMPOS_ENDPOINTS,
          { method: "GET", accessToken: token },
        ),
      ]);
      setRecetas(recetasAll);
      setTiemposComida(extractList(tiemposRes));
    } catch {
      setError("Error al cargar las recetas. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData, refreshSignal]);

  const loadAptitudes = useCallback(async () => {
    if (aptitudesCatalogo.length > 0) return;
    const token = localStorage.getItem("dkfitt-access-token");
    if (!token) return;
    try {
      const res = await requestFirstOk<ApiListResponse<{ id_aptitud: number; nombre: string; codigo?: string }> | { id_aptitud: number; nombre: string; codigo?: string }[]>(
        APTITUDES_ENDPOINTS,
        { method: "GET", accessToken: token },
      );
      setAptitudesCatalogo(extractList(res));
    } catch {
      toast.error("No se pudo cargar las aptitudes clinicas");
    }
  }, [aptitudesCatalogo.length]);

  useEffect(() => {
    if (!modalCrearManual && !modalGenerarIA && !modalDetalle) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setModalCrearManual(false);
      setModalGenerarIA(false);
      setModalDetalle(false);
      setRecetaDetalle(null);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [modalCrearManual, modalGenerarIA, modalDetalle]);

  useEffect(() => {
    return () => {
      if (progresoRef.current) clearInterval(progresoRef.current);
    };
  }, []);

  const iniciarProgreso = () => {
    setProgreso(0);
    const mensajes = [
      "Analizando tu perfil...",
      "Eligiendo ingredientes frescos...",
      "Calculando valores nutricionales...",
      "Escribiendo los pasos de preparacion...",
      "Verificando aptitudes clinicas...",
      "Casi listo...",
    ];
    let idx = 0;
    setMensajeProgreso(mensajes[0]);

    if (progresoRef.current) clearInterval(progresoRef.current);
    progresoRef.current = setInterval(() => {
      setProgreso((prev) => {
        if (prev < 30) return prev + 3;
        if (prev < 60) return prev + 2;
        if (prev < 85) return prev + 0.5;
        return prev;
      });
      idx = Math.min(idx + 1, mensajes.length - 1);
      setMensajeProgreso(mensajes[idx]);
    }, 800);
  };

  const finalizarProgreso = (mensajeFinal: string) => {
    if (progresoRef.current) clearInterval(progresoRef.current);
    setProgreso(100);
    setMensajeProgreso(mensajeFinal);
    setTimeout(() => {
      setProgreso(0);
      setMensajeProgreso("");
    }, 800);
  };

  const cancelarProgreso = () => {
    if (progresoRef.current) clearInterval(progresoRef.current);
    setProgreso(0);
    setMensajeProgreso("");
  };

  const recetasFiltradas = useMemo(() => {
    return recetas.filter((r) => {
      const matchBusqueda = r.nombre.toLowerCase().includes(busqueda.toLowerCase());
      const matchTiempo = filtroTiempo === "todas" || r.id_tiempo_comida === filtroTiempo;
      const matchOrigen =
        filtroOrigen === "todos"
        || (filtroOrigen === "ia" && r.generado_por_ia)
        || (filtroOrigen === "manual" && !r.generado_por_ia);
      return matchBusqueda && matchTiempo && matchOrigen;
    });
  }, [recetas, busqueda, filtroTiempo, filtroOrigen]);

  const totalPaginas = useMemo(() => {
    return Math.max(1, Math.ceil(recetasFiltradas.length / recetasPorPagina));
  }, [recetasFiltradas.length]);

  const recetasPaginadas = useMemo(() => {
    const start = (pagina - 1) * recetasPorPagina;
    return recetasFiltradas.slice(start, start + recetasPorPagina);
  }, [recetasFiltradas, pagina]);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroTiempo, filtroOrigen, recetas.length]);

  const handleOpenDetalle = async (receta: Receta) => {
    const token = localStorage.getItem("dkfitt-access-token");
    if (!token) {
      toast.error("Sesion no valida");
      return;
    }

    setLoadingDetalle(true);
    setLoadingDetalleId(receta.id_plato);
    try {
      const res = await requestFirstOk<{ data?: RecetaDetalle } | RecetaDetalle>(
        PLATOS_ENDPOINTS.map((base) => `${base}/${receta.id_plato}`),
        { method: "GET", accessToken: token },
      );
      const detalle = extractItem(res) as RecetaDetalle & {
        plato?: Receta;
        ingredientes?: Ingrediente[];
        aptitudes?: Array<{ codigo?: string; id_aptitud?: number; nombre?: string }>;
      };
      const baseReceta = detalle.plato ?? detalle;
      const merged: RecetaDetalle = {
        ...receta,
        ...baseReceta,
        ingredientes: detalle.ingredientes || receta.ingredientes || [],
        aptitudes: detalle.aptitudes || receta.aptitudes || [],
        modo_preparacion: baseReceta.modo_preparacion || receta.modo_preparacion || "",
        created_at: baseReceta.created_at || receta.created_at || new Date().toISOString(),
      };
      setRecetaDetalle(merged);
      setModalDetalle(true);
    } catch {
      toast.error("No se pudo cargar el detalle de la receta");
    } finally {
      setLoadingDetalle(false);
      setLoadingDetalleId(null);
    }
  };

  const handleDeactivate = async (receta: Receta) => {
    if (!window.confirm("¿Deseas eliminar esta receta?")) return;
    const token = localStorage.getItem("dkfitt-access-token");
    if (!token) {
      toast.error("Sesion no valida");
      return;
    }

    try {
      await requestFirstOk(
        PLATOS_ENDPOINTS.map((base) => `${base}/${receta.id_plato}`),
        { method: "DELETE", accessToken: token },
      );
      setRecetas((prev) => prev.filter((item) => item.id_plato !== receta.id_plato));
      toast.success("Receta eliminada");
      setModalDetalle(false);
      setRecetaDetalle(null);
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      const payload = apiError?.payload as { error?: { code?: string; message?: string }; message?: string } | null;
      const errorCode = payload?.error?.code;
      if (apiError?.status === 422 && errorCode === "FOREIGN_KEY_VIOLATION") {
        try {
          await requestFirstOk(
            PLATOS_ENDPOINTS.map((base) => `${base}/${receta.id_plato}/force`),
            { method: "DELETE", accessToken: token },
          );
          setRecetas((prev) => prev.filter((item) => item.id_plato !== receta.id_plato));
          toast.success("Receta eliminada");
          setModalDetalle(false);
          setRecetaDetalle(null);
          return;
        } catch (forceError) {
          toast.error(getApiErrorMessage(forceError, "No se pudo eliminar la receta"));
          return;
        }
      }
      toast.error(getApiErrorMessage(error, "No se pudo eliminar la receta"));
    }
  };

  const openCreateManual = () => {
    setRecetaEditando(null);
    setManualForm(emptyManualForm);
    void loadAptitudes();
    setModalCrearManual(true);
  };

  const openEditManual = (receta: RecetaDetalle) => {
    setRecetaEditando(receta);
    setManualForm({
      nombre: receta.nombre || "",
      descripcion: receta.descripcion || "",
      id_tiempo_comida: receta.id_tiempo_comida ? String(receta.id_tiempo_comida) : "",
      calorias_totales: receta.calorias_totales ? String(receta.calorias_totales) : "",
      tiempo_preparacion_min: receta.tiempo_preparacion_min ? String(receta.tiempo_preparacion_min) : "",
      modo_preparacion: receta.modo_preparacion || "",
      aptitudes: (receta.aptitudes ?? [])
        .map((apt) => apt.id_aptitud)
        .filter((id): id is number => typeof id === "number"),
    });
    void loadAptitudes();
    setModalCrearManual(true);
  };

  const handleSaveManual = async () => {
    if (!manualForm.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    if (!manualForm.id_tiempo_comida) {
      toast.error("Selecciona un tiempo de comida");
      return;
    }
    if (!manualForm.calorias_totales.trim()) {
      toast.error("Las calorías totales son obligatorias");
      return;
    }
    if (!manualForm.modo_preparacion.trim()) {
      toast.error("El modo de preparación es obligatorio");
      return;
    }

    const token = localStorage.getItem("dkfitt-access-token");
    if (!token) {
      toast.error("Sesion no valida");
      return;
    }

    const payload = {
      nombre: manualForm.nombre.trim(),
      descripcion: manualForm.descripcion.trim() || null,
      modo_preparacion: manualForm.modo_preparacion.trim(),
      calorias_totales: Number(manualForm.calorias_totales),
      tiempo_preparacion_min: manualForm.tiempo_preparacion_min ? Number(manualForm.tiempo_preparacion_min) : null,
      id_tiempo_comida: Number(manualForm.id_tiempo_comida),
      aptitudes: manualForm.aptitudes,
    };

    try {
      if (recetaEditando) {
        const res = await requestFirstOk<{ data?: Receta } | Receta>(
          PLATOS_ENDPOINTS.map((base) => `${base}/${recetaEditando.id_plato}`),
          { method: "PATCH", accessToken: token, body: payload },
        );
        const updated = extractItem(res);
        setRecetas((prev) => prev.map((item) => (item.id_plato === updated.id_plato ? updated : item)));
        toast.success("Receta actualizada");
      } else {
        const res = await requestFirstOk<{ data?: Receta } | Receta>(
          PLATOS_ENDPOINTS,
          { method: "POST", accessToken: token, body: payload },
        );
        const created = extractItem(res);
        setRecetas((prev) => [created, ...prev]);
        toast.success("Receta creada");
      }
      setModalCrearManual(false);
      setManualForm(emptyManualForm);
      setRecetaEditando(null);
    } catch {
      toast.error("No se pudo guardar la receta");
    }
  };

  const openGenerateModal = (prefill?: { id_tiempo_comida?: number | null; calorias_totales?: number | null }) => {
    setGenerarForm({
      id_tiempo_comida: prefill?.id_tiempo_comida ? String(prefill.id_tiempo_comida) : "",
      calorias_objetivo: prefill?.calorias_totales ? String(Math.round(prefill.calorias_totales)) : "",
      restricciones: [],
      restriccionInput: "",
      aptitudes: [],
    });
    setErrorGenerar(null);
    void loadAptitudes();
    setModalGenerarIA(true);
  };

  const handleGenerateIA = async () => {
    if (!canGenerateIA) return;
    if (!generarForm.id_tiempo_comida) {
      setErrorGenerar("Selecciona un tiempo de comida.");
      return;
    }
    const calorias = Number(generarForm.calorias_objetivo);
    if (!generarForm.calorias_objetivo || Number.isNaN(calorias)) {
      setErrorGenerar("Ingresa las calorias objetivo.");
      return;
    }
    if (calorias < 100 || calorias > 1500) {
      setErrorGenerar("Las calorias objetivo deben estar entre 100 y 1500.");
      return;
    }

    const token = localStorage.getItem("dkfitt-access-token");
    if (!token) {
      setErrorGenerar("Sesion no valida.");
      return;
    }

    setLoadingGenerar(true);
    setErrorGenerar(null);
    iniciarProgreso();
    try {
      const tiempo = tiemposNormalized.find((t) => t.id === Number(generarForm.id_tiempo_comida));
      const payload: GenerarRecetaPayload = {
        id_tiempo_comida: Number(generarForm.id_tiempo_comida),
        tiempo_comida_nombre: tiempoApiById[Number(generarForm.id_tiempo_comida)]
          || normalizeTiempoNombreForApi(tiempo?.nombre || ""),
        calorias_objetivo: Math.round(calorias),
        restricciones: generarForm.restricciones.length ? generarForm.restricciones : undefined,
        aptitudes: generarForm.aptitudes.length ? generarForm.aptitudes : undefined,
        forzar_nuevo: true,
      };
      const res = await requestFirstOk<{ data?: RecetaGeneradaResponse } | RecetaGeneradaResponse>(
        GENERATE_ENDPOINTS,
        { method: "POST", accessToken: token, body: payload },
      );
      const generado = extractItem(res);
      finalizarProgreso(generado.uso_gpt ? "Receta creada con IA" : "Receta generada");
      const nuevaReceta: Receta = {
        id_plato: generado.id_plato,
        nombre: generado.nombre,
        descripcion: generado.descripcion,
        calorias_totales: generado.calorias_totales,
        tiempo_preparacion_min: generado.tiempo_preparacion_min,
        ingredientes: generado.ingredientes,
        generado_por_ia: true,
        activo: true,
        id_tiempo_comida: Number(generarForm.id_tiempo_comida),
        imagen_url: null,
        created_at: new Date().toISOString(),
        modo_preparacion: "",
      };
      setRecetas((prev) => [nuevaReceta, ...prev]);
      setModalGenerarIA(false);
      setGenerarForm(emptyGenerarForm);
      void handleOpenDetalle(nuevaReceta);
      toast.success(generado.uso_gpt ? "Receta generada con IA" : "Receta encontrada en el catalogo");
    } catch (error) {
      cancelarProgreso();
      setErrorGenerar(getApiErrorMessage(error, "No se pudo generar la receta. Intenta de nuevo."));
    } finally {
      setLoadingGenerar(false);
    }
  };

  const renderSkeletons = () => {
    return Array.from({ length: 4 }).map((_, idx) => (
      <Card key={`sk-${idx}`} className="border-border bg-card overflow-hidden">
        <CardContent className="p-0">
          <div className="h-32 bg-muted/50 animate-pulse" />
          <div className="p-4 space-y-2.5">
            <div className="h-4 bg-muted/50 rounded animate-pulse" />
            <div className="h-3 bg-muted/40 rounded animate-pulse w-2/3" />
            <div className="h-5 bg-muted/50 rounded animate-pulse w-1/2" />
            <div className="h-3 bg-muted/40 rounded animate-pulse w-3/4" />
          </div>
        </CardContent>
      </Card>
    ));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar receta..." className="pl-9" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <Select value={String(filtroTiempo)} onValueChange={(value) => setFiltroTiempo(value === "todas" ? "todas" : Number(value))}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Tiempo de comida" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {tiemposNormalized.map((t) => (
                <SelectItem key={`filtro-tiempo-${t.id}-${t.nombre}`} value={String(t.id)}>{t.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroOrigen} onValueChange={(value) => setFiltroOrigen(value as "todos" | "ia" | "manual")}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Origen" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ia">IA</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Nueva receta</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openGenerateModal()}>
                Generar con IA
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCreateManual ?? openCreateManual}>
                Crear manualmente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={loadInitialData}>Reintentar</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading && renderSkeletons()}
        {!loading && recetasPaginadas.map((r) => {
          const timeName = r.id_tiempo_comida ? tiemposMap[r.id_tiempo_comida] : "General";
          const normalized = normalizeTimeName(timeName);
          const timeConfig = timeIconMap[normalized] || timeIconMap.snack;
          const Icon = timeConfig.icon;
          const macros = r.proteinas_totales != null && r.carbohidratos_totales != null && r.grasas_totales != null
            ? {
              proteinas: r.proteinas_totales,
              carbohidratos: r.carbohidratos_totales,
              grasas: r.grasas_totales,
            }
            : null;
          const isLoadingDetail = loadingDetalleId === r.id_plato;
          return (
            <Card
              key={r.id_plato}
              className="border-border bg-card hover:border-primary/40 transition-colors cursor-pointer group overflow-hidden relative"
              onClick={() => handleOpenDetalle(r)}
            >
              <CardContent className="p-0">
                {r.imagen_url ? (
                  <img src={r.imagen_url} alt={r.nombre} className="h-32 w-full object-cover" />
                ) : (
                  <div className={`h-32 ${timeConfig.bg} flex items-center justify-center rounded-t-lg relative`}>
                    <Icon className={`h-12 w-12 ${timeConfig.color}`} />
                    {r.generado_por_ia ? (
                      <Badge className="absolute top-2 right-2 bg-amber-400/90 text-amber-950 text-[10px] border border-amber-300">IA</Badge>
                    ) : (
                      <Badge className="absolute top-2 right-2 bg-violet-300 text-black text-[10px] border border-violet-300">Manual</Badge>
                    )}
                  </div>
                )}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm text-foreground leading-tight">{r.nombre}</h3>
                    <Badge variant="outline" className="text-[10px] shrink-0">{timeName || "General"}</Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{r.tiempo_preparacion_min ?? "—"} min</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />1 porc.</span>
                  </div>

                  <div className="text-lg font-bold text-amber-500">{Math.round(r.calorias_totales)} kcal</div>

                  <div className="flex gap-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground font-medium">
                      P {macros ? `${macros.proteinas.toFixed(1)}g` : "—"}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground font-medium">
                      C {macros ? `${macros.carbohidratos.toFixed(1)}g` : "—"}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground font-medium">
                      G {macros ? `${macros.grasas.toFixed(1)}g` : "—"}
                    </span>
                  </div>

                  <div className="text-[10px] text-muted-foreground">
                    Usado {r.usos_totales ?? 0} veces
                  </div>

                  {r.tiene_restricciones && (
                    <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/30">
                      <AlertTriangle className="h-2.5 w-2.5 mr-1" /> Restricciones
                    </Badge>
                  )}
                </div>
              </CardContent>

              {isLoadingDetail && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                </div>
              )}
            </Card>
          );
        })}
        {!loading && recetasFiltradas.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-16">
            <div className="flex flex-col items-center gap-2">
              <UtensilsCrossed className="h-6 w-6 text-muted-foreground" />
              <p>No se encontraron recetas</p>
              <p className="text-xs">Ajusta los filtros o crea una nueva receta</p>
            </div>
          </div>
        )}
      </div>

      {!loading && recetasFiltradas.length > 0 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Pagina {pagina} de {totalPaginas} · {recetasFiltradas.length} recetas
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagina <= 1}
              onClick={() => setPagina((prev) => Math.max(1, prev - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagina >= totalPaginas}
              onClick={() => setPagina((prev) => Math.min(totalPaginas, prev + 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <Dialog open={modalDetalle} onOpenChange={(open) => {
        setModalDetalle(open);
        if (!open) setRecetaDetalle(null);
      }}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
          {recetaDetalle && (
            <RecetaDetailModal
              receta={recetaDetalle}
              tiemposMap={tiemposMap}
              onClose={() => {
                setModalDetalle(false);
                setRecetaDetalle(null);
              }}
              onEdit={() => openEditManual(recetaDetalle)}
              onDeactivate={() => handleDeactivate(recetaDetalle)}
              onGenerateVariant={() => openGenerateModal({ id_tiempo_comida: recetaDetalle.id_tiempo_comida, calorias_totales: recetaDetalle.calorias_totales })}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={modalCrearManual} onOpenChange={setModalCrearManual}>
        <DialogContent className="bg-card border-border max-w-xl">
          <DialogHeader>
            <DialogTitle>{recetaEditando ? "Editar receta" : "Crear receta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input value={manualForm.nombre} onChange={(e) => setManualForm((prev) => ({ ...prev, nombre: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea value={manualForm.descripcion} onChange={(e) => setManualForm((prev) => ({ ...prev, descripcion: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tiempo de comida</label>
                <Select value={manualForm.id_tiempo_comida} onValueChange={(value) => setManualForm((prev) => ({ ...prev, id_tiempo_comida: value }))}>
                  <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  <SelectContent>
                    {tiemposNormalized.map((t) => (
                      <SelectItem key={`manual-tiempo-${t.id}-${t.nombre}`} value={String(t.id)}>{t.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Calorías totales</label>
                <Input type="number" value={manualForm.calorias_totales} onChange={(e) => setManualForm((prev) => ({ ...prev, calorias_totales: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tiempo preparación (min)</label>
                <Input type="number" value={manualForm.tiempo_preparacion_min} onChange={(e) => setManualForm((prev) => ({ ...prev, tiempo_preparacion_min: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Modo de preparación</label>
              <Textarea value={manualForm.modo_preparacion} onChange={(e) => setManualForm((prev) => ({ ...prev, modo_preparacion: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Aptitud Clínica (opcional)</label>
              <p className="text-xs text-muted-foreground">Selecciona para qué pacientes es apta esta receta</p>
              <div className="grid grid-cols-2 gap-2">
                {aptitudesCatalogo.map((apt) => (
                  <label key={apt.id_aptitud} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={manualForm.aptitudes.includes(apt.id_aptitud)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setManualForm((prev) => ({
                          ...prev,
                          aptitudes: checked
                            ? [...prev.aptitudes, apt.id_aptitud]
                            : prev.aptitudes.filter((id) => id !== apt.id_aptitud),
                        }));
                      }}
                    />
                    <span>{apt.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setModalCrearManual(false)}>Cerrar</Button>
            <Button onClick={handleSaveManual}>{recetaEditando ? "Actualizar" : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalGenerarIA} onOpenChange={setModalGenerarIA}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>Generar receta con IA</DialogTitle>
          </DialogHeader>
          {loadingGenerar ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 gap-6">
              <div className="text-6xl animate-bounce">🍽️</div>

              <div className="w-full">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {mensajeProgreso}
                  </span>
                  <span className="text-sm text-gray-500">
                    {Math.round(progreso)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${progreso}%`,
                      backgroundColor: "#F59E0B",
                    }}
                  />
                </div>
              </div>

              <p className="text-xs text-gray-400 text-center">
                Esto puede tomar hasta 20 segundos.
                <br />
                La IA está eligiendo los mejores ingredientes para ti.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {errorGenerar && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {errorGenerar}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tiempo de comida</label>
                  <Select value={generarForm.id_tiempo_comida} onValueChange={(value) => setGenerarForm((prev) => ({ ...prev, id_tiempo_comida: value }))}>
                    <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                    <SelectContent>
                      {tiemposNormalized.map((t) => (
                        <SelectItem key={`ia-tiempo-${t.id}-${t.nombre}`} value={String(t.id)}>{t.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Calorías objetivo</label>
                  <Input
                    type="number"
                    placeholder="Entre 100 y 2500"
                    value={generarForm.calorias_objetivo}
                    onChange={(e) => setGenerarForm((prev) => ({ ...prev, calorias_objetivo: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Restricciones (opcional)</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: sin gluten"
                      value={generarForm.restriccionInput}
                      onChange={(e) => setGenerarForm((prev) => ({ ...prev, restriccionInput: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        e.preventDefault();
                        const value = generarForm.restriccionInput.trim();
                        if (!value) return;
                        if (generarForm.restricciones.includes(value)) return;
                        setGenerarForm((prev) => ({
                          ...prev,
                          restricciones: [...prev.restricciones, value],
                          restriccionInput: "",
                        }));
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const value = generarForm.restriccionInput.trim();
                        if (!value) return;
                        if (generarForm.restricciones.includes(value)) return;
                        setGenerarForm((prev) => ({
                          ...prev,
                          restricciones: [...prev.restricciones, value],
                          restriccionInput: "",
                        }));
                      }}
                    >
                      Agregar
                    </Button>
                  </div>
                  {generarForm.restricciones.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {generarForm.restricciones.map((item) => (
                        <Badge key={`restriccion-${item}`} variant="outline" className="flex items-center gap-1">
                          {item}
                          <button
                            type="button"
                            className="text-muted-foreground"
                            onClick={() => setGenerarForm((prev) => ({
                              ...prev,
                              restricciones: prev.restricciones.filter((r) => r !== item),
                            }))}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Aptitud Clínica (opcional)</label>
                  <p className="text-xs text-muted-foreground">Selecciona para qué pacientes es apta esta receta</p>
                  <div className="grid grid-cols-2 gap-2">
                    {aptitudesCatalogo.map((apt) => (
                      <label key={apt.id_aptitud} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={generarForm.aptitudes.includes(apt.id_aptitud)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setGenerarForm((prev) => ({
                              ...prev,
                              aptitudes: checked
                                ? [...prev.aptitudes, apt.id_aptitud]
                                : prev.aptitudes.filter((id) => id !== apt.id_aptitud),
                            }));
                          }}
                        />
                        <span>{apt.nombre}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setModalGenerarIA(false)}>Cerrar</Button>
                <Button onClick={handleGenerateIA} disabled={loadingGenerar}>
                  {loadingGenerar && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {loadingGenerar ? "Generando con IA..." : "Generar con IA"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecetaDetailModal({
  receta,
  tiemposMap,
  onClose,
  onEdit,
  onDeactivate,
  onGenerateVariant,
}: {
  receta: RecetaDetalle;
  tiemposMap: Record<number, string>;
  onClose: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onGenerateVariant: () => void;
}) {
  const timeName = receta.id_tiempo_comida ? tiemposMap[receta.id_tiempo_comida] : "General";
  const normalized = normalizeTimeName(timeName);
  const timeConfig = timeIconMap[normalized] || timeIconMap.snack;
  const Icon = timeConfig.icon;
  const macros = receta.ingredientes.length > 0 ? calcularMacros(receta.ingredientes) : null;
  const macroData = buildMacroData({
    proteinas: macros?.proteinas ?? 0,
    carbohidratos: macros?.carbohidratos ?? 0,
    grasas: macros?.grasas ?? 0,
  });
  const pasos = parsearPreparacion(receta.modo_preparacion || "");
  const calorias = Number(receta.calorias_totales);
  const caloriasDisplay = Number.isFinite(calorias) ? Math.round(calorias) : null;
  const createdAt = receta.created_at ? new Date(receta.created_at) : null;
  const createdAtDisplay = createdAt && !Number.isNaN(createdAt.getTime())
    ? createdAt.toLocaleDateString("es-EC", { day: "2-digit", month: "long", year: "numeric" })
    : "—";
  const aptitudesAplican = new Set((receta.aptitudes ?? []).map((a) => a.codigo));

  return (
    <div>
      <DialogHeader>
        <DialogTitle className="text-xl">{receta.nombre}</DialogTitle>
      </DialogHeader>

      <div className="space-y-5">
        {receta.imagen_url ? (
          <img src={receta.imagen_url} alt={receta.nombre} className="h-40 w-full object-cover rounded-lg" />
        ) : (
          <div className={`h-40 rounded-lg flex items-center justify-center ${timeConfig.bg}`}>
            <Icon className={`h-14 w-14 ${timeConfig.color}`} />
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline">{timeName || "General"}</Badge>
          <span className="text-sm text-muted-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5" />1 porción</span>
          <span className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{receta.tiempo_preparacion_min ?? "—"} min</span>
          {receta.generado_por_ia && (
            <Badge className="bg-amber-400/90 text-amber-950 border border-amber-300">IA</Badge>
          )}
          <span className="text-xs text-muted-foreground">
            Generada el {createdAtDisplay}
          </span>
        </div>

        <Card className="border-border bg-muted/20">
          <CardContent className="p-4 space-y-4">
            <h4 className="font-semibold text-sm text-foreground">Información Nutricional</h4>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Información Completa</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Calorías</span><span className="font-bold text-amber-500">{caloriasDisplay ?? "—"} kcal</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Proteínas</span><span className="text-foreground">{macros ? `${macros.proteinas}g` : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Carbohidratos</span><span className="text-foreground">{macros ? `${macros.carbohidratos}g` : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Grasas</span><span className="text-foreground">{macros ? `${macros.grasas}g` : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fibra</span><span className="text-foreground">{macros ? `${macros.fibra}g` : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Sodio</span><span className="text-foreground">{macros ? `${macros.sodio}mg` : "—"}</span></div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6">
              <ChartContainer config={chartConfig} className="aspect-square h-[120px]">
                <PieChart>
                  <Pie data={macroData} dataKey="value" nameKey="name" innerRadius={35} outerRadius={55} strokeWidth={2} stroke="hsl(var(--card))">
                    {macroData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
              <div className="space-y-1.5">
                {macroData.map((m) => (
                  <div key={m.name} className="flex items-center gap-2 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.fill }} />
                    <span className="text-muted-foreground">{m.name}</span>
                    <span className="font-semibold text-foreground">{macros ? `${m.value}%` : "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <h4 className="font-semibold text-sm text-foreground mb-2">Ingredientes</h4>
          <div className="space-y-1.5">
            {receta.ingredientes.map((ing, idx) => (
              <div key={`${ing.id_alimento_detalle ?? ing.id_alimento ?? "ing"}-${idx}`} className="flex justify-between text-sm py-1 border-b border-border/30">
                <span className="text-foreground">{ing.nombre}</span>
                <span className="text-muted-foreground">{formatCantidad(ing.cantidad_g)} · {Math.round(ing.calorias_aportadas)} kcal</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-sm text-foreground mb-2">Preparación</h4>
          <ol className="space-y-2">
            {pasos.map((paso, i) => (
              <li key={`${i}-${paso}`} className="flex gap-3 items-start text-sm">
                <span className="shrink-0 h-5 w-5 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center font-semibold">{i + 1}</span>
                <span className="text-muted-foreground">{paso.replace(/^\d+\.\s*/, "")}</span>
              </li>
            ))}
          </ol>
        </div>

        {!receta.generado_por_ia && (
          <Card className="border-border bg-muted/20">
            <CardContent className="p-4 space-y-3">
              <h4 className="font-semibold text-sm text-foreground">Aptitud Clínica</h4>
              {receta.aptitudes && receta.aptitudes.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {APTITUDES_CATALOGO.map((apt) => {
                    const isActive = aptitudesAplican.has(apt.codigo);
                    return (
                      <div key={apt.codigo} className="flex items-center gap-2 text-sm">
                        {isActive ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-red-400" />
                        )}
                        <span className="text-foreground">{apt.nombre}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin aptitudes clínicas definidas.</p>
              )}
              {receta.descripcion && (
                <div className="mt-2 p-2.5 rounded-md bg-amber-50 border border-amber-200">
                  <p className="text-xs text-amber-900"><span className="font-semibold">Nota clínica:</span> {receta.descripcion}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {receta.generado_por_ia && receta.descripcion && (
          <Card className="border-border bg-muted/20">
            <CardContent className="p-4">
              <div className="p-2.5 rounded-md bg-amber-50 border border-amber-200">
                <p className="text-xs text-amber-900"><span className="font-semibold">Nota clínica:</span> {receta.descripcion}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2 flex-wrap">         
          <Button variant="outline" className="text-destructive" onClick={onDeactivate}><Trash2 className="h-4 w-4 mr-2" /> Eliminar receta</Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </div>
    </div>
  );
}
