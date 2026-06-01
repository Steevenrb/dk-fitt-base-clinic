import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, Boxes, Activity, ClipboardList, ClipboardX } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const ACCESS_TOKEN_KEY = "dkfitt-access-token";

type UserRow = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
  estado: string;
  fechaRegistro: string;
};

type PatientRow = {
  id: number;
  nombre: string;
  fechaRegistro: string;
  hasPlan: boolean;
};

type ActivityRow = {
  user: string;
  role: string;
  action: string;
  date: string;
};

type GrowthRow = {
  mes: string;
  pacientes: number;
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))",
};

function extractList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  if (Array.isArray(root.data)) return root.data as Record<string, unknown>[];
  if (Array.isArray(root.users)) return root.users as Record<string, unknown>[];
  if (Array.isArray(root.items)) return root.items as Record<string, unknown>[];
  if (Array.isArray(root.results)) return root.results as Record<string, unknown>[];
  if (Array.isArray(root.logs)) return root.logs as Record<string, unknown>[];

  const data = root.data;
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const keys = ["users", "usuarios", "items", "results", "rows", "logs", "activities"];
    for (const key of keys) {
      if (Array.isArray(obj[key])) return obj[key] as Record<string, unknown>[];
    }
  }

  return [];
}

function extractTotal(raw: unknown): number | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const root = raw as Record<string, unknown>;
  const candidates = [
    root.meta,
    root.pagination,
    root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>).meta : undefined,
    root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>).pagination : undefined,
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const total = Number((candidate as Record<string, unknown>).total ?? (candidate as Record<string, unknown>).count);
    if (Number.isFinite(total)) return total;
  }

  const total = Number(root.total ?? root.count);
  return Number.isFinite(total) ? total : undefined;
}

function normalizeRole(value: unknown): string {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "admin" || raw === "administrador") return "administrador";
  if (raw === "nutricionista") return "nutricionista";
  if (raw === "paciente") return "paciente";
  return raw || "sin-rol";
}

function roleLabel(value: string): string {
  if (value === "administrador") return "Admin";
  if (value === "nutricionista") return "Nutricionista";
  if (value === "paciente") return "Paciente";
  return value || "Sistema";
}

function normalizeStatus(item: Record<string, unknown>): string {
  if (typeof item.activo === "boolean") return item.activo ? "activo" : "inactivo";
  const raw = String(item.estado ?? item.estado_cuenta ?? item.status ?? item.account_status ?? "activo").toLowerCase();
  if (["activo", "active", "habilitado"].includes(raw)) return "activo";
  if (["inactivo", "inactive", "desactivado", "suspendido", "bloqueado"].includes(raw)) return "inactivo";
  return raw || "activo";
}

function getDateValue(item: Record<string, unknown>): string {
  return String(
    item.fecha_registro ??
    item.fecha_creacion ??
    item.created_at ??
    item.createdAt ??
    item.createdAt ??
    item.created_at_usuario ??
    item.fecha_alta ??
    item.registered_at ??
    item.fecha ??
    "",
  );
}

