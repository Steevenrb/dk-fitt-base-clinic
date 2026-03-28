import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, ClipboardList, UserPlus, Activity, Heart } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const kpis = [
  { title: "Nutricionistas activas", value: 8, icon: Users, trend: "+2 este mes" },
  { title: "Total pacientes", value: 147, icon: UserCheck, trend: "+12 este mes" },
  { title: "Pacientes activos", value: 132, icon: Heart, trend: "89.8% activos" },
  { title: "Planes activos", value: 89, icon: ClipboardList, trend: "60% cobertura" },
  { title: "Cuentas pendientes", value: 3, icon: UserPlus, trend: "Por aprobar", accent: true },
];

const monthlyData = [
  { mes: "Ene", nutricionistas: 3, pacientes: 45, pacientesNuevos: 12 },
  { mes: "Feb", nutricionistas: 4, pacientes: 58, pacientesNuevos: 13 },
  { mes: "Mar", nutricionistas: 5, pacientes: 72, pacientesNuevos: 14 },
  { mes: "Abr", nutricionistas: 5, pacientes: 89, pacientesNuevos: 17 },
  { mes: "May", nutricionistas: 6, pacientes: 105, pacientesNuevos: 16 },
  { mes: "Jun", nutricionistas: 7, pacientes: 120, pacientesNuevos: 15 },
  { mes: "Jul", nutricionistas: 8, pacientes: 147, pacientesNuevos: 27 },
];

const patientsByStatus = [
  { name: "Activos", value: 132, color: "hsl(var(--primary))" },
  { name: "Inactivos", value: 10, color: "hsl(var(--muted-foreground))" },
  { name: "En evaluación", value: 5, color: "hsl(var(--accent))" },
];

const patientsByNutritionist = [
  { nutricionista: "Karen S.", pacientes: 28 },
  { nutricionista: "Laura M.", pacientes: 24 },
  { nutricionista: "Carlos N.", pacientes: 22 },
  { nutricionista: "Ana R.", pacientes: 19 },
  { nutricionista: "María P.", pacientes: 18 },
  { nutricionista: "Diego L.", pacientes: 16 },
  { nutricionista: "Sofía V.", pacientes: 12 },
  { nutricionista: "Pedro G.", pacientes: 8 },
];

const recentActivity = [
  { user: "karen@dkfitt.com", role: "Nutricionista", action: "Registró nuevo paciente: Juan Pérez", date: "28/03/2026 09:15" },
  { user: "admin@dkfitt.com", role: "Admin", action: "Creó nueva nutricionista", date: "28/03/2026 08:30" },
  { user: "laura.m@dkfitt.com", role: "Nutricionista", action: "Registró plan nutricional para María López", date: "27/03/2026 17:45" },
  { user: "sistema", role: "Sistema", action: "Nueva cuenta de paciente solicitada: ana.r@gmail.com", date: "27/03/2026 15:20" },
  { user: "carlos.n@dkfitt.com", role: "Nutricionista", action: "Actualizó ficha de paciente: Roberto García", date: "27/03/2026 14:10" },
  { user: "sistema", role: "Sistema", action: "3 pacientes con alerta de adherencia baja", date: "27/03/2026 10:00" },
  { user: "sistema", role: "Sistema", action: "Backup automático completado", date: "27/03/2026 03:00" },
];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))",
};

export default function DashboardAdmin() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard del Administrador</h1>
          <p className="text-muted-foreground">Vista general del sistema DK Fitt — nutricionistas y pacientes</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {kpis.map((k) => (
            <Card key={k.title}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <k.icon className="h-5 w-5 text-primary" />
                  </div>
                  {k.accent && <Badge className="bg-accent text-accent-foreground text-[10px]">{k.value}</Badge>}
                </div>
                <p className="text-2xl font-bold text-foreground">{k.value}</p>
                <p className="text-xs text-muted-foreground">{k.title}</p>
                <p className="text-xs text-primary mt-1">{k.trend}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Crecimiento: nutricionistas y pacientes</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="pacientes" name="Pacientes" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                  <Line type="monotone" dataKey="nutricionistas" name="Nutricionistas" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: "hsl(var(--accent))" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Pacientes por nutricionista</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={patientsByNutritionist} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="nutricionista" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={80} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="pacientes" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Nuevos pacientes por mes</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="pacientesNuevos" name="Nuevos pacientes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Estado de pacientes</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
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
            </CardContent>
          </Card>
        </div>

        {/* Recent activity */}
        <Card>
          <CardHeader><CardTitle className="text-base">Actividad reciente del sistema</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 font-medium">Usuario</th>
                  <th className="text-left py-2 font-medium">Rol</th>
                  <th className="text-left py-2 font-medium">Acción</th>
                  <th className="text-left py-2 font-medium">Fecha y hora</th>
                </tr></thead>
                <tbody>
                  {recentActivity.map((a, i) => (
                    <tr key={i} className="border-b border-border/50">
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
