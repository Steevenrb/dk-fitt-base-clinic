import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, X, Trash2, Edit, Save, RotateCcw, UtensilsCrossed, CheckCircle2, Info, PenLine, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Alimento, alimentosDB, catColors } from "./alimentosData";

interface TabAlimentosProps {
  base: Alimento[];
  setBase: React.Dispatch<React.SetStateAction<Alimento[]>>;
  onUseInRecipe: (a: Alimento) => void;
}

const categorias = ["Todas", "Fruta", "Vegetal", "Proteína", "Cereal", "Lácteo", "Grasa", "Otro"];

export function TabAlimentos({ base, setBase, onUseInRecipe }: TabAlimentosProps) {
  const [busqueda, setBusqueda] = useState("");
  const [alimentoSeleccionado, setAlimentoSeleccionado] = useState<Alimento | null>(null);
  const [editValues, setEditValues] = useState<Alimento | null>(null);
  const [filtroTabla, setFiltroTabla] = useState("");
  const [filtroCat, setFiltroCat] = useState("Todas");
  const [editDialog, setEditDialog] = useState(false);
  const [editItem, setEditItem] = useState<Alimento | null>(null);

  const resultadosBusqueda = busqueda.length >= 2
    ? alimentosDB.filter(a => a.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : [];

  const filteredBase = base.filter(a => {
    const matchName = a.nombre.toLowerCase().includes(filtroTabla.toLowerCase());
    const matchCat = filtroCat === "Todas" || a.categoria === filtroCat;
    return matchName && matchCat;
  });

  const selectAlimento = (a: Alimento) => {
    setAlimentoSeleccionado(a);
    setEditValues({ ...a });
    setBusqueda("");
  };

  const addToBase = () => {
    if (!editValues) return;
    if (base.find(b => b.id === editValues.id)) {
      toast.error("Este alimento ya está en tu base");
      return;
    }
    setBase(prev => [...prev, editValues]);
    toast.success(`${editValues.nombre} agregado a tu base`);
    setAlimentoSeleccionado(null);
    setEditValues(null);
  };

  const removeFromBase = (id: string) => {
    setBase(prev => prev.filter(b => b.id !== id));
    toast.success("Alimento eliminado");
  };

  const openEdit = (a: Alimento) => {
    setEditItem({ ...a });
    setEditDialog(true);
  };

  const saveEdit = () => {
    if (!editItem) return;
    setBase(prev => prev.map(b => b.id === editItem.id ? editItem : b));
    toast.success("Alimento actualizado");
    setEditDialog(false);
  };

  const updateField = (field: keyof Alimento, value: string | number) => {
    if (!editValues) return;
    setEditValues({ ...editValues, [field]: value });
  };

  const nutriFields: { key: keyof Alimento; label: string; unit: string }[] = [
    { key: "calorias", label: "Calorías", unit: "kcal" },
    { key: "proteinas", label: "Proteínas", unit: "g" },
    { key: "carbohidratos", label: "Carbohidratos", unit: "g" },
    { key: "azucares", label: "Azúcares", unit: "g" },
    { key: "grasas", label: "Grasas totales", unit: "g" },
    { key: "grasasSaturadas", label: "Grasas saturadas", unit: "g" },
    { key: "fibra", label: "Fibra", unit: "g" },
    { key: "sodio", label: "Sodio", unit: "mg" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── SEARCH PANEL ─── */}
        <Card className="lg:col-span-1 border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Buscador Inteligente</CardTitle>
            <CardDescription>Busca alimentos con carga automática de valores nutricionales</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar alimento... (ej: manzana, pollo, arroz)"
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
                    onClick={() => selectAlimento(a)}
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

            {/* ─── DETAIL PANEL ─── */}
            {alimentoSeleccionado && editValues && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-foreground">{alimentoSeleccionado.nombre}</h4>
                    <button onClick={() => { setAlimentoSeleccionado(null); setEditValues(null); }}>
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Datos cargados automáticamente ✓</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Info className="h-3 w-3" />
                    <span>Puedes editar cualquier valor si la información no es correcta</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-muted-foreground">Categoría</label>
                    <Select value={editValues.categoria} onValueChange={v => updateField("categoria", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Fruta", "Vegetal", "Proteína", "Cereal", "Lácteo", "Grasa", "Otro"].map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <p className="text-[11px] text-muted-foreground border-b border-border/50 pb-1">Valores por 100 g (editables)</p>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                    {nutriFields.map(({ key, label, unit }) => (
                      <div key={key} className="space-y-0.5">
                        <label className="text-[10px] text-muted-foreground">{label} ({unit})</label>
                        <Input
                          type="number"
                          className="h-7 text-xs"
                          value={editValues[key] as number}
                          onChange={e => updateField(key, Number(e.target.value))}
                          min={0}
                          step={0.1}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1" onClick={addToBase}>
                      <Save className="h-3.5 w-3.5 mr-1" /> Guardar en mi base
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setAlimentoSeleccionado(null); setEditValues(null); }}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Limpiar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* ─── INTERNAL DB TABLE ─── */}
        <Card className="lg:col-span-2 border-border bg-card">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Base de Alimentos Interna</CardTitle>
                <CardDescription>{base.length} alimentos guardados</CardDescription>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filtrar por nombre..."
                  className="pl-9 h-8 text-xs"
                  value={filtroTabla}
                  onChange={e => setFiltroTabla(e.target.value)}
                />
              </div>
              <Select value={filtroCat} onValueChange={setFiltroCat}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-[520px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Alimento</TableHead>
                    <TableHead className="text-right">Kcal/100g</TableHead>
                    <TableHead className="text-right">Prot</TableHead>
                    <TableHead className="text-right">Carbs</TableHead>
                    <TableHead className="text-right">Grasas</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBase.map(a => (
                    <TableRow key={a.id} className="border-border hover:bg-muted/30">
                      <TableCell className="font-medium text-foreground">{a.nombre}</TableCell>
                      <TableCell className="text-right text-foreground">{a.calorias}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{a.proteinas}g</TableCell>
                      <TableCell className="text-right text-muted-foreground">{a.carbohidratos}g</TableCell>
                      <TableCell className="text-right text-muted-foreground">{a.grasas}g</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${catColors[a.categoria]}`}>{a.categoria}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(a)}>
                            <Edit className="h-3 w-3 mr-1" /> Editar
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onUseInRecipe(a)}>
                            <UtensilsCrossed className="h-3 w-3 mr-1" /> Usar
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => removeFromBase(a.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredBase.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No se encontraron alimentos</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── EDIT DIALOG ─── */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Editar — {editItem?.nombre}</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="grid grid-cols-2 gap-3">
              {nutriFields.map(({ key, label, unit }) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs text-muted-foreground">{label} ({unit})</label>
                  <Input
                    type="number"
                    className="h-8 text-sm"
                    value={editItem[key] as number}
                    onChange={e => setEditItem({ ...editItem, [key]: Number(e.target.value) })}
                    min={0}
                    step={0.1}
                  />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancelar</Button>
            <Button onClick={saveEdit}><Save className="h-4 w-4 mr-2" /> Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
