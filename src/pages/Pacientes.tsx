import { useState, useMemo } from "react";
import { Search, UserPlus, AlertTriangle, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TreatmentStatus = "activo" | "pendiente" | "suspendido" | "finalizado";
type AdherenceLevel = "alto" | "medio" | "bajo";

interface Patient {
  id: number;
  name: string;
  initials: string;
  status: TreatmentStatus;
  adherence: AdherenceLevel;
  lastEvaluation: string;
  alerts: number;
  diagnosis: string;
}

const patients: Patient[] = [
  { id: 1, name: "María García López", initials: "MG", status: "activo", adherence: "alto", lastEvaluation: "22 Mar 2026", alerts: 0, diagnosis: "Obesidad grado I" },
  { id: 2, name: "Carlos Ramírez Torres", initials: "CR", status: "activo", adherence: "medio", lastEvaluation: "21 Mar 2026", alerts: 1, diagnosis: "Diabetes tipo 2" },
  { id: 3, name: "Ana Lucía Mendoza", initials: "AM", status: "activo", adherence: "alto", lastEvaluation: "22 Mar 2026", alerts: 0, diagnosis: "Dislipidemia mixta" },
  { id: 4, name: "Jorge Eduardo Salinas", initials: "JS", status: "suspendido", adherence: "bajo", lastEvaluation: "18 Mar 2026", alerts: 3, diagnosis: "Hígado graso" },
  { id: 5, name: "Paola Fernández Ruiz", initials: "PF", status: "activo", adherence: "bajo", lastEvaluation: "15 Mar 2026", alerts: 2, diagnosis: "Síndrome metabólico" },
  { id: 6, name: "Roberto Díaz Herrera", initials: "RD", status: "pendiente", adherence: "medio", lastEvaluation: "20 Mar 2026", alerts: 0, diagnosis: "Hipertensión arterial" },
  { id: 7, name: "Laura Moreno Castro", initials: "LM", status: "activo", adherence: "alto", lastEvaluation: "22 Mar 2026", alerts: 0, diagnosis: "Control de peso" },
  { id: 8, name: "Diego Martínez Vega", initials: "DM", status: "finalizado", adherence: "bajo", lastEvaluation: "12 Mar 2026", alerts: 4, diagnosis: "Desnutrición proteica" },
];

const statusConfig: Record<TreatmentStatus, { label: string; className: string }> = {
  activo: { label: "Activo", className: "bg-primary/15 text-primary border-primary/30" },
  pendiente: { label: "Pendiente", className: "bg-muted text-muted-foreground border-border" },
  suspendido: { label: "Suspendido", className: "bg-accent/20 text-accent border-accent/30" },
  finalizado: { label: "Finalizado", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
};

const adherenceConfig: Record<AdherenceLevel, { label: string; className: string }> = {
  alto: { label: "Alto", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  medio: { label: "Medio", className: "bg-primary/15 text-primary border-primary/30" },
  bajo: { label: "Bajo", className: "bg-accent/20 text-accent border-accent/30" },
};

function PacientesTopBarContent({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  adherenceFilter,
  onAdherenceChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  adherenceFilter: string;
  onAdherenceChange: (v: string) => void;
}) {
  return (
    <div className="hidden md:flex items-center gap-3 flex-1 min-w-0">
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar paciente por nombre..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-muted pl-9 text-sm placeholder:text-muted-foreground"
        />
      </div>
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-40 bg-muted text-sm">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos los estados</SelectItem>
          <SelectItem value="activo">Activo</SelectItem>
          <SelectItem value="pendiente">Pendiente</SelectItem>
          <SelectItem value="suspendido">Suspendido</SelectItem>
          <SelectItem value="finalizado">Finalizado</SelectItem>
        </SelectContent>
      </Select>
      <Select value={adherenceFilter} onValueChange={onAdherenceChange}>
        <SelectTrigger className="w-40 bg-muted text-sm">
          <SelectValue placeholder="Adherencia" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Toda adherencia</SelectItem>
          <SelectItem value="alto">Alto</SelectItem>
          <SelectItem value="medio">Medio</SelectItem>
          <SelectItem value="bajo">Bajo</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

const Pacientes = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [adherenceFilter, setAdherenceFilter] = useState("todos");

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "todos" || p.status === statusFilter;
      const matchesAdherence = adherenceFilter === "todos" || p.adherence === adherenceFilter;
      return matchesSearch && matchesStatus && matchesAdherence;
    });
  }, [search, statusFilter, adherenceFilter]);

  return (
    <AppLayout
      topBarContent={
        <PacientesTopBarContent
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          adherenceFilter={adherenceFilter}
          onAdherenceChange={setAdherenceFilter}
        />
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Gestión de Pacientes</h1>
            <p className="text-sm text-muted-foreground">Monitoreo y seguimiento nutricional</p>
          </div>
          <Button className="gap-2">
            <UserPlus className="h-4 w-4" />
            Nuevo Paciente
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <p className="text-xs text-muted-foreground">
              {filtered.length} de {patients.length} pacientes
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Paciente</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Estado</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Adherencia</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Última Evaluación</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Alertas</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const sc = statusConfig[p.status];
                  const ac = adherenceConfig[p.adherence];
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-border transition-colors last:border-0 hover:bg-muted/30 ${
                        p.adherence === "bajo" ? "bg-accent/5" : ""
                      }`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-border">
                            <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
                              {p.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.diagnosis}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={`text-[11px] ${sc.className}`}>
                          {sc.label}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={`text-[11px] ${ac.className}`}>
                          {ac.label}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{p.lastEvaluation}</td>
                      <td className="px-5 py-3">
                        {p.alerts > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4 text-accent" />
                            <span className="text-xs font-semibold text-accent">{p.alerts}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-primary" onClick={() => navigate(`/pacientes/${p.id}`)}>
                          <Eye className="h-3.5 w-3.5" />
                          Ver detalle
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      No se encontraron pacientes con los filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Pacientes;
