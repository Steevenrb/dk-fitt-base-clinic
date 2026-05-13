import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";
import { Search, Plus, X, Save, RotateCcw, Eye, UtensilsCrossed } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { apiRequest, ApiError } from "@/lib/api";
import {
  Alimento, Ingrediente, Receta, unidades, aptitudLabels,
  calcTotales, calcMacroData, calcIngredienteCal, chartConfig, recetaCatColors,
} from "./alimentosData";

interface TabConstructorProps {
  onSaveRecipe: (r: Receta) => void;
  editingRecipe?: Receta | null;
  onClearEdit?: () => void;
  onSavedBackend?: () => void;
}

type CategoriaDetalle = "proteinas" | "carbohidratos" | "grasas" | "lacteos" | "frutas" | "vegetales" | "otros";

type AlimentoDetalle = {
  id_alimento_detalle: number;
  id_alimento?: number | null;
  nombre: string;
  categoria: CategoriaDetalle;
  calorias: number;
  proteinas: number;
  grasas: number;
  carbohidratos: number;
  fibra: number;
  azucares?: number;
  sodio?: number;
};

type TiempoComida = {
  id?: number;
  id_tiempo_comida?: number;
  nombre?: string;
  tiempo_comida_nombre?: string;
};

type ApiListResponse<T> = {
  success?: boolean;
  data?: T[];
  items?: T[];
  results?: T[];
};

const DETALLE_ENDPOINTS = ["/api/alimentos-detalle", "/alimentos-detalle"];
const TIEMPOS_ENDPOINTS = ["/tiempos-comida"];
const APTITUDES_ENDPOINTS = ["/aptitudes-clinicas"];
const PAGE_SIZE = 50;

const extractList = <T,>(payload: ApiListResponse<T> | T[]): T[] => {
  if (Array.isArray(payload)) return payload;
  return payload.data || payload.items || payload.results || [];
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    const payload = error.payload as { message?: string; error?: { message?: string } } | null;
    return payload?.error?.message || payload?.message || error.message || fallback;
  }
  if (error instanceof Error) return error.message || fallback;
  return fallback;
};

type PagedResult<T> = {
  rows: T[];
  page: number;
  totalPages: number;
};

