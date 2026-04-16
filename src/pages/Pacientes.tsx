import { useEffect, useMemo, useState } from "react";
import { Search, Eye } from "lucide-react";
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
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type TreatmentStatus = "activo" | "pendiente" | "suspendido" | "finalizado" | "sin-datos";
type AdherenceLevel = "alto" | "medio" | "bajo" | "sin-datos";

interface Patient {
  id: number;
  name: string;
  initials: string;
  status: TreatmentStatus;
  adherence: AdherenceLevel;
  lastEvaluation: string;
  alerts: string;
}

const ACCESS_TOKEN_KEY = "dkfitt-access-token";
const PATIENTS_ENDPOINTS = ["/api/patients", "/patients", "/api/pacientes"];

interface PatientsApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  total_pages?: number;
}

const statusConfig: Record<TreatmentStatus, { label: string; className: string }> = {
  activo: { label: "Activo", className: "bg-primary/15 text-primary border-primary/30" },
  pendiente: { label: "Pendiente", className: "bg-muted text-muted-foreground border-border" },
  suspendido: { label: "Suspendido", className: "bg-accent/20 text-accent border-accent/30" },
  finalizado: { label: "Finalizado", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  "sin-datos": { label: "---", className: "bg-muted text-muted-foreground border-border" },
};

const adherenceConfig: Record<AdherenceLevel, { label: string; className: string }> = {
  alto: { label: "Alto", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  medio: { label: "Medio", className: "bg-primary/15 text-primary border-primary/30" },
  bajo: { label: "Bajo", className: "bg-accent/20 text-accent border-accent/30" },
  "sin-datos": { label: "---", className: "bg-muted text-muted-foreground border-border" },
};

function normalizeStatus(value: unknown): TreatmentStatus {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "activo") return "activo";
  if (raw === "pendiente") return "pendiente";
  if (raw === "suspendido") return "suspendido";
  if (raw === "finalizado") return "finalizado";
  return "sin-datos";
}

function normalizeAdherence(value: unknown): AdherenceLevel {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "alto" || raw === "alta") return "alto";
  if (raw === "medio" || raw === "media") return "medio";
  if (raw === "bajo" || raw === "baja") return "bajo";
  return "sin-datos";
}

function formatDate(value: unknown): string {
  if (!value) return "---";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "---";
  return date.toLocaleDateString("es-EC", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function toInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

async function requestWithFallback<T>(paths: string[], token: string): Promise<T> {
  let lastError: unknown;
  for (const path of paths) {
    try {
      return await apiRequest<T>(path, {
        method: "GET",
        accessToken: token,
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function extractPatients(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (!raw || typeof raw !== "object") return [];

  const root = raw as Record<string, unknown>;
  if (Array.isArray(root.data)) return root.data as Record<string, unknown>[];
  if (Array.isArray(root.patients)) return root.patients as Record<string, unknown>[];
  if (Array.isArray(root.pacientes)) return root.pacientes as Record<string, unknown>[];

  if (root.data && typeof root.data === "object") {
    const data = root.data as Record<string, unknown>;
    if (Array.isArray(data.patients)) return data.patients as Record<string, unknown>[];
    if (Array.isArray(data.pacientes)) return data.pacientes as Record<string, unknown>[];
    if (Array.isArray(data.items)) return data.items as Record<string, unknown>[];
    if (Array.isArray(data.results)) return data.results as Record<string, unknown>[];
  }

  return [];
}

function extractMeta(raw: unknown): PatientsApiMeta {
  if (!raw || typeof raw !== "object") return {};
  const root = raw as Record<string, unknown>;
  if (root.meta && typeof root.meta === "object") return root.meta as PatientsApiMeta;
  if (root.data && typeof root.data === "object") {
    const data = root.data as Record<string, unknown>;
    if (data.meta && typeof data.meta === "object") return data.meta as PatientsApiMeta;
  }
  return {};
}

function mapApiPatient(item: Record<string, unknown>, index: number): Patient {
  const nombres = String(item.nombres ?? item.nombre ?? "").trim();
  const apellidos = String(item.apellidos ?? "").trim();
  const fullName = `${nombres} ${apellidos}`.trim() || String(item.nombre_completo ?? item.name ?? "Paciente");

  const status = normalizeStatus(item.estado_tratamiento ?? item.estado_plan ?? item.estado);
  const adherence = normalizeAdherence(item.nivel_adherencia ?? item.adherencia ?? item.adherence_level);
  const lastEvaluation = formatDate(item.ultima_evaluacion ?? item.fecha_ultima_evaluacion ?? item.last_evaluation_date);

  const alertsCount = Number(item.alertas ?? item.alert_count ?? item.alerts_count);
  const alerts = Number.isFinite(alertsCount) && alertsCount >= 0 ? String(alertsCount) : "---";

  return {
    id: Number(item.id_usuario ?? item.id_paciente ?? item.id_perfil ?? item.id ?? index + 1),
    name: fullName,
    initials: toInitials(fullName),
    status,
    adherence,
    lastEvaluation,
    alerts,
  };
}

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
  const navigate = useNavigate();
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [totalPatients, setTotalPatients] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [adherenceFilter, setAdherenceFilter] = useState("todos");

  useEffect(() => {
    const fetchPatients = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) {
        setLoading(false);
        setPatients([]);
        toast({ title: "Sesion no valida", description: "No se encontro token de acceso.", variant: "destructive" });
        return;
      }

      setLoading(true);
      try {
        const response = await requestWithFallback<unknown>(PATIENTS_ENDPOINTS, token);
        const rows = extractPatients(response).map((item, index) => mapApiPatient(item, index));
        const meta = extractMeta(response);
        setPatients(rows);
        setTotalPatients(typeof meta.total === "number" ? meta.total : rows.length);
      } catch {
        setPatients([]);
        setTotalPatients(0);
        toast({
          title: "No se pudo cargar pacientes",
          description: "Verifica que el endpoint GET /patients este disponible para nutricionista.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void fetchPatients();
  }, [toast]);

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "todos" || p.status === statusFilter;
      const matchesAdherence = adherenceFilter === "todos" || p.adherence === adherenceFilter;
      return matchesSearch && matchesStatus && matchesAdherence;
    });
  }, [patients, search, statusFilter, adherenceFilter]);

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Gestion de Pacientes</h1>
            <p className="text-sm text-muted-foreground">Monitoreo y seguimiento nutricional</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <p className="text-xs text-muted-foreground">
              {filtered.length} de {totalPatients} pacientes
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Paciente</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Estado</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Adherencia</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Ultima Evaluacion</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Alertas</th>
                  <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Accion</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      Cargando pacientes...
                    </td>
                  </tr>
                )}

                {!loading && filtered.map((p) => {
                  const sc = statusConfig[p.status];
                  const ac = adherenceConfig[p.adherence];

                  return (
                    <tr key={p.id} className="border-b border-border transition-colors last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-border">
                            <AvatarFallback className="bg-muted text-xs font-semibold text-foreground">
                              {p.initials}
                            </AvatarFallback>
                          </Avatar>
                          <p className="font-medium text-foreground">{p.name}</p>
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
                        <span className="text-xs text-muted-foreground">{p.alerts}</span>
                      </td>
                      <td className="px-5 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs text-muted-foreground hover:text-primary"
                          onClick={() => navigate(`/pacientes/${p.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver detalles
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {!loading && filtered.length === 0 && (
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
