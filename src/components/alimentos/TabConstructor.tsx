import { useState, useMemo } from "react";
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
import {
  Alimento, Ingrediente, Receta, alimentosDB, unidades, aptitudLabels,
  calcTotales, calcMacroData, calcIngredienteCal, chartConfig, recetaCatColors,
} from "./alimentosData";

interface TabConstructorProps {
  base: Alimento[];
  onSaveRecipe: (r: Receta) => void;
  editingRecipe?: Receta | null;
  onClearEdit?: () => void;
}

const categoriasReceta = ["Desayuno", "Almuerzo", "Cena", "Snack", "Bebida"];

const defaultAptitud = (): Record<string, boolean> => ({
  general: true, diabeticos: true, hipertensos: true, celiacos: true,
  lactosa: true, vegetarianos: false, veganos: false, renal: true,
});

export function TabConstructor({ base, onSaveRecipe, editingRecipe, onClearEdit }: TabConstructorProps) {
  const [nombre, setNombre] = useState(editingRecipe?.nombre || "");
  const [categoria, setCategoria] = useState<string>(editingRecipe?.categoria || "Almuerzo");
  const [porciones, setPorciones] = useState(editingRecipe?.porciones || 2);
  const [tiempoPrep, setTiempoPrep] = useState(editingRecipe?.tiempoPrep || 20);
  const [pasos, setPasos] = useState(editingRecipe?.pasos.join("\n") || "");
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>(editingRecipe?.ingredientes || []);
  const [aptitud, setAptitud] = useState<Record<string, boolean>>(editingRecipe?.aptitud || defaultAptitud());
  const [notaClinica, setNotaClinica] = useState(editingRecipe?.notaClinica || "");
  const [busquedaIng, setBusquedaIng] = useState("");
  const [showIngSearch, setShowIngSearch] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Use editingRecipe when it changes
  useMemo(() => {
    if (editingRecipe) {
      setNombre(editingRecipe.nombre);
      setCategoria(editingRecipe.categoria);
      setPorciones(editingRecipe.porciones);
      setTiempoPrep(editingRecipe.tiempoPrep);
      setPasos(editingRecipe.pasos.join("\n"));
      setIngredientes([...editingRecipe.ingredientes]);
      setAptitud({ ...editingRecipe.aptitud });
      setNotaClinica(editingRecipe.notaClinica);
    }
  }, [editingRecipe?.id]);

  const allAlimentos = [...new Map([...base, ...alimentosDB].map(a => [a.id, a])).values()];
  const resultadosIng = busquedaIng.length >= 2
    ? allAlimentos.filter(a => a.nombre.toLowerCase().includes(busquedaIng.toLowerCase()))
    : [];

  const totales = useMemo(() => calcTotales(ingredientes), [ingredientes]);
  const porPorcion = useMemo(() => ({
    calorias: totales.calorias / porciones,
    proteinas: totales.proteinas / porciones,
    carbohidratos: totales.carbohidratos / porciones,
    grasas: totales.grasas / porciones,
    fibra: totales.fibra / porciones,
  }), [totales, porciones]);
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
    setNombre(""); setCategoria("Almuerzo"); setPorciones(2); setTiempoPrep(20);
    setPasos(""); setIngredientes([]); setAptitud(defaultAptitud()); setNotaClinica("");
    onClearEdit?.();
  };

  const guardar = () => {
    if (!nombre.trim()) { toast.error("Ingresa un nombre para la receta"); return; }
    if (ingredientes.length === 0) { toast.error("Agrega al menos un ingrediente"); return; }
    const receta: Receta = {
      id: editingRecipe?.id || `r${Date.now()}`,
      nombre,
      categoria: categoria as Receta["categoria"],
      porciones,
      tiempoPrep,
      ingredientes,
      pasos: pasos.split("\n").filter(p => p.trim()),
      aptitud,
      notaClinica,
    };
    onSaveRecipe(receta);
    toast.success(editingRecipe ? "Receta actualizada" : `Receta "${nombre}" guardada`);
    if (!editingRecipe) limpiar();
  };

  const goalMet = porPorcion.calorias >= 300 && porPorcion.calorias <= 700;

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
                <label className="text-xs text-muted-foreground">Categoría</label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categoriasReceta.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Porciones</label>
                <Input type="number" min={1} value={porciones} onChange={e => setPorciones(Math.max(1, Number(e.target.value)))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tiempo de preparación (min)</label>
                <Input type="number" min={1} value={tiempoPrep} onChange={e => setTiempoPrep(Math.max(1, Number(e.target.value)))} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Instrucciones de preparación (un paso por línea)</label>
              <Textarea rows={4} value={pasos} onChange={e => setPasos(e.target.value)} placeholder="1. Cocinar el pollo...&#10;2. Preparar el arroz..." />
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
            </div>
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
            <CardDescription>{nombre || "Sin nombre"} · {porciones} porción(es)</CardDescription>
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
              <div className="border-t border-border pt-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">Por porción ({porciones})</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {[
                    ["Calorías", `${Math.round(porPorcion.calorias)} kcal`],
                    ["Proteínas", `${porPorcion.proteinas.toFixed(1)}g`],
                    ["Carbohidratos", `${porPorcion.carbohidratos.toFixed(1)}g`],
                    ["Grasas", `${porPorcion.grasas.toFixed(1)}g`],
                    ["Fibra", `${porPorcion.fibra.toFixed(1)}g`],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-foreground">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Goal indicator */}
            {ingredientes.length > 0 && (
              <div className={`p-2.5 rounded-md text-xs flex items-center gap-2 ${goalMet ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-accent/10 border border-accent/20 text-accent"}`}>
                {goalMet ? "✓ Dentro del rango calórico estándar por porción (300-700 kcal)" : "⚠ Fuera del rango calórico estándar por porción (300-700 kcal)"}
              </div>
            )}

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
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${recetaCatColors[categoria] || ""}`}>{categoria}</Badge>
                </div>
                <div className="text-lg font-bold text-primary">{Math.round(totales.calorias)} kcal</div>
                <div className="text-[11px] text-muted-foreground">Por porción: {Math.round(porPorcion.calorias)} kcal</div>
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
