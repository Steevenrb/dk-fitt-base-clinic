import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export type DashboardWeightPoint = Record<string, string | number>;

export type WeightPatientOption = {
  id: string;
  name: string;
};

const colors = ["#F7CA5E", "#FA9C5C", "#C5EB6F"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-xl border border-border/70 bg-card p-3">
      <p className="mb-2 text-xs font-semibold text-foreground">Registro {label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="flex items-center justify-between gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
          <span className="font-semibold text-foreground">{entry.value} kg</span>
        </p>
      ))}
    </div>
  );
};

export function WeightChart({
  data = [],
  series,
  loading = false,
  patients = [],
  selectedPatientIds = [],
  onTogglePatient,
}: {
  data?: DashboardWeightPoint[];
  series?: string[];
  loading?: boolean;
  patients?: WeightPatientOption[];
  selectedPatientIds?: string[];
  onTogglePatient?: (id: string) => void;
}) {
  const chartSeries = series ?? Object.keys(data[0] || {}).filter((key) => key !== "semana").slice(0, 3);

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[#F7CA5E]/70">
      <div className="flex flex-col gap-4 border-b border-border/60 bg-card p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#F7CA5E]" />
            <h3 className="text-base font-semibold text-foreground">Evolucion del Peso</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {loading ? "Cargando registros de peso..." : `Registros diarios - ${chartSeries.length} pacientes seleccionados`}
          </p>
          {!loading && chartSeries.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {chartSeries.slice(0, 3).map((name, index) => (
                <span key={name} className="rounded-full bg-card/75 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground ring-1 ring-border/60">
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
        {!loading && patients.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 w-full justify-between rounded-full text-xs sm:w-64">
                {selectedPatientIds.length > 0 ? `${selectedPatientIds.length}/3 pacientes seleccionados` : "Seleccionar pacientes"}
                <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar paciente..." />
                <CommandList>
                  <CommandEmpty>No hay pacientes con registros.</CommandEmpty>
                  <CommandGroup heading="Maximo 3 pacientes">
                    {patients.map((patient) => {
                      const checked = selectedPatientIds.includes(patient.id);
                      const disabled = !checked && selectedPatientIds.length >= 3;
                      return (
                        <CommandItem
                          key={patient.id}
                          value={patient.name}
                          disabled={disabled}
                          onSelect={() => onTogglePatient?.(patient.id)}
                          className="gap-2"
                        >
                          <Checkbox checked={checked} disabled={disabled} className="h-3.5 w-3.5" />
                          <span className="flex-1 truncate text-xs">{patient.name}</span>
                          {checked && <Check className="h-3.5 w-3.5 text-[#7A9A18]" />}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>
      <div className="p-4">
        {loading || data.length === 0 || chartSeries.length === 0 ? (
        <div className="flex h-[280px] items-center justify-center rounded-xl bg-muted/25 text-sm text-muted-foreground">
          {loading ? "Cargando datos..." : "No hay registros de peso para la semana seleccionada."}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" opacity={0.42} />
            <XAxis dataKey="semana" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} domain={["dataMin - 2", "dataMax + 2"]} unit=" kg" />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}
            />
            {chartSeries.map((name, index) => (
              <Line key={name} type="monotone" dataKey={name} stroke={colors[index % colors.length]} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2, fill: "hsl(var(--card))" }} activeDot={{ r: 5, strokeWidth: 2 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
      </div>
    </div>
  );
}