function parseDateValue(value: unknown): Date | null {
  if (!value) return null;
  const raw = String(value).trim();
  const slashDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashDate) {
    const [, day, month, year] = slashDate;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasNutritionPlan(item: Record<string, unknown>): boolean {
  const booleanValue = item.tiene_plan ?? item.tiene_plan_activo ?? item.has_plan ?? item.plan_activo;
  if (typeof booleanValue === "boolean") return booleanValue;
  if (item.id_plan ?? item.id_plan_nutricional ?? item.plan_id) return true;
  if (item.plan && typeof item.plan === "object") return true;

  const status = String(item.estado_plan ?? item.estado_tratamiento ?? item.plan_estado ?? "").toLowerCase();
  if (["activo", "pendiente", "suspendido", "finalizado"].includes(status)) return true;
  return false;
}

function mapUser(item: Record<string, unknown>): UserRow {
  const nombres = String(item.nombres ?? item.nombre ?? "").trim();
  const apellidos = String(item.apellidos ?? item.apellido ?? "").trim();
  const correo = String(item.correo_institucional ?? item.correo ?? item.email ?? "").trim();
  return {
    id: Number(item.id_usuario ?? item.id ?? 0),
    nombre: `${nombres} ${apellidos}`.trim() || correo || "Usuario",
    correo,
    rol: normalizeRole(item.rol ?? item.role),
    estado: normalizeStatus(item),
    fechaRegistro: getDateValue(item),
  };
}

function mapPatient(item: Record<string, unknown>, index: number): PatientRow {
  const nombres = String(item.nombres ?? item.nombre ?? "").trim();
  const apellidos = String(item.apellidos ?? "").trim();
  const nombre = `${nombres} ${apellidos}`.trim() || String(item.nombre_completo ?? item.name ?? "Paciente");
  return {
    id: Number(item.id_usuario ?? item.id_paciente ?? item.id_perfil ?? item.id ?? index + 1),
    nombre,
    fechaRegistro: getDateValue(item),
    hasPlan: hasNutritionPlan(item),
  };
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
    role: roleLabel(normalizeRole(item.rol ?? item.role ?? item.actor_role ?? item.tipo_usuario)),
    action: String(item.accion ?? item.action ?? item.descripcion ?? item.description ?? item.evento ?? item.message ?? "Actividad registrada"),
    date: formatDateTime(item.fecha ?? item.fecha_hora ?? item.created_at ?? item.createdAt ?? item.timestamp),
  };
}

function buildPatientGrowth(patients: PatientRow[]): GrowthRow[] {
  const labels = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return {
      endOfMonth,
      mes: date.toLocaleDateString("es-EC", { month: "short" }).replace(".", ""),
    };
  });

  return labels.map((label) => {
    const registeredInMonth = patients.filter((patient) => {
      const date = parseDateValue(patient.fechaRegistro);
      if (!date) return false;
      return date.getFullYear() === label.endOfMonth.getFullYear() && date.getMonth() === label.endOfMonth.getMonth();
    }).length;

    return {
      mes: label.mes,
      pacientes: registeredInMonth,
    };
  });
}

function countThisMonth(rows: Array<UserRow | PatientRow>): number {
  const now = new Date();
  return rows.filter((row) => {
    const date = parseDateValue(row.fechaRegistro);
    return !!date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }).length;
}

