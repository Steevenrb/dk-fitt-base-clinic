import { Edit, Clock, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mealPlan: Record<string, { comida: string; descripcion: string; kcal: number }[]> = {
  Lunes: [
    { comida: "Desayuno", descripcion: "Avena con frutos rojos, semillas de chia y leche de almendra", kcal: 320 },
    { comida: "Media Mañana", descripcion: "Manzana verde con 15g de almendras", kcal: 150 },
    { comida: "Comida", descripcion: "Pechuga de pollo a la plancha, arroz integral y ensalada mixta", kcal: 520 },
    { comida: "Media Tarde", descripcion: "Yogur griego natural con pepino", kcal: 120 },
    { comida: "Cena", descripcion: "Crema de verduras con tostada integral y queso panela", kcal: 380 },
  ],
  Martes: [
    { comida: "Desayuno", descripcion: "Huevos revueltos con espinaca y tortilla de nopal", kcal: 340 },
    { comida: "Media Mañana", descripcion: "Pera con queso cottage", kcal: 140 },
    { comida: "Comida", descripcion: "Salmon al horno con quinoa y esparragos", kcal: 560 },
    { comida: "Media Tarde", descripcion: "Jicama con limon y chile", kcal: 80 },
    { comida: "Cena", descripcion: "Ensalada de atun con aguacate y vegetales", kcal: 400 },
  ],
  Miercoles: [
    { comida: "Desayuno", descripcion: "Licuado de proteina con platano y espinaca", kcal: 310 },
    { comida: "Media Mañana", descripcion: "Mix de nueces (20g)", kcal: 160 },
    { comida: "Comida", descripcion: "Filete de res magro con camote y brocoli", kcal: 540 },
    { comida: "Media Tarde", descripcion: "Apio con hummus", kcal: 100 },
    { comida: "Cena", descripcion: "Sopa de lenteja con verduras", kcal: 360 },
  ],
  Jueves: [
    { comida: "Desayuno", descripcion: "Pan integral con aguacate y huevo pochado", kcal: 350 },
    { comida: "Media Mañana", descripcion: "Naranja y 10 almendras", kcal: 140 },
    { comida: "Comida", descripcion: "Pollo en salsa verde con nopales y frijoles", kcal: 500 },
    { comida: "Media Tarde", descripcion: "Gelatina sin azucar con fruta", kcal: 70 },
    { comida: "Cena", descripcion: "Wrap integral de verduras con queso oaxaca", kcal: 390 },
  ],
  Viernes: [
    { comida: "Desayuno", descripcion: "Chilaquiles verdes con pollo y crema light", kcal: 380 },
    { comida: "Media Mañana", descripcion: "Pina con requeson", kcal: 130 },
    { comida: "Comida", descripcion: "Tilapia empapelada con verduras y arroz", kcal: 480 },
    { comida: "Media Tarde", descripcion: "Pepino con limon", kcal: 40 },
    { comida: "Cena", descripcion: "Ensalada mediterranea con garbanzos", kcal: 370 },
  ],
};

const days = Object.keys(mealPlan);

type TabPlanesProps = {
  patientId?: number;
  profileId?: number | null;
};

export function TabPlanes({ patientId: _patientId, profileId: _profileId }: TabPlanesProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Plan Nutricional Personalizado</h3>
              <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 text-[11px]">Activo</Badge>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Inicio: 15 Ene 2026</span>
              <span>Meta calorica: 1,750 kcal/dia</span>
              <span>Proteina: 30% · Carbohidratos: 45% · Grasas: 25%</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Clock className="h-3.5 w-3.5" /> Configurar horarios
            </Button>
            <Button size="sm" className="gap-1.5 text-xs">
              <Edit className="h-3.5 w-3.5" /> Editar plan
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {days.map((day) => (
          <div key={day} className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs font-semibold text-primary">{day}</p>
              <p className="text-[11px] text-muted-foreground">
                {mealPlan[day].reduce((s, m) => s + m.kcal, 0)} kcal total
              </p>
            </div>
            <div className="divide-y divide-border">
              {mealPlan[day].map((meal) => (
                <div key={meal.comida} className="px-4 py-2.5">
                  <p className="text-[11px] font-semibold text-foreground">{meal.comida}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{meal.descripcion}</p>
                  <p className="mt-1 text-[10px] font-medium text-primary">{meal.kcal} kcal</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}