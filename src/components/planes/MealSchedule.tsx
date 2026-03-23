import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";

const mealTimes = [
  { key: "desayuno", label: "Desayuno", default: "07:30" },
  { key: "media_manana", label: "Media mañana", default: "10:00" },
  { key: "almuerzo", label: "Almuerzo", default: "13:30" },
  { key: "merienda", label: "Merienda", default: "16:00" },
  { key: "cena", label: "Cena", default: "19:30" },
];

interface Props {
  schedules: Record<string, string>;
  onScheduleChange: (key: string, value: string) => void;
}

export function MealSchedule({ schedules, onScheduleChange }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Horarios de Comidas</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {mealTimes.map((mt) => (
          <div key={mt.key} className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground">{mt.label}</label>
            <div className="relative">
              <Clock className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="time"
                value={schedules[mt.key] || mt.default}
                onChange={(e) => onScheduleChange(mt.key, e.target.value)}
                className="bg-muted pl-8 text-sm h-9"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
