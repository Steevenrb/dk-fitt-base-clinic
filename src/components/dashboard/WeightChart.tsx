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

const defaultWeightData: DashboardWeightPoint[] = [
  { semana: "Sem 1", "Maria G.": 82.5, "Carlos R.": 95.0, "Ana L.": 68.2 },
  { semana: "Sem 2", "Maria G.": 81.8, "Carlos R.": 94.2, "Ana L.": 67.8 },
  { semana: "Sem 3", "Maria G.": 81.2, "Carlos R.": 93.5, "Ana L.": 67.5 },
  { semana: "Sem 4", "Maria G.": 80.5, "Carlos R.": 93.8, "Ana L.": 67.0 },
  { semana: "Sem 5", "Maria G.": 79.8, "Carlos R.": 92.6, "Ana L.": 66.7 },
  { semana: "Sem 6", "Maria G.": 79.3, "Carlos R.": 92.1, "Ana L.": 66.3 },
  { semana: "Sem 7", "Maria G.": 78.9, "Carlos R.": 91.4, "Ana L.": 66.0 },
  { semana: "Sem 8", "Maria G.": 78.2, "Carlos R.": 91.0, "Ana L.": 65.5 },
];

const colors = ["#e5b106", "#cc8c02", "#a3a3a3"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-foreground">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="text-xs text-muted-foreground">
          <span style={{ color: entry.color }}>o</span> {entry.name}: {entry.value} kg
        </p>
      ))}
    </div>
  );
};

export function WeightChart({
  data = defaultWeightData,
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
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-5 space-y-3">
        <div>
          <h3 className="mb-1 text-sm font-semibold text-foreground">Evolucion del Peso</h3>
          <p className="text-xs text-muted-foreground">
            {loading ? "Cargando registros de peso..." : `Registros diarios - ${chartSeries.length} pacientes seleccionados`}
          </p>
        </div>
        {!loading && patients.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 w-full justify-between text-xs sm:w-64">
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
                          {checked && <Check className="h-3.5 w-3.5 text-primary" />}
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
      {loading || data.length === 0 || chartSeries.length === 0 ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
          {loading ? "Cargando datos..." : "No hay registros de peso para la semana seleccionada."}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" />
            <XAxis dataKey="semana" tick={{ fontSize: 11, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(0 0% 60%)" }} axisLine={false} tickLine={false} domain={["dataMin - 2", "dataMax + 2"]} unit=" kg" />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: "hsl(0 0% 60%)" }}
            />
            {chartSeries.map((name, index) => (
              <Line key={name} type="monotone" dataKey={name} stroke={colors[index % colors.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
