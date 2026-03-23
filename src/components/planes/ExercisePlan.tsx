import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Exercise {
  id: number;
  name: string;
  duration: string;
  intensity: "baja" | "moderada" | "alta";
  frequency: string;
}

const defaultExercises: Exercise[] = [
  { id: 1, name: "Caminata rápida", duration: "30 min", intensity: "moderada", frequency: "L-M-V" },
  { id: 2, name: "Rutina de fuerza tren superior", duration: "40 min", intensity: "alta", frequency: "M-J" },
  { id: 3, name: "Estiramientos y movilidad", duration: "15 min", intensity: "baja", frequency: "Diario" },
  { id: 4, name: "Bicicleta estática", duration: "25 min", intensity: "moderada", frequency: "L-M-V" },
];

const intensityBadge = {
  baja: "bg-emerald-500/15 text-emerald-400",
  moderada: "bg-primary/15 text-primary",
  alta: "bg-accent/20 text-accent",
};

export function ExercisePlan() {
  const [exercises, setExercises] = useState(defaultExercises);
  const [adding, setAdding] = useState(false);
  const [newEx, setNewEx] = useState({ name: "", duration: "", intensity: "moderada" as Exercise["intensity"], frequency: "" });

  const remove = (id: number) => setExercises((prev) => prev.filter((e) => e.id !== id));

  const add = () => {
    if (!newEx.name) return;
    setExercises((prev) => [...prev, { ...newEx, id: Date.now() }]);
    setNewEx({ name: "", duration: "", intensity: "moderada", frequency: "" });
    setAdding(false);
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Plan de Ejercicios</h3>
          <p className="text-xs text-muted-foreground">{exercises.length} ejercicios asignados</p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => setAdding(!adding)}>
          <Plus className="h-3.5 w-3.5" /> Agregar ejercicio
        </Button>
      </div>

      {adding && (
        <div className="border-b border-border px-5 py-3 bg-muted/20">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Input placeholder="Nombre" value={newEx.name} onChange={(e) => setNewEx({ ...newEx, name: e.target.value })} className="text-sm bg-muted h-9" />
            <Input placeholder="Duración" value={newEx.duration} onChange={(e) => setNewEx({ ...newEx, duration: e.target.value })} className="text-sm bg-muted h-9" />
            <Select value={newEx.intensity} onValueChange={(v: Exercise["intensity"]) => setNewEx({ ...newEx, intensity: v })}>
              <SelectTrigger className="bg-muted text-sm h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="baja">Baja</SelectItem>
                <SelectItem value="moderada">Moderada</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Frecuencia" value={newEx.frequency} onChange={(e) => setNewEx({ ...newEx, frequency: e.target.value })} className="text-sm bg-muted h-9" />
            <Button size="sm" onClick={add} className="h-9">Guardar</Button>
          </div>
        </div>
      )}

      <div className="divide-y divide-border">
        {exercises.map((ex) => (
          <div key={ex.id} className="flex items-center gap-4 px-5 py-3 group hover:bg-muted/30 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{ex.name}</p>
              <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                <span>{ex.duration}</span>
                <span>{ex.frequency}</span>
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${intensityBadge[ex.intensity]}`}>
              {ex.intensity.charAt(0).toUpperCase() + ex.intensity.slice(1)}
            </span>
            <button onClick={() => remove(ex.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-accent">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
