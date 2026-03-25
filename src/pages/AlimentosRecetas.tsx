import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Search, Plus, X, Trash2, Edit, UtensilsCrossed, Save, RotateCcw, BookOpen, Apple } from "lucide-react";
import { toast } from "sonner";

/* ─── types ─── */
interface Alimento {
  id: string;
  nombre: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  grasasSaturadas: number;
  azucares: number;
  fibra: number;
  categoria: "Fruta" | "Proteína" | "Cereal" | "Lácteo" | "Vegetal" | "Otro";
}

interface Ingrediente {
  alimento: Alimento;
  cantidad: number;
  unidad: string;
  factorGramos: number;
}

/* ─── data ─── */
const alimentosDB: Alimento[] = [
  { id: "1", nombre: "Pechuga de pollo", calorias: 165, proteinas: 31, carbohidratos: 0, grasas: 3.6, grasasSaturadas: 1, azucares: 0, fibra: 0, categoria: "Proteína" },
  { id: "2", nombre: "Arroz integral", calorias: 123, proteinas: 2.7, carbohidratos: 25.6, grasas: 1, grasasSaturadas: 0.2, azucares: 0.4, fibra: 1.8, categoria: "Cereal" },
  { id: "3", nombre: "Aguacate", calorias: 160, proteinas: 2, carbohidratos: 8.5, grasas: 14.7, grasasSaturadas: 2.1, azucares: 0.7, fibra: 6.7, categoria: "Fruta" },
  { id: "4", nombre: "Espinaca fresca", calorias: 23, proteinas: 2.9, carbohidratos: 3.6, grasas: 0.4, grasasSaturadas: 0.1, azucares: 0.4, fibra: 2.2, categoria: "Vegetal" },
  { id: "5", nombre: "Aceite de oliva", calorias: 884, proteinas: 0, carbohidratos: 0, grasas: 100, grasasSaturadas: 14, azucares: 0, fibra: 0, categoria: "Otro" },
  { id: "6", nombre: "Huevo entero", calorias: 155, proteinas: 13, carbohidratos: 1.1, grasas: 11, grasasSaturadas: 3.3, azucares: 1.1, fibra: 0, categoria: "Proteína" },
  { id: "7", nombre: "Avena en hojuelas", calorias: 389, proteinas: 16.9, carbohidratos: 66.3, grasas: 6.9, grasasSaturadas: 1.2, azucares: 0, fibra: 10.6, categoria: "Cereal" },
  { id: "8", nombre: "Plátano", calorias: 89, proteinas: 1.1, carbohidratos: 22.8, grasas: 0.3, grasasSaturadas: 0.1, azucares: 12.2, fibra: 2.6, categoria: "Fruta" },
  { id: "9", nombre: "Yogur griego natural", calorias: 97, proteinas: 9, carbohidratos: 3.6, grasas: 5, grasasSaturadas: 3.2, azucares: 3.2, fibra: 0, categoria: "Lácteo" },
  { id: "10", nombre: "Salmón", calorias: 208, proteinas: 20, carbohidratos: 0, grasas: 13, grasasSaturadas: 3.1, azucares: 0, fibra: 0, categoria: "Proteína" },
  { id: "11", nombre: "Brócoli", calorias: 34, proteinas: 2.8, carbohidratos: 7, grasas: 0.4, grasasSaturadas: 0, azucares: 1.7, fibra: 2.6, categoria: "Vegetal" },
  { id: "12", nombre: "Quinoa", calorias: 120, proteinas: 4.4, carbohidratos: 21.3, grasas: 1.9, grasasSaturadas: 0.2, azucares: 0.9, fibra: 2.8, categoria: "Cereal" },
  { id: "13", nombre: "Almendras", calorias: 579, proteinas: 21.2, carbohidratos: 21.6, grasas: 49.9, grasasSaturadas: 3.7, azucares: 4.4, fibra: 12.5, categoria: "Otro" },
  { id: "14", nombre: "Leche descremada", calorias: 34, proteinas: 3.4, carbohidratos: 5, grasas: 0.1, grasasSaturadas: 0.1, azucares: 5, fibra: 0, categoria: "Lácteo" },
  { id: "15", nombre: "Tomate", calorias: 18, proteinas: 0.9, carbohidratos: 3.9, grasas: 0.2, grasasSaturadas: 0, azucares: 2.6, fibra: 1.2, categoria: "Vegetal" },
];

