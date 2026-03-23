import { useState } from "react";
import { ArrowLeft, Save, Ban, Power, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PlanConfig } from "@/components/planes/PlanConfig";
import { MealSchedule } from "@/components/planes/MealSchedule";
import { WeeklyPlanGrid, defaultPlan } from "@/components/planes/WeeklyPlanGrid";
import { ExercisePlan } from "@/components/planes/ExercisePlan";
import { NutritionalSummary } from "@/components/planes/NutritionalSummary";
import type { FoodItem, MealKey, DayKey } from "@/components/planes/WeeklyPlanGrid";

const PlanesNutricionales = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"activo" | "suspendido" | "inactivo">("activo");
  const [startDate, setStartDate] = useState(new Date(2026, 0, 15));
  const [activeDays, setActiveDays] = useState(["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]);
  const [schedules, setSchedules] = useState<Record<string, string>>({
    desayuno: "07:30",
    media_manana: "10:00",
    almuerzo: "13:30",
    merienda: "16:00",
    cena: "19:30",
  });
  const [plan, setPlan] = useState<Record<DayKey, Record<MealKey, FoodItem[]>>>(defaultPlan);

  const statusConfig = {
    activo: { label: "Activo", className: "bg-primary/15 text-primary border-primary/30" },
    suspendido: { label: "Suspendido", className: "bg-accent/20 text-accent border-accent/30" },
    inactivo: { label: "Inactivo", className: "bg-muted text-muted-foreground border-border" },
  };

  const sc = statusConfig[status];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/pacientes")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">Plan Nutricional — María González</h1>
                <Badge variant="outline" className={`text-[11px] ${sc.className}`}>{sc.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">Inicio: 15 Ene 2026 · Objetivo: 1,750 kcal/día</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {status !== "activo" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                onClick={() => { setStatus("activo"); toast.success("Plan activado"); }}
              >
                <Power className="h-3.5 w-3.5" /> Activar plan
              </Button>
            )}
            {status === "activo" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-accent border-accent/30 hover:bg-accent/10"
                onClick={() => { setStatus("suspendido"); toast.info("Plan suspendido"); }}
              >
                <Ban className="h-3.5 w-3.5" /> Suspender plan
              </Button>
            )}
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => toast.success("Cambios guardados exitosamente")}>
              <Save className="h-3.5 w-3.5" /> Guardar cambios
            </Button>
          </div>
        </div>

        {/* Config + Schedule */}
        <PlanConfig startDate={startDate} onStartDateChange={setStartDate} activeDays={activeDays} onActiveDaysChange={setActiveDays} />
        <MealSchedule schedules={schedules} onScheduleChange={(k, v) => setSchedules((prev) => ({ ...prev, [k]: v }))} />

        {/* Grid + Summary */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
          <div className="xl:col-span-3">
            <WeeklyPlanGrid activeDays={activeDays} plan={plan} onPlanChange={setPlan} />
          </div>
          <NutritionalSummary plan={plan} activeDays={activeDays} targetKcal={1750} />
        </div>

        {/* Exercises */}
        <ExercisePlan />
      </div>
    </AppLayout>
  );
};

export default PlanesNutricionales;
