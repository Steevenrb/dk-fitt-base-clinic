import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function DashboardTopBarContent() {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(2026, 2, 16),
    to: new Date(2026, 2, 23),
  });

  const formatRange = () => {
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "dd MMM", { locale: es })} – ${format(dateRange.to, "dd MMM yyyy", { locale: es })}`;
    }
    if (dateRange.from) {
      return format(dateRange.from, "dd MMM yyyy", { locale: es });
    }
    return "Seleccionar fechas";
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("hidden md:inline-flex gap-2 text-sm font-normal text-muted-foreground")}
        >
          <CalendarIcon className="h-4 w-4" />
          {formatRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={dateRange as any}
          onSelect={(range: any) => range && setDateRange(range)}
          numberOfMonths={2}
          locale={es}
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
