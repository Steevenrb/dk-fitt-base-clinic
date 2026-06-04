import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Soup } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ACCESS_TOKEN_KEY = "dkfitt-access-token";
const PATIENTS_ENDPOINTS = ["/api/patients", "/patients", "/api/pacientes"];

function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function extractPatients(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  if (Array.isArray(root.data)) return root.data as Record<string, unknown>[];
  if (Array.isArray(root.patients)) return root.patients as Record<string, unknown>[];
  if (Array.isArray(root.pacientes)) return root.pacientes as Record<string, unknown>[];
  return [];
}

type TreatmentStatus = "activo" | "pendiente" | "suspendido" | "finalizado" | "sin-datos";

function normalizeStatus(value: unknown): TreatmentStatus {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "activo") return "activo";
  if (raw === "pendiente") return "pendiente";
  if (raw === "suspendido") return "suspendido";
  if (raw === "finalizado") return "finalizado";
  return "sin-datos";
}

const statusConfig: Record<TreatmentStatus, { label: string; className: string }> = {
  activo: { label: "Activo", className: "bg-[#F7CA5E]/25 text-foreground border-[#F7CA5E]/60" },
  pendiente: { label: "Pendiente", className: "bg-[#E6E6E6]/50 text-muted-foreground border-border" },
  suspendido: { label: "Suspendido", className: "bg-[#FA9C5C]/20 text-foreground border-[#FA9C5C]/50" },
  finalizado: { label: "Finalizado", className: "bg-[#C5EB6F]/20 text-foreground border-[#C5EB6F]/50" },
  "sin-datos": { label: "---", className: "bg-muted text-muted-foreground border-border" },
};

function mapApiPatient(item: Record<string, unknown>, index: number) {
  const nombres = String(item.nombres ?? item.nombre ?? "").trim();
  const apellidos = String(item.apellidos ?? "").trim();

  const fullName =
    `${nombres} ${apellidos}`.trim() ||
    String(item.nombre_completo ?? item.name ?? `Paciente ${index + 1}`);
  const id = Number(
    item.id_usuario ?? item.id_paciente ?? item.id_perfil ??item.id ?? index + 1
  );

  const rawDate = String(
    item.ultima_evaluacion ?? item.fecha_ultima_evaluacion ?? item.last_evaluation_date ?? ""
  );
  const lastRecord = rawDate
    ? new Date(rawDate).toLocaleDateString("es-EC", {
        day: "2-digit", month: "2-digit", year: "numeric",
      })
    : "--";
  const rawStatus =
    item.estado_plan ?? item.estado_tratamiento ?? item.estado ?? item.status ?? null;
  const status = normalizeStatus(rawStatus);
  return {
    id: Number(id), name: fullName, initials: toInitials(fullName), lastRecord, status,
  };
}

const PlanesIndex = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [patients, setPatients] = useState<Array<ReturnType<typeof mapApiPatient>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) {
        setLoading(false);
        setPatients([]);
        toast({ title: "Sesión no válida", description: "No se encontró token de acceso.", variant: "destructive" });
        return;
      }

      setLoading(true);
      let lastError: unknown = null;
      for (const path of PATIENTS_ENDPOINTS) {
        try {
          const res = await apiRequest<unknown>(path, { method: "GET", accessToken: token });
          const rows = extractPatients(res).map((r, i) => mapApiPatient(r, i));
          setPatients(rows);
          setLoading(false);
          return;
        } catch (err) {
          lastError = err;
        }
      }

      setPatients([]);
      setLoading(false);
      toast({ title: "No se pudo cargar pacientes", description: "Verifica que GET /patients esté disponible.", variant: "destructive" });
    };

    void fetchPatients();
  }, [toast]);

  return (
    <AppLayout>
      <div className="space-y-6 min-w-0">
        <div className="rounded-xl border border-border bg-card">
            <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-bold text-foreground">Planes Nutricionales</h3>
                <p className="mt-1 text-sm text-muted-foreground">Pacientes con seguimiento de plan</p>
                <p className="mt-2 text-xs text-muted-foreground">{patients.length} registrados</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-[#F7CA5E]/12">
                    <th className="px-5 py-3 text-center text-xs font-bold text-foreground">Paciente</th>
                    <th className="px-5 py-3 text-center text-xs font-bold text-foreground">Estado</th>
                    <th className="px-5 py-3 text-center text-xs font-bold text-foreground">Fecha en que se Genero el Plan</th>
                    <th className="px-5 py-3 text-center text-xs font-bold text-foreground">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center text-sm text-muted-foreground">Cargando pacientes...</td>
                    </tr>
                  )}

                  {!loading && patients.map((p) => (
                    <tr key={p.id} className="border-b border-border transition-colors last:border-0 hover:bg-[#F7CA5E]/8">
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F7CA5E]/25 text-xs font-bold text-foreground ring-1 ring-[#F7CA5E]/45">
                            {p.initials}
                          </span>
                          <p className="min-w-[150px] text-left font-medium text-foreground">{p.name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <Badge variant="outline" className={`text-[11px] ${statusConfig[p.status].className}`}>
                          {statusConfig[p.status].label}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-center text-muted-foreground">{p.lastRecord}</td>
                      <td className="px-5 py-4 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-xs text-muted-foreground hover:text-[#8A6B1F]"
                          onClick={() => navigate(`/planes/ver/${p.id}`)}
                        >
                          <Soup className="h-3.5 w-3.5" />
                          Ver Plan
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {!loading && patients.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center text-sm text-muted-foreground">No hay pacientes disponibles.</td>
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

export default PlanesIndex;