const getDetallePage = async (token: string, page: number, limit: number): Promise<PagedResult<AlimentoDetalle>> => {
  const res = await requestFirstOk<ApiListResponse<AlimentoDetalle> | AlimentoDetalle[]>(
    DETALLE_ENDPOINTS.map((base) => `${base}?page=${page}&limit=${limit}`),
    { method: "GET", accessToken: token },
  );

  const rows = extractList(res);
  if (Array.isArray(res)) {
    const totalPages = Math.max(1, Math.ceil(rows.length / limit));
    const start = (page - 1) * limit;
    return { rows: rows.slice(start, start + limit), page, totalPages };
  }

  const totalPages = typeof res.meta?.total_pages === "number" ? res.meta.total_pages : 1;
  return { rows, page, totalPages };
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

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

const categoryToLegacy = (cat: CategoriaDetalle): Alimento["categoria"] => {
  if (cat === "proteinas") return "Proteína";
  if (cat === "carbohidratos") return "Cereal";
  if (cat === "grasas") return "Grasa";
  if (cat === "lacteos") return "Lácteo";
  if (cat === "frutas") return "Fruta";
  if (cat === "vegetales") return "Vegetal";
  return "Otro";
};

const toAlimento = (item: AlimentoDetalle): Alimento => ({
  id: String(item.id_alimento_detalle),
  idAlimento: item.id_alimento ?? null,
  nombre: item.nombre,
  calorias: item.calorias ?? 0,
  proteinas: item.proteinas ?? 0,
  carbohidratos: item.carbohidratos ?? 0,
  grasas: item.grasas ?? 0,
  grasasSaturadas: 0,
  azucares: item.azucares ?? 0,
  fibra: item.fibra ?? 0,
  sodio: item.sodio ?? 0,
  categoria: categoryToLegacy(item.categoria),
});

const defaultAptitud = (): Record<string, boolean> => ({
  general: true, diabeticos: true, hipertensos: true, celiacos: true,
  lactosa: true, vegetarianos: false, veganos: false, renal: true,
});

const aptitudCodigoByUiKey: Record<string, string> = {
  general: "general",
  diabeticos: "diabetes",
  hipertensos: "hipertension",
  celiacos: "celiaco",
  lactosa: "lactosa",
  vegetarianos: "vegetariano",
  veganos: "vegano",
  renal: "renal",
};

export function TabConstructor({ onSaveRecipe, editingRecipe, onClearEdit, onSavedBackend }: TabConstructorProps) {
  const [nombre, setNombre] = useState(editingRecipe?.nombre || "");
  const [tiempoComidaId, setTiempoComidaId] = useState(
    editingRecipe?.id_tiempo_comida ? String(editingRecipe.id_tiempo_comida) : "",
  );
  const [tiempoPrep, setTiempoPrep] = useState(editingRecipe?.tiempoPrep || 20);
  const [pasos, setPasos] = useState<string[]>(editingRecipe?.pasos?.length ? editingRecipe.pasos : [""]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>(editingRecipe?.ingredientes || []);
  const [aptitud, setAptitud] = useState<Record<string, boolean>>(editingRecipe?.aptitud || defaultAptitud());
  const [notaClinica, setNotaClinica] = useState(editingRecipe?.notaClinica || "");
  const [busquedaIng, setBusquedaIng] = useState("");
  const [showIngSearch, setShowIngSearch] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [alimentosCatalog, setAlimentosCatalog] = useState<Alimento[]>([]);
  const [tiemposComida, setTiemposComida] = useState<TiempoComida[]>([]);
  const [aptitudesCatalogo, setAptitudesCatalogo] = useState<Array<{ id_aptitud: number; codigo?: string; nombre: string }>>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Use editingRecipe when it changes
  useMemo(() => {
    if (editingRecipe) {
      setNombre(editingRecipe.nombre);
      setTiempoComidaId(editingRecipe.id_tiempo_comida ? String(editingRecipe.id_tiempo_comida) : "");
      setTiempoPrep(editingRecipe.tiempoPrep);
      setPasos(editingRecipe.pasos?.length ? editingRecipe.pasos : [""]);
      setIngredientes([...editingRecipe.ingredientes]);
      setAptitud({ ...editingRecipe.aptitud });
      setNotaClinica(editingRecipe.notaClinica);
    }
  }, [editingRecipe?.id]);

  useEffect(() => {
    const token = localStorage.getItem("dkfitt-access-token");
    if (!token) return;
    let isMounted = true;
    const loadCatalog = async () => {
      setLoadingCatalog(true);
      setCatalogError(null);
      try {
        const alimentosRows: AlimentoDetalle[] = [];
        let page = 1;
        let totalPages = 1;
        while (page <= totalPages) {
          const pageRes = await getDetallePage(token, page, PAGE_SIZE);
          alimentosRows.push(...pageRes.rows);
          totalPages = pageRes.totalPages || 1;
          if (pageRes.rows.length === 0) break;
          page += 1;
        }

        const tiemposRes = await requestFirstOk<ApiListResponse<TiempoComida> | TiempoComida[]>(
          TIEMPOS_ENDPOINTS,
          { method: "GET", accessToken: token },
        );
        const aptitudesRes = await requestFirstOk<ApiListResponse<{ id_aptitud: number; codigo?: string; nombre: string }> | { id_aptitud: number; codigo?: string; nombre: string }[]>(
          APTITUDES_ENDPOINTS,
          { method: "GET", accessToken: token },
        );
        if (!isMounted) return;
        const alimentosApi = alimentosRows.map(toAlimento);
        setAlimentosCatalog(alimentosApi);
        setTiemposComida(extractList(tiemposRes));
        setAptitudesCatalogo(extractList(aptitudesRes));
      } catch (error) {
        const message = getApiErrorMessage(error, "No se pudo cargar el catalogo de alimentos.");
        setCatalogError(message);
        toast.error("No se pudo cargar el catalogo de alimentos");
      } finally {
        if (isMounted) setLoadingCatalog(false);
      }
    };
    void loadCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  const allAlimentos = alimentosCatalog;

  const tiempoSeleccionado = useMemo(() => {
    const id = Number(tiempoComidaId);
    if (!Number.isFinite(id)) return null;
    return tiemposComida.find((t) => (t.id ?? t.id_tiempo_comida) === id) || null;
  }, [tiempoComidaId, tiemposComida]);

  const tiempoComidaNombre = (tiempoSeleccionado?.nombre || tiempoSeleccionado?.tiempo_comida_nombre || "").trim();
  const resultadosIng = busquedaIng.length >= 2
    ? allAlimentos.filter(a => normalizeText(a.nombre).includes(normalizeText(busquedaIng)))
    : [];

  const totales = useMemo(() => calcTotales(ingredientes), [ingredientes]);
  const macroData = useMemo(() => calcMacroData(totales), [totales]);

  const addIngrediente = (a: Alimento) => {
    setIngredientes(prev => [...prev, { alimento: a, cantidad: 100, unidad: "gramos", factorGramos: 1 }]);
    setBusquedaIng("");
    setShowIngSearch(false);
  };

  const updateIngrediente = (idx: number, field: string, value: any) => {
    setIngredientes(prev => {
      const copy = [...prev];
      if (field === "cantidad") copy[idx] = { ...copy[idx], cantidad: Number(value) };
      if (field === "unidad") {
        const u = unidades.find(u => u.value === value)!;
        copy[idx] = { ...copy[idx], unidad: value, factorGramos: u.factor };
      }
      return copy;
    });
  };

  const removeIngrediente = (idx: number) => setIngredientes(prev => prev.filter((_, i) => i !== idx));

  const limpiar = () => {
    setNombre("");
    setTiempoComidaId("");
    setTiempoPrep(20);
    setPasos([""]);
    setIngredientes([]);
    setAptitud(defaultAptitud());
    setNotaClinica("");
    onClearEdit?.();
  };

  const guardar = async () => {
    if (!nombre.trim()) { toast.error("Ingresa un nombre para la receta"); return; }
    if (!tiempoComidaId) { toast.error("Selecciona un tiempo de comida"); return; }
    if (ingredientes.length === 0) { toast.error("Agrega al menos un ingrediente"); return; }
    const pasosList = pasos.map((p) => p.trim()).filter(Boolean);
    const token = localStorage.getItem("dkfitt-access-token");
    if (!token) { toast.error("Sesion no valida"); return; }

    const ingredientesPayload = ingredientes
      .map((ing) => ({
        id_alimento_detalle: Number(ing.alimento.id),
        cantidad_g: Math.round(ing.cantidad * ing.factorGramos),
      }))
      .filter((ing) => Number.isFinite(ing.id_alimento_detalle) && ing.id_alimento_detalle > 0 && ing.cantidad_g > 0);

    if (ingredientesPayload.length === 0) {
      toast.error("No hay ingredientes validos");
      return;
    }

    const aptitudesSeleccionadas = Object.entries(aptitud)
      .filter(([, enabled]) => enabled)
      .map(([key]) => aptitudCodigoByUiKey[key] || key);
    const aptitudesPayload = aptitudesCatalogo
      .filter((apt) => aptitudesSeleccionadas.includes(apt.codigo || ""))
      .map((apt) => apt.id_aptitud);

    const payload = {
      nombre: nombre.trim(),
      descripcion: notaClinica.trim() || "",
      modo_preparacion: pasosList.join("\n"),
      tiempo_preparacion_min: tiempoPrep,
      id_tiempo_comida: Number(tiempoComidaId),
      aptitudes: aptitudesPayload,
      ingredientes: ingredientesPayload,
    };

    const recetaLocal: Receta = {
      id: editingRecipe?.id || `r${Date.now()}`,
      nombre,
      categoria: (tiempoComidaNombre || "Desayuno") as Receta["categoria"],
      porciones: 1,
      tiempoPrep,
      ingredientes,
      pasos: pasosList,
      aptitud,
      notaClinica,
      id_tiempo_comida: tiempoComidaId ? Number(tiempoComidaId) : undefined,
    };

    try {
      await apiRequest("/dishes", { method: "POST", accessToken: token, body: payload });

      onSaveRecipe(recetaLocal);
      toast.success(editingRecipe ? "Receta actualizada" : `Receta "${nombre}" guardada`);
      onSavedBackend?.();
      if (!editingRecipe) limpiar();
    } catch (error) {
      const message = getApiErrorMessage(error, "No se pudo guardar la receta");
      toast.error(message);
    }
  };


  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      {/* ─── LEFT: FORM ─── */}
      <div className="xl:col-span-3 space-y-4">
        {editingRecipe && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/10 border border-primary/20 text-sm text-primary">
            Editando: <span className="font-semibold">{editingRecipe.nombre}</span>
            <Button size="sm" variant="ghost" className="ml-auto h-6 text-xs" onClick={limpiar}>Cancelar edición</Button>
          </div>
        )}

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Nombre de la receta</label>
                <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Bowl de proteínas" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tiempo de Comida</label>
                <Select value={tiempoComidaId} onValueChange={setTiempoComidaId}>
                  <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  <SelectContent>
                    {tiemposComida.map((t) => {
                      const id = t.id ?? t.id_tiempo_comida;
                      const label = t.nombre || t.tiempo_comida_nombre || "";
                      if (!id || !label) return null;
                      return (
                        <SelectItem key={`tiempo-${id}`} value={String(id)}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tiempo de preparación (min)</label>
                <Input type="number" min={1} value={tiempoPrep} onChange={e => setTiempoPrep(Math.max(1, Number(e.target.value)))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ingredients */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ingredientes</CardTitle>
            <CardDescription>{ingredientes.length} ingredientes añadidos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ingredientes.map((ing, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-muted/30 border border-border rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-foreground min-w-[120px] truncate flex-1">{ing.alimento.nombre}</span>
                <Input type="number" className="w-20 h-8 text-sm" value={ing.cantidad} onChange={e => updateIngrediente(idx, "cantidad", e.target.value)} min={0} />
                <Select value={ing.unidad} onValueChange={v => updateIngrediente(idx, "unidad", v)}>
                  <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{unidades.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-xs text-primary font-semibold w-16 text-right">{calcIngredienteCal(ing)} kcal</span>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeIngrediente(idx)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar ingrediente para agregar..."
                    className="pl-9 h-9 text-sm"
                    value={busquedaIng}
                    onChange={e => { setBusquedaIng(e.target.value); setShowIngSearch(true); }}
                    onFocus={() => setShowIngSearch(true)}
                    disabled={loadingCatalog || allAlimentos.length === 0}
                  />
                </div>
              </div>
              {showIngSearch && resultadosIng.length > 0 && (
                <div className="absolute z-10 w-full mt-1 border border-border rounded-md bg-popover shadow-lg max-h-48 overflow-y-auto">
                  {resultadosIng.map(a => (
                    <button key={a.id} className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm flex justify-between" onClick={() => addIngrediente(a)}>
                      <span className="text-foreground">{a.nombre}</span>
                      <span className="text-muted-foreground text-xs">{a.calorias} kcal/100g</span>
                    </button>
                  ))}
                </div>
              )}
              {showIngSearch && !loadingCatalog && resultadosIng.length === 0 && busquedaIng.length >= 2 && (
                <div className="absolute z-10 w-full mt-1 border border-border rounded-md bg-popover shadow-lg p-3 text-xs text-muted-foreground">
                  No se encontraron alimentos en el catalogo.
                </div>
              )}
              {loadingCatalog && (
                <div className="mt-2 text-xs text-muted-foreground">Cargando alimentos del catalogo...</div>
              )}
              {catalogError && (
                <div className="mt-2 text-xs text-red-600">{catalogError}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Preparación</CardTitle>
            <CardDescription>Agrega los pasos de preparación en orden</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {pasos.map((paso, idx) => (
                <div key={`paso-${idx}`} className="flex items-start gap-2">
                  <div className="pt-2 text-xs text-muted-foreground w-5">{idx + 1}.</div>
                  <Input
                    value={paso}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPasos((prev) => prev.map((p, i) => (i === idx ? value : p)));
                    }}
                    placeholder="Ej: Lavar arroz"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-muted-foreground"
                    onClick={() => setPasos((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPasos((prev) => [...prev, ""])}
            >
              <Plus className="h-4 w-4 mr-2" /> Agregar nuevo paso
            </Button>
          </CardContent>
        </Card>

        {/* Clinical aptitude */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Aptitud Clínica</CardTitle>
            <CardDescription>Indica para qué tipo de pacientes es apta esta receta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(aptitudLabels).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    checked={aptitud[key] || false}
                    onCheckedChange={checked => setAptitud(prev => ({ ...prev, [key]: !!checked }))}
                  />
                  <label className="text-xs text-foreground cursor-pointer">{label}</label>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nota clínica adicional</label>
              <Textarea rows={2} value={notaClinica} onChange={e => setNotaClinica(e.target.value)} placeholder="Observaciones clínicas relevantes..." />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2">
          <Button className="flex-1" onClick={guardar}><Save className="h-4 w-4 mr-2" /> {editingRecipe ? "Actualizar receta" : "Guardar receta"}</Button>
          <Button variant="outline" onClick={() => setPreviewOpen(true)}><Eye className="h-4 w-4 mr-2" /> Vista previa</Button>
          <Button variant="outline" onClick={limpiar}><RotateCcw className="h-4 w-4 mr-2" /> Limpiar</Button>
        </div>
      </div>

      {/* ─── RIGHT: REAL-TIME SUMMARY ─── */}
      <div className="xl:col-span-2 space-y-4">
        <Card className="border-border bg-card sticky top-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resumen en Tiempo Real</CardTitle>
            <CardDescription>
              {nombre || "Sin nombre"}{tiempoComidaNombre ? ` · ${tiempoComidaNombre}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Big calorie number */}
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">{Math.round(totales.calorias)}</div>
              <div className="text-xs text-muted-foreground">kcal totales</div>
            </div>

            {/* Macro chart */}
            {ingredientes.length > 0 && (
              <>
                <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[160px]">
                  <PieChart>
                    <Pie data={macroData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={65} strokeWidth={2} stroke="hsl(var(--card))">
                      {macroData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
                <div className="flex justify-center gap-4 text-xs">
                  {macroData.map(m => (
                    <div key={m.name} className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.fill }} />
                      <span className="text-muted-foreground">{m.name}</span>
                      <span className="font-semibold text-foreground">{m.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Totals table */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Total receta</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {[
                    ["Calorías", `${Math.round(totales.calorias)} kcal`],
                    ["Proteínas", `${totales.proteinas.toFixed(1)}g`],
                    ["Carbohidratos", `${totales.carbohidratos.toFixed(1)}g`],
                    ["Grasas", `${totales.grasas.toFixed(1)}g`],
                    ["Fibra", `${totales.fibra.toFixed(1)}g`],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-foreground">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Ingredient list */}
            {ingredientes.length > 0 && (
              <div className="border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Ingredientes ({ingredientes.length})</p>
                <div className="space-y-1">
                  {ingredientes.map((ing, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-foreground">{ing.alimento.nombre}</span>
                      <span className="text-muted-foreground">{ing.cantidad} {ing.unidad} · {calcIngredienteCal(ing)} kcal</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── PREVIEW MODAL ─── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle>Vista Previa de Tarjeta</DialogTitle></DialogHeader>
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <div className="h-28 bg-muted/50 flex items-center justify-center rounded-t-lg">
                <UtensilsCrossed className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm text-foreground">{nombre || "Sin nombre"}</h3>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${recetaCatColors[tiempoComidaNombre] || ""}`}>
                    {tiempoComidaNombre || "Sin tiempo"}
                  </Badge>
                </div>
                <div className="text-lg font-bold text-primary">{Math.round(totales.calorias)} kcal</div>
                <div className="flex gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">P {totales.proteinas.toFixed(0)}g</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">C {totales.carbohidratos.toFixed(0)}g</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">G {totales.grasas.toFixed(0)}g</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </div>
  );
}
