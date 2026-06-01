import { AlertTriangle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface DashboardPatient {
  name: string;
  adherence: "alto" | "medio" | "bajo" | "sin-plan";
  lastRecord: string;
  hasAlert: boolean;
}

const defaultPatients: DashboardPatient[] = [
  { name: "María García López", adherence: "alto", lastRecord: "22 Mar 2026", hasAlert: false },
  { name: "Carlos Ramírez Torres", adherence: "medio", lastRecord: "21 Mar 2026", hasAlert: true },
  { name: "Ana Lucía Mendoza", adherence: "alto", lastRecord: "22 Mar 2026", hasAlert: false },
  { name: "Jorge Eduardo Salinas", adherence: "bajo", lastRecord: "18 Mar 2026", hasAlert: true },
  { name: "Paola Fernández Ruiz", adherence: "bajo", lastRecord: "15 Mar 2026", hasAlert: true },
  { name: "Roberto Díaz Herrera", adherence: "medio", lastRecord: "20 Mar 2026", hasAlert: false },
  { name: "Laura Moreno Castro", adherence: "alto", lastRecord: "22 Mar 2026", hasAlert: false },
  { name: "Diego Martínez Vega", adherence: "bajo", lastRecord: "12 Mar 2026", hasAlert: true },
];

const adherenceBadge = {
  alto: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  medio: "bg-primary/15 text-primary border-primary/30",
  bajo: "bg-accent/20 text-accent border-accent/30",
  "sin-plan": "bg-muted text-muted-foreground border-border",
};

const adherenceLabel = { alto: "Alto", medio: "Medio", bajo: "Bajo", "sin-plan": "Sin plan" };

export function PatientsTable({ patients = defaultPatients, loading = false }: { patients?: DashboardPatient[]; loading?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Vista Rápida de Pacientes</h3>
          <p className="text-xs text-muted-foreground">{loading ? "Cargando pacientes..." : `${patients.length} pacientes registrados`}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Paciente</th>
              <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Adherencia</th>
              <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Último Registro</th>
              <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Alerta</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">Cargando pacientes...</td>
              </tr>
            )}
            {!loading && patients.map((p) => (
              <tr
                key={p.name}
                className={`border-b border-border transition-colors last:border-0 hover:bg-muted/30 ${
                  p.adherence === "bajo" ? "bg-accent/5" : ""
                }`}
              >
                <td className="px-5 py-3 font-medium text-foreground">{p.name}</td>
                <td className="px-5 py-3">
                  <Badge variant="outline" className={`text-[11px] ${adherenceBadge[p.adherence]}`}>
                    {adherenceLabel[p.adherence]}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-muted-foreground">{p.lastRecord}</td>
                <td className="px-5 py-3">
                  {p.hasAlert ? (
                    p.adherence === "bajo" ? (
                      <AlertTriangle className="h-4 w-4 text-accent" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-primary" />
                    )
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && patients.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">No hay pacientes para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