const unidades = [
  { value: "gramos", label: "gramos", factor: 1 },
  { value: "unidades", label: "unidades", factor: 100 },
  { value: "tazas", label: "tazas", factor: 240 },
  { value: "cucharadas", label: "cucharadas", factor: 15 },
];

const catColors: Record<string, string> = {
  Fruta: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Proteína: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  Cereal: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Lácteo: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  Vegetal: "bg-lime-500/15 text-lime-400 border-lime-500/30",
  Otro: "bg-violet-500/15 text-violet-400 border-violet-500/30",
};

const chartConfig = {
  proteinas: { label: "Proteínas", color: "hsl(var(--primary))" },
  carbohidratos: { label: "Carbohidratos", color: "hsl(38, 98%, 40%)" },
  grasas: { label: "Grasas", color: "hsl(0, 84%, 60%)" },
};

/* ─── page ─── */
const AlimentosRecetas = () => {
  /* search */
  const [busqueda, setBusqueda] = useState("");
  const [alimentoSeleccionado, setAlimentoSeleccionado] = useState<Alimento | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  /* internal db */
  const [base, setBase] = useState<Alimento[]>(alimentosDB.slice(0, 8));

  /* recipe builder */
  const [nombreReceta, setNombreReceta] = useState("Bowl de proteínas");
  const [porciones, setPorciones] = useState(2);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([
    { alimento: alimentosDB[0], cantidad: 150, unidad: "gramos", factorGramos: 1 },
    { alimento: alimentosDB[1], cantidad: 1, unidad: "tazas", factorGramos: 240 },
    { alimento: alimentosDB[2], cantidad: 0.5, unidad: "unidades", factorGramos: 100 },
    { alimento: alimentosDB[3], cantidad: 60, unidad: "gramos", factorGramos: 1 },
    { alimento: alimentosDB[4], cantidad: 1, unidad: "cucharadas", factorGramos: 15 },
  ]);
  const [busquedaIng, setBusquedaIng] = useState("");
  const [showIngSearch, setShowIngSearch] = useState<number | null>(null);

  /* detail dialog */
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailAlimento, setDetailAlimento] = useState<Alimento | null>(null);

  /* tab */
  const [activeTab, setActiveTab] = useState("alimentos");

  /* search results */
  const resultadosBusqueda = busqueda.length >= 2
    ? alimentosDB.filter(a => a.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : [];

  const resultadosIng = busquedaIng.length >= 2
    ? alimentosDB.filter(a => a.nombre.toLowerCase().includes(busquedaIng.toLowerCase()))
    : [];

  /* recipe totals */
  const totales = useMemo(() => {
    const t = { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 };
    ingredientes.forEach(ing => {
      const g = ing.cantidad * ing.factorGramos;
      const ratio = g / 100;
      t.calorias += ing.alimento.calorias * ratio;
      t.proteinas += ing.alimento.proteinas * ratio;
      t.carbohidratos += ing.alimento.carbohidratos * ratio;
      t.grasas += ing.alimento.grasas * ratio;
    });
    return t;
  }, [ingredientes]);

  const porPorcion = useMemo(() => ({
    calorias: totales.calorias / porciones,
    proteinas: totales.proteinas / porciones,
    carbohidratos: totales.carbohidratos / porciones,
    grasas: totales.grasas / porciones,
  }), [totales, porciones]);

  const macroData = useMemo(() => {
    const calProt = totales.proteinas * 4;
    const calCarb = totales.carbohidratos * 4;
    const calGras = totales.grasas * 9;
    const total = calProt + calCarb + calGras || 1;
    return [
      { name: "Proteínas", value: Math.round((calProt / total) * 100), fill: "hsl(var(--primary))" },
      { name: "Carbohidratos", value: Math.round((calCarb / total) * 100), fill: "hsl(38, 98%, 40%)" },
      { name: "Grasas", value: Math.round((calGras / total) * 100), fill: "hsl(0, 84%, 60%)" },
    ];
  }, [totales]);

  /* handlers */
  const addToBase = (a: Alimento) => {
    if (base.find(b => b.id === a.id)) {
      toast.error("Este alimento ya está en tu base");
      return;
    }
    setBase(prev => [...prev, a]);
    toast.success(`${a.nombre} agregado a tu base`);
  };

  const removeFromBase = (id: string) => {
    setBase(prev => prev.filter(b => b.id !== id));
    toast.success("Alimento eliminado");
  };

  const addIngrediente = (a: Alimento) => {
    setIngredientes(prev => [...prev, { alimento: a, cantidad: 100, unidad: "gramos", factorGramos: 1 }]);
    setBusquedaIng("");
    setShowIngSearch(null);
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

  const removeIngrediente = (idx: number) => {
    setIngredientes(prev => prev.filter((_, i) => i !== idx));
  };

  const limpiarReceta = () => {
    setNombreReceta("");
    setPorciones(1);
    setIngredientes([]);
  };

  const openDetail = (a: Alimento) => {
    setDetailAlimento(a);
    setDetailOpen(true);
  };

  const calIngrediente = (ing: Ingrediente) => {
    const g = ing.cantidad * ing.factorGramos;
    return Math.round(ing.alimento.calorias * (g / 100));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestión de Alimentos y Recetas</h1>
            <p className="text-muted-foreground text-sm mt-1">Composición nutricional y creación de recetas personalizadas</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setActiveTab("alimentos"); setShowSearch(true); }}>
              <Search className="h-4 w-4 mr-2" /> Buscar alimento
            </Button>
            <Button onClick={() => setActiveTab("recetas")}>
              <Plus className="h-4 w-4 mr-2" /> Crear receta
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="alimentos"><Apple className="h-4 w-4 mr-2" /> Alimentos</TabsTrigger>
            <TabsTrigger value="recetas"><BookOpen className="h-4 w-4 mr-2" /> Constructor de Recetas</TabsTrigger>
          </TabsList>

          {/* ═══ TAB ALIMENTOS ═══ */}
          <TabsContent value="alimentos" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Search panel */}
              <Card className="lg:col-span-1 border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Buscador de Alimentos</CardTitle>
                  <CardDescription>Busca y agrega alimentos a tu base</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar alimento... (ej: aguacate, pollo)"
                      className="pl-9"
                      value={busqueda}
                      onChange={e => setBusqueda(e.target.value)}
                    />
                  </div>

                  {resultadosBusqueda.length > 0 && (
                    <div className="border border-border rounded-md divide-y divide-border max-h-64 overflow-y-auto">
                      {resultadosBusqueda.map(a => (
                        <button
                          key={a.id}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors flex justify-between items-center"
                          onClick={() => { setAlimentoSeleccionado(a); setBusqueda(""); }}
                        >
                          <div>
                            <span className="text-sm font-medium text-foreground">{a.nombre}</span>
                            <span className="text-xs text-muted-foreground ml-2">{a.calorias} kcal/100g</span>
                          </div>
                          <Badge variant="outline" className={`text-[10px] ${catColors[a.categoria]}`}>{a.categoria}</Badge>
                        </button>
                      ))}
                    </div>
                  )}

                  {alimentoSeleccionado && (
                    <Card className="border-primary/30 bg-primary/5">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold text-foreground">{alimentoSeleccionado.nombre}</h4>
                          <button onClick={() => setAlimentoSeleccionado(null)}>
                            <X className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Valores por 100 g</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {[
                            ["Calorías", `${alimentoSeleccionado.calorias} kcal`],
                            ["Proteínas", `${alimentoSeleccionado.proteinas} g`],
                            ["Grasas totales", `${alimentoSeleccionado.grasas} g`],
                            ["G. saturadas", `${alimentoSeleccionado.grasasSaturadas} g`],
                            ["Carbohidratos", `${alimentoSeleccionado.carbohidratos} g`],
                            ["Azúcares", `${alimentoSeleccionado.azucares} g`],
                            ["Fibra", `${alimentoSeleccionado.fibra} g`],
                          ].map(([label, val]) => (
                            <div key={label} className="flex justify-between border-b border-border/50 pb-1">
                              <span className="text-muted-foreground">{label}</span>
                              <span className="font-medium text-foreground">{val}</span>
                            </div>
                          ))}
                        </div>
                        <Button size="sm" className="w-full mt-2" onClick={() => { addToBase(alimentoSeleccionado); setAlimentoSeleccionado(null); }}>
                          <Save className="h-3.5 w-3.5 mr-1" /> Guardar en mi base
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>

              {/* Internal DB table */}
              <Card className="lg:col-span-2 border-border bg-card">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-base">Base de Alimentos Interna</CardTitle>
                      <CardDescription>{base.length} alimentos guardados</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-auto max-h-[520px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead>Alimento</TableHead>
                          <TableHead className="text-right">Kcal</TableHead>
                          <TableHead className="text-right">Prot</TableHead>
                          <TableHead className="text-right">Carbs</TableHead>
                          <TableHead className="text-right">Grasas</TableHead>
                          <TableHead>Categoría</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {base.map(a => (
                          <TableRow key={a.id} className="border-border hover:bg-muted/30 cursor-pointer" onClick={() => openDetail(a)}>
                            <TableCell className="font-medium text-foreground">{a.nombre}</TableCell>
                            <TableCell className="text-right text-foreground">{a.calorias}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{a.proteinas}g</TableCell>
                            <TableCell className="text-right text-muted-foreground">{a.carbohidratos}g</TableCell>
                            <TableCell className="text-right text-muted-foreground">{a.grasas}g</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] ${catColors[a.categoria]}`}>{a.categoria}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setActiveTab("recetas"); addIngrediente(a); }}>
                                  <UtensilsCrossed className="h-3 w-3 mr-1" /> Usar
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => removeFromBase(a.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ═══ TAB RECETAS ═══ */}
          <TabsContent value="recetas" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
              {/* Builder */}
              <div className="xl:col-span-3 space-y-4">
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Constructor de Recetas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Nombre de la receta</label>
                        <Input value={nombreReceta} onChange={e => setNombreReceta(e.target.value)} placeholder="Ej: Bowl de proteínas" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Porciones</label>
                        <Input type="number" min={1} value={porciones} onChange={e => setPorciones(Math.max(1, Number(e.target.value)))} />
                      </div>
                    </div>

                    {/* Ingredients list */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Ingredientes</label>
                      <div className="space-y-2">
                        {ingredientes.map((ing, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-muted/30 border border-border rounded-lg px-3 py-2">
                            <span className="text-sm font-medium text-foreground min-w-[120px] truncate flex-1">{ing.alimento.nombre}</span>
                            <Input
                              type="number"
                              className="w-20 h-8 text-sm"
                              value={ing.cantidad}
                              onChange={e => updateIngrediente(idx, "cantidad", e.target.value)}
                              min={0}
                            />
                            <Select value={ing.unidad} onValueChange={v => updateIngrediente(idx, "unidad", v)}>
                              <SelectTrigger className="w-28 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {unidades.map(u => (
                                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <span className="text-xs text-primary font-semibold w-16 text-right">{calIngrediente(ing)} kcal</span>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeIngrediente(idx)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* Add ingredient */}
                      <div className="relative">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              placeholder="Buscar ingrediente para agregar..."
                              className="pl-9 h-9 text-sm"
                              value={busquedaIng}
                              onChange={e => { setBusquedaIng(e.target.value); setShowIngSearch(1); }}
                              onFocus={() => setShowIngSearch(1)}
                            />
                          </div>
                        </div>
                        {showIngSearch && resultadosIng.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 border border-border rounded-md bg-popover shadow-lg max-h-48 overflow-y-auto">
                            {resultadosIng.map(a => (
                              <button
                                key={a.id}
                                className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm flex justify-between"
                                onClick={() => addIngrediente(a)}
                              >
                                <span className="text-foreground">{a.nombre}</span>
                                <span className="text-muted-foreground text-xs">{a.calorias} kcal</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button className="flex-1" onClick={() => toast.success(`Receta "${nombreReceta}" guardada`)}>
                        <Save className="h-4 w-4 mr-2" /> Guardar receta
                      </Button>
                      <Button variant="outline" onClick={limpiarReceta}>
                        <RotateCcw className="h-4 w-4 mr-2" /> Limpiar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Nutrition summary panel */}
              <div className="xl:col-span-2 space-y-4">
                {/* Totals */}
                <Card className="border-border bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Resumen Nutricional</CardTitle>
                    <CardDescription>{nombreReceta || "Sin nombre"} · {porciones} porción(es)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Macro chart */}
                    <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[180px]">
                      <PieChart>
                        <Pie data={macroData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} strokeWidth={2} stroke="hsl(var(--card))">
                          {macroData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
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

                    {/* Tables */}
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Total receta</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <div className="flex justify-between"><span className="text-muted-foreground">Calorías</span><span className="font-semibold text-primary">{Math.round(totales.calorias)} kcal</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Proteínas</span><span className="font-medium text-foreground">{totales.proteinas.toFixed(1)}g</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Carbohidratos</span><span className="font-medium text-foreground">{totales.carbohidratos.toFixed(1)}g</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Grasas</span><span className="font-medium text-foreground">{totales.grasas.toFixed(1)}g</span></div>
                        </div>
                      </div>
                      <div className="border-t border-border pt-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Por porción ({porciones})</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                          <div className="flex justify-between"><span className="text-muted-foreground">Calorías</span><span className="font-semibold text-primary">{Math.round(porPorcion.calorias)} kcal</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Proteínas</span><span className="font-medium text-foreground">{porPorcion.proteinas.toFixed(1)}g</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Carbohidratos</span><span className="font-medium text-foreground">{porPorcion.carbohidratos.toFixed(1)}g</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Grasas</span><span className="font-medium text-foreground">{porPorcion.grasas.toFixed(1)}g</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Ingredient list */}
                    <div className="border-t border-border pt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Ingredientes ({ingredientes.length})</p>
                      <div className="space-y-1">
                        {ingredientes.map((ing, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-foreground">{ing.alimento.nombre}</span>
                            <span className="text-muted-foreground">{ing.cantidad} {ing.unidad} · {calIngrediente(ing)} kcal</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>{detailAlimento?.nombre}</DialogTitle>
          </DialogHeader>
          {detailAlimento && (
            <div className="space-y-3">
              <Badge variant="outline" className={catColors[detailAlimento.categoria]}>{detailAlimento.categoria}</Badge>
              <p className="text-xs text-muted-foreground">Valores nutricionales por 100 g</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Calorías", `${detailAlimento.calorias} kcal`],
                  ["Proteínas", `${detailAlimento.proteinas} g`],
                  ["Grasas totales", `${detailAlimento.grasas} g`],
                  ["G. saturadas", `${detailAlimento.grasasSaturadas} g`],
                  ["Carbohidratos", `${detailAlimento.carbohidratos} g`],
                  ["Azúcares", `${detailAlimento.azucares} g`],
                  ["Fibra", `${detailAlimento.fibra} g`],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between border-b border-border/50 pb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Cerrar</Button>
            {detailAlimento && (
              <Button onClick={() => { setActiveTab("recetas"); addIngrediente(detailAlimento); setDetailOpen(false); }}>
                <UtensilsCrossed className="h-4 w-4 mr-2" /> Usar en receta
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default AlimentosRecetas;
