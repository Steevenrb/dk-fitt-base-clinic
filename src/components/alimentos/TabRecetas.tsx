import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";
import { Search, Plus, Clock, Users, Check, X, Trash2, Edit, UtensilsCrossed, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Receta, recetaCatColors, aptitudLabels, calcTotales, calcMacroData, calcIngredienteCal, chartConfig,
} from "./alimentosData";

interface TabRecetasProps {
  recetas: Receta[];
  setRecetas: React.Dispatch<React.SetStateAction<Receta[]>>;
  onNewRecipe: () => void;
  onEditRecipe: (r: Receta) => void;
}

const categoriasFiltro = ["Todas", "Desayuno", "Almuerzo", "Cena", "Snack", "Bebida"];
const aptitudFiltro = ["Todos", "Diabéticos", "Hipertensos", "Celíacos", "Vegetarianos", "Veganos"];
const aptFiltroMap: Record<string, string> = {
  "Diabéticos": "diabeticos", "Hipertensos": "hipertensos", "Celíacos": "celiacos",
  "Vegetarianos": "vegetarianos", "Veganos": "veganos",
};

export function TabRecetas({ recetas, setRecetas, onNewRecipe, onEditRecipe }: TabRecetasProps) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroCat, setFiltroCat] = useState("Todas");
  const [filtroApt, setFiltroApt] = useState("Todos");
  const [selectedReceta, setSelectedReceta] = useState<Receta | null>(null);

  const filtered = recetas.filter(r => {
    const matchName = r.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const matchCat = filtroCat === "Todas" || r.categoria === filtroCat;
    const matchApt = filtroApt === "Todos" || r.aptitud[aptFiltroMap[filtroApt]];
    return matchName && matchCat && matchApt;
  });

  const deleteReceta = (id: string) => {
    setRecetas(prev => prev.filter(r => r.id !== id));
    toast.success("Receta eliminada");
    setSelectedReceta(null);
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar receta..." className="pl-9" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <Select value={filtroCat} onValueChange={setFiltroCat}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>{categoriasFiltro.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filtroApt} onValueChange={setFiltroApt}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Apta para" /></SelectTrigger>
          <SelectContent>{aptitudFiltro.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={onNewRecipe}><Plus className="h-4 w-4 mr-2" /> Nueva receta</Button>
      </div>

      {/* Recipe grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {filtered.map(r => {
          const totals = calcTotales(r.ingredientes);
          const allApt = Object.values(r.aptitud).every(v => v);
          return (
            <Card key={r.id} className="border-border bg-card hover:border-primary/40 transition-colors cursor-pointer group" onClick={() => setSelectedReceta(r)}>
              <CardContent className="p-0">
                {/* Placeholder image */}
                <div className="h-32 bg-muted/50 flex items-center justify-center rounded-t-lg">
                  <UtensilsCrossed className="h-10 w-10 text-muted-foreground/40 group-hover:text-primary/50 transition-colors" />
                </div>
                <div className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm text-foreground leading-tight">{r.nombre}</h3>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${recetaCatColors[r.categoria]}`}>{r.categoria}</Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{r.tiempoPrep} min</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{r.porciones} porc.</span>
                  </div>

                  <div className="text-lg font-bold text-primary">{Math.round(totals.calorias)} kcal</div>
                  <div className="text-[11px] text-muted-foreground">Por porción: {Math.round(totals.calorias / r.porciones)} kcal</div>

                  <div className="flex gap-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">P {totals.proteinas.toFixed(0)}g</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">C {totals.carbohidratos.toFixed(0)}g</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">G {totals.grasas.toFixed(0)}g</span>
                  </div>

                  {allApt ? (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      <Check className="h-2.5 w-2.5 mr-1" /> Apta para todos
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/30">
                      <AlertTriangle className="h-2.5 w-2.5 mr-1" /> Restricciones
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-16">No se encontraron recetas</div>
        )}
      </div>

      {/* ─── DETAIL MODAL ─── */}
      {selectedReceta && (
        <RecetaDetailModal
          receta={selectedReceta}
          open={!!selectedReceta}
          onClose={() => setSelectedReceta(null)}
          onEdit={() => { onEditRecipe(selectedReceta); setSelectedReceta(null); }}
          onDelete={() => deleteReceta(selectedReceta.id)}
        />
      )}
    </div>
  );
}

