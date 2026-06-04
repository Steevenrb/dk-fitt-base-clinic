import { AlertCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface DashboardPatient {
  name: string;
  adherence: "alto" | "medio" | "bajo" | "sin-plan";
  lastRecord: string;
  hasAlert: boolean;
}

const adherenceBadge = {
  alto: "bg-[#C5EB6F]/20 text-foreground border-[#C5EB6F]/50",
  medio: "bg-[#F7CA5E]/20 text-foreground border-[#F7CA5E]/50",
  bajo: "bg-[#FA9C5C]/20 text-foreground border-[#FA9C5C]/50",
  "sin-plan": "bg-muted text-muted-foreground border-border",
};

const adherenceLabel = { alto: "Alto", medio: "Medio", bajo: "Bajo", "sin-plan": "Sin plan" };

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "P";
}

export function PatientsTable({ patients = [], loading = false }: { patients?: DashboardPatient[]; loading?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[#E6E6E6]/90">
      <div className="flex items-center justify-between border-b border-border/70 bg-card px-4 py-3.5">
        <div>
          <h3 className="text-base font-semibold text-foreground">Vista Rapida de Pacientes</h3>
          <p className="text-sm text-muted-foreground">{loading ? "Cargando pacientes..." : `${patients.length} pacientes registrados`}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-border/70 bg-muted/30 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Paciente</th>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Adherencia</th>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Ultimo Registro</th>
              <th className="px-4 py-3 text-xs font-semibold text-muted-foreground">Alerta</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">Cargando pacientes...</td>
              </tr>
            )}
            {!loading && patients.map((p) => (
              <tr
                key={p.name}
                className={`border-b border-border/60 transition-colors duration-200 last:border-0 hover:bg-[#F7CA5E]/10 ${
                  p.adherence === "bajo" ? "bg-[#FA9C5C]/10" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7CA5E]/20 text-xs font-bold text-foreground ring-1 ring-[#F7CA5E]/40">
                      {getInitials(p.name)}
                    </div>
                    <span className="font-medium text-foreground">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={`text-[11px] ${adherenceBadge[p.adherence]}`}>
                    {adherenceLabel[p.adherence]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{p.lastRecord}</td>
                <td className="px-4 py-3">
                  {p.hasAlert ? (
                    p.adherence === "bajo" ? (
                      <AlertTriangle className="h-4 w-4 text-accent" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-[#7A9A18]" />
                    )
                  ) : (
                    <span className="text-xs text-muted-foreground">---</span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && patients.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">No hay pacientes para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
