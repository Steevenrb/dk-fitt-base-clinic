import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ACCESS_TOKEN_KEY = "dkfitt-access-token";
const ACTIVITY_ENDPOINT = "/admin/activity-logs";

type ActivityRow = {
  user: string;
  rol: string;
  accion: string;
  ip: string;
  fecha: string;
};

function extractList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  if (Array.isArray(root.data)) return root.data as Record<string, unknown>[];
  if (Array.isArray(root.activities)) return root.activities as Record<string, unknown>[];
  if (Array.isArray(root.logs)) return root.logs as Record<string, unknown>[];
  if (Array.isArray(root.items)) return root.items as Record<string, unknown>[];
  if (root.data && typeof root.data === "object") {
    const data = root.data as Record<string, unknown>;
    if (Array.isArray(data.activities)) return data.activities as Record<string, unknown>[];
    if (Array.isArray(data.logs)) return data.logs as Record<string, unknown>[];
    if (Array.isArray(data.items)) return data.items as Record<string, unknown>[];
    if (Array.isArray(data.results)) return data.results as Record<string, unknown>[];
  }
  return [];
}

function normalizeRole(value: unknown): string {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "admin" || raw === "administrador") return "Admin";
  if (raw === "nutricionista") return "Nutricionista";
  if (raw === "paciente") return "Paciente";
  return String(value ?? "—") || "—";
}

function formatDateTime(value: unknown): string {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapActivity(item: Record<string, unknown>): ActivityRow {
  const user =
    String(item.usuario ?? item.user ?? item.email ?? item.correo ?? item.actor_email ?? item.actor ?? "").trim()
    || "sistema";
  return {
    user,
    rol: normalizeRole(item.rol ?? item.role ?? item.actor_role ?? item.tipo_usuario),
    accion: String(item.accion ?? item.action ?? item.descripcion ?? item.description ?? item.evento ?? item.message ?? "Actividad registrada"),
    ip: String(item.ip ?? item.ip_address ?? item.direccion_ip ?? "—"),
    fecha: formatDateTime(item.fecha ?? item.fecha_hora ?? item.created_at ?? item.createdAt ?? item.timestamp),
  };
}

export default function HistorialActividad() {
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRol, setFilterRol] = useState("Todos");

  useEffect(() => {
    const loadActivities = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) {
        setLoading(false);
        toast({ title: "Sesion no valida", description: "No se encontro token de acceso.", variant: "destructive" });
        return;
      }

      setLoading(true);
      try {
        const response = await apiRequest<unknown>(ACTIVITY_ENDPOINT, {
          method: "GET",
          accessToken: token,
        });
        setActivities(extractList(response).map(mapActivity));
      } catch {
        setActivities([]);
        toast({
          title: "No se pudo cargar historial",
          description: "Verifica el endpoint de historial de actividad de administrador.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void loadActivities();
  }, [toast]);

  const roles = useMemo(() => {
    const unique = Array.from(new Set(activities.map((activity) => activity.rol).filter(Boolean)));
    return unique.length > 0 ? unique : ["Admin", "Nutricionista"];
  }, [activities]);

  const filtered = useMemo(() => activities.filter((a) => {
    const query = search.toLowerCase();
    const matchSearch = a.user.toLowerCase().includes(query) || a.accion.toLowerCase().includes(query);
    const matchRol = filterRol === "Todos" || a.rol === filterRol;
    return matchSearch && matchRol;
  }), [activities, filterRol, search]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Historial de Actividad</h1>
          <p className="text-muted-foreground">Registro completo de acciones realizadas en el sistema</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por usuario o accion..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterRol} onValueChange={setFilterRol}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos los roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role} value={role}>{role}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Usuario</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Rol</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Accion</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">IP</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Fecha y hora</th>
                </tr></thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">Cargando historial...</td>
                    </tr>
                  )}

                  {!loading && filtered.map((a, i) => (
                    <tr key={`${a.user}-${a.fecha}-${i}`} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-3 text-foreground">{a.user}</td>
                      <td className="p-3">
                        <Badge variant={a.rol === "Admin" ? "default" : "secondary"} className={a.rol === "Admin" ? "bg-primary/20 text-primary border-primary/30" : ""}>
                          {a.rol}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{a.accion}</td>
                      <td className="p-3 text-muted-foreground font-mono text-xs hidden md:table-cell">{a.ip}</td>
                      <td className="p-3 text-muted-foreground">{a.fecha}</td>
                    </tr>
                  ))}

                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">No hay actividades para mostrar.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
