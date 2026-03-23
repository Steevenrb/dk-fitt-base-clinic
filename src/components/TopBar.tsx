import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Bell } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function TopBar() {
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
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "hidden md:inline-flex gap-2 text-sm font-normal text-muted-foreground",
              )}
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
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            5
          </span>
        </Button>

        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border border-border">
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
              NK
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block">
            <p className="text-sm font-medium leading-none text-foreground">Nutricionista Karen</p>
            <p className="text-xs text-muted-foreground">Nutrióloga clínica</p>
          </div>
        </div>
      </div>
    </header>
  );
}