export default function DashboardAdmin() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [recipesCount, setRecipesCount] = useState(0);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) {
        setLoading(false);
        toast({ title: "Sesion no valida", description: "No se encontro token de acceso.", variant: "destructive" });
        return;
      }

      setLoading(true);
      try {
        const [usersRes, dishesRes, activityRes, patientsRes] = await Promise.allSettled([
          apiRequest<unknown>("/admin/users", { method: "GET", accessToken: token }),
          apiRequest<unknown>("/dishes?activo=true&page=1&limit=100", { method: "GET", accessToken: token }),
          apiRequest<unknown>("/admin/activity-logs", { method: "GET", accessToken: token }),
          apiRequest<unknown>("/patients", { method: "GET", accessToken: token }),
        ]);

        if (usersRes.status === "fulfilled") {
          setUsers(extractList(usersRes.value).map(mapUser));
        } else {
          setUsers([]);
        }

        if (dishesRes.status === "fulfilled") {
          setRecipesCount(extractTotal(dishesRes.value) ?? extractList(dishesRes.value).length);
        } else {
          setRecipesCount(0);
        }

        if (activityRes.status === "fulfilled") {
          setActivities(extractList(activityRes.value).map(mapActivity).slice(0, 7));
        } else {
          setActivities([]);
        }

        if (patientsRes.status === "fulfilled") {
          setPatients(extractList(patientsRes.value).map(mapPatient));
        } else {
          setPatients([]);
        }
      } catch {
        toast({ title: "No se pudo cargar dashboard", description: "Verifica los endpoints administrativos.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, [toast]);

  const nutritionists = useMemo(() => users.filter((user) => user.rol === "nutricionista"), [users]);
  const patientUsers = useMemo(() => users.filter((user) => user.rol === "paciente"), [users]);
  const patientsWithPlan = useMemo(() => patients.filter((patient) => patient.hasPlan), [patients]);
  const patientsWithoutPlan = useMemo(() => patients.filter((patient) => !patient.hasPlan), [patients]);
  const patientsForGrowth = useMemo(() => {
    const patientDates = patients.filter((patient) => parseDateValue(patient.fechaRegistro));
    if (patientDates.length > 0) return patients;

    return patientUsers.map((user) => ({
      id: user.id,
      nombre: user.nombre,
      fechaRegistro: user.fechaRegistro,
      hasPlan: false,
    }));
  }, [patientUsers, patients]);

  const kpis = useMemo(() => [
    { title: "Nutricionistas", value: nutritionists.length, icon: Users, trend: `${nutritionists.filter((n) => n.estado === "activo").length} activas` },
    { title: "Total pacientes", value: patients.length, icon: UserCheck, trend: `+${countThisMonth(patients)} este mes` },
    { title: "Pacientes con plan", value: patientsWithPlan.length, icon: ClipboardList, trend: patients.length ? `${Math.round((patientsWithPlan.length / patients.length) * 100)}% con plan` : "Sin pacientes" },
    { title: "Pacientes sin plan", value: patientsWithoutPlan.length, icon: ClipboardX, trend: patients.length ? `${Math.round((patientsWithoutPlan.length / patients.length) * 100)}% sin plan` : "Sin pacientes" },
    { title: "Cantidad de recetas", value: recipesCount, icon: Boxes, trend: "Catalogo actual" },
  ], [nutritionists, patients, patientsWithPlan.length, patientsWithoutPlan.length, recipesCount]);

  const patientGrowth = useMemo(() => buildPatientGrowth(patientsForGrowth), [patientsForGrowth]);
  const patientsByStatus = useMemo(() => [
    { name: "Con plan", value: patientsWithPlan.length, color: "hsl(var(--primary))" },
    { name: "Sin plan", value: patientsWithoutPlan.length, color: "hsl(var(--muted-foreground))" },
  ].filter((item) => item.value > 0), [patientsWithPlan.length, patientsWithoutPlan.length]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard del Administrador</h1>
          <p className="text-muted-foreground">Vista general del sistema DK Fitt con datos actuales</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {kpis.map((k) => (
            <Card key={k.title}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <k.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{loading ? "..." : k.value}</p>
                <p className="text-xs text-muted-foreground">{k.title}</p>
                <p className="text-xs text-primary mt-1">{loading ? "Cargando..." : k.trend}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Crecimiento de pacientes</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={patientGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="pacientes" name="Pacientes registrados" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Planes de pacientes</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center">
              {patientsByStatus.length === 0 ? (
                <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">No hay pacientes para mostrar.</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={patientsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={12}>
                      {patientsByStatus.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Actividad reciente del sistema</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 font-medium">Usuario</th>
                  <th className="text-left py-2 font-medium">Rol</th>
                  <th className="text-left py-2 font-medium">Accion</th>
                  <th className="text-left py-2 font-medium">Fecha y hora</th>
                </tr></thead>
                <tbody>
                  {activities.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">{loading ? "Cargando actividad..." : "No hay actividad reciente."}</td>
                    </tr>
                  ) : activities.map((a, i) => (
                    <tr key={`${a.user}-${a.date}-${i}`} className="border-b border-border/50">
                      <td className="py-2.5 text-foreground">{a.user}</td>
                      <td className="py-2.5"><Badge variant="outline" className="text-[10px]">{a.role}</Badge></td>
                      <td className="py-2.5 text-muted-foreground">{a.action}</td>
                      <td className="py-2.5 text-muted-foreground">{a.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
