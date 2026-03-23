import { Check, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const meals = [
  { name: "Desayuno – Avena con frutos rojos", done: true, time: "7:30 AM" },
  { name: "Colación AM – Manzana con almendras", done: true, time: "10:00 AM" },
  { name: "Comida – Pechuga con arroz integral", done: true, time: "1:30 PM" },
  { name: "Colación PM – Yogur griego", done: false, time: "4:00 PM" },
  { name: "Cena – Crema de verduras", done: false, time: "7:30 PM" },
];

const exercises = [
  { name: "Caminata 30 min", done: true },
  { name: "Rutina de fuerza – Tren superior", done: true },
  { name: "Estiramientos 15 min", done: false },
];

const mealsDone = meals.filter((m) => m.done).length;
const exercisesDone = exercises.filter((e) => e.done).length;
const totalAdherence = Math.round(
  ((mealsDone + exercisesDone) / (meals.length + exercises.length)) * 100
);

const getLevel = (pct: number) => {
  if (pct >= 80) return { label: "Alta", className: "bg-primary/15 text-primary border-primary/30" };
  if (pct >= 50) return { label: "Media", className: "bg-muted text-muted-foreground border-border" };
  return { label: "Baja", className: "bg-accent/20 text-accent border-accent/30" };
};

export function TabSeguimiento() {
  const level = getLevel(totalAdherence);

  return (
    <div className="space-y-6">
      {/* Adherence overview */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Adherencia del Día</h3>
          <Badge variant="outline" className={`text-[11px] ${level.className}`}>{level.label}</Badge>
        </div>
        <div className="flex items-center gap-4">
          <Progress value={totalAdherence} className="flex-1 h-3" />
          <span className="text-lg font-bold text-primary">{totalAdherence}%</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {mealsDone}/{meals.length} comidas · {exercisesDone}/{exercises.length} ejercicios completados
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Meals */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground">Comidas del Día</h3>
            <p className="text-xs text-muted-foreground">{mealsDone} de {meals.length} cumplidas</p>
          </div>
          <div className="divide-y divide-border">
            {meals.map((m) => (
              <div key={m.name} className="flex items-center gap-3 px-5 py-3">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.done ? "bg-emerald-500/15 text-emerald-400" : "bg-accent/15 text-accent"}`}>
                  {m.done ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${m.done ? "text-foreground" : "text-muted-foreground"}`}>{m.name}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{m.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Exercises */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-semibold text-foreground">Ejercicios del Día</h3>
            <p className="text-xs text-muted-foreground">{exercisesDone} de {exercises.length} completados</p>
          </div>
          <div className="divide-y divide-border">
            {exercises.map((e) => (
              <div key={e.name} className="flex items-center gap-3 px-5 py-3">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${e.done ? "bg-emerald-500/15 text-emerald-400" : "bg-accent/15 text-accent"}`}>
                  {e.done ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                </div>
                <p className={`text-sm ${e.done ? "text-foreground" : "text-muted-foreground"}`}>{e.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
