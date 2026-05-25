import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Power, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const allDays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

interface Props {
  startDate: Date;
  onStartDateChange: (d: Date) => void;
  activeDays: string[];
  onActiveDaysChange: (d: string[]) => void;
  status: "activo" | "suspendido" | "pendiente" | "inactivo";
  planId: number | null;
  activatingPlan: boolean;
  onActivateClick: () => void;
  onSuspendClick: () => void;
  onReactivateClick: () => void;
}

export function PlanConfig({
  startDate,
  onStartDateChange,
  activeDays,
  onActiveDaysChange,
  status,
  planId,
  activatingPlan,
  onActivateClick,
  onSuspendClick,
  onReactivateClick,
}: Props) {
  const toggleDay = (day: string) => {
    onActiveDaysChange(
      activeDays.includes(day) ? activeDays.filter((d) => d !== day) : [...activeDays, day]
    );
  };

  const isActive = status === "activo";
  const isSuspended = status === "suspendido";
  const actionLabel = isActive ? "Suspender plan" : isSuspended ? "Reactivar plan" : "Activar plan";
  const actionClassName = isActive
    ? "gap-1.5 text-xs text-accent border-accent/30 hover:bg-accent/10"
    : "gap-1.5 text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10";
  const actionIcon = isActive ? <Ban className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />;
  const handleAction = isActive ? onSuspendClick : isSuspended ? onReactivateClick : onActivateClick;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <h3 className="text-sm font-semibold text-foreground">Configuración General</h3>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* Date picker */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Fecha de inicio</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-sm font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(startDate, "dd MMM yyyy", { locale: es })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(d) => d && onStartDateChange(d)}
                locale={es}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Active days */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Días activos</label>
          <div className="flex gap-1.5 flex-wrap">
            {allDays.map((day) => {
              const active = activeDays.includes(day);
              return (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile plan activation */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">App móvil</label>
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
            <span className="text-xs text-foreground">Módulo Mi Plan</span>
            <Button
              variant="outline"
              size="sm"
              className={actionClassName}
              onClick={handleAction}
              disabled={!planId || (!isActive && !isSuspended && activatingPlan)}
            >
              {actionIcon} {actionLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