/* ─── RECIPE DETAIL MODAL ─── */
function RecetaDetailModal({ receta, open, onClose, onEdit, onDelete }: {
  receta: Receta; open: boolean; onClose: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const totals = calcTotales(receta.ingredientes);
  const perServing = {
    calorias: totals.calorias / receta.porciones,
    proteinas: totals.proteinas / receta.porciones,
    carbohidratos: totals.carbohidratos / receta.porciones,
    grasas: totals.grasas / receta.porciones,
    fibra: totals.fibra / receta.porciones,
    azucares: totals.azucares / receta.porciones,
    sodio: totals.sodio / receta.porciones,
  };
  const macroData = calcMacroData(totals);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{receta.nombre}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Header image placeholder */}
          <div className="h-40 bg-muted/40 rounded-lg flex items-center justify-center">
            <UtensilsCrossed className="h-14 w-14 text-muted-foreground/30" />
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className={recetaCatColors[receta.categoria]}>{receta.categoria}</Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5" />{receta.porciones} porciones</span>
            <span className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{receta.tiempoPrep} min</span>
          </div>

          {/* Nutrition */}
          <Card className="border-border bg-muted/20">
            <CardContent className="p-4 space-y-4">
              <h4 className="font-semibold text-sm text-foreground">Información Nutricional</h4>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Receta completa</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Calorías</span><span className="font-bold text-primary">{Math.round(totals.calorias)} kcal</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Proteínas</span><span className="text-foreground">{totals.proteinas.toFixed(1)}g</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Carbohidratos</span><span className="text-foreground">{totals.carbohidratos.toFixed(1)}g</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Grasas</span><span className="text-foreground">{totals.grasas.toFixed(1)}g</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Fibra</span><span className="text-foreground">{totals.fibra.toFixed(1)}g</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Azúcares</span><span className="text-foreground">{totals.azucares.toFixed(1)}g</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Sodio</span><span className="text-foreground">{totals.sodio.toFixed(0)}mg</span></div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Por porción</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Calorías</span><span className="font-bold text-primary">{Math.round(perServing.calorias)} kcal</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Proteínas</span><span className="text-foreground">{perServing.proteinas.toFixed(1)}g</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Carbohidratos</span><span className="text-foreground">{perServing.carbohidratos.toFixed(1)}g</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Grasas</span><span className="text-foreground">{perServing.grasas.toFixed(1)}g</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Fibra</span><span className="text-foreground">{perServing.fibra.toFixed(1)}g</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Azúcares</span><span className="text-foreground">{perServing.azucares.toFixed(1)}g</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Sodio</span><span className="text-foreground">{perServing.sodio.toFixed(0)}mg</span></div>
                  </div>
                </div>
              </div>

              {/* Macro donut */}
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
                  {macroData.map(m => (
                    <div key={m.name} className="flex items-center gap-2 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.fill }} />
                      <span className="text-muted-foreground">{m.name}</span>
                      <span className="font-semibold text-foreground">{m.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ingredients */}
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-2">Ingredientes</h4>
            <div className="space-y-1.5">
              {receta.ingredientes.map((ing, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-border/30">
                  <span className="text-foreground">{ing.alimento.nombre}</span>
                  <span className="text-muted-foreground">{ing.cantidad} {ing.unidad} · {calcIngredienteCal(ing)} kcal</span>
                </div>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-2">Preparación</h4>
            <ol className="space-y-2">
              {receta.pasos.map((paso, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="shrink-0 h-5 w-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-semibold">{i + 1}</span>
                  <span className="text-muted-foreground">{paso}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Clinical aptitude */}
          <Card className="border-border bg-muted/20">
            <CardContent className="p-4 space-y-3">
              <h4 className="font-semibold text-sm text-foreground">Aptitud Clínica</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(aptitudLabels).map(([key, label]) => {
                  const apt = receta.aptitud[key];
                  return (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      {apt ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-destructive" />
                      )}
                      <span className={apt ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                    </div>
                  );
                })}
              </div>
              {receta.notaClinica && (
                <div className="mt-2 p-2.5 rounded-md bg-accent/10 border border-accent/20">
                  <p className="text-xs text-accent-foreground"><span className="font-semibold">Nota clínica:</span> {receta.notaClinica}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button className="flex-1"><UtensilsCrossed className="h-4 w-4 mr-2" /> Usar en plan nutricional</Button>
            <Button variant="outline" onClick={onEdit}><Edit className="h-4 w-4 mr-2" /> Editar</Button>
            <Button variant="outline" className="text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4 mr-2" /> Eliminar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
