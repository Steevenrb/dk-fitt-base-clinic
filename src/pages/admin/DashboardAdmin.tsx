import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, ClipboardList, UserPlus } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const kpis = [
  { title: "Nutricionistas activas", value: 8, icon: Users, trend: "+2 este mes" },
  { title: "Total pacientes", value: 147, icon: UserCheck, trend: "+12 este mes" },
  { title: "Planes activos", value: 89, icon: ClipboardList, trend: "60% cobertura" },
  { title: "Cuentas pendientes", value: 3, icon: UserPlus, trend: "Por aprobar", accent: true },
];

const monthlyData = [
  { mes: "Ene", nutricionistas: 3, pacientes: 45 },
  { mes: "Feb", nutricionistas: 4, pacientes: 58 },
  { mes: "Mar", nutricionistas: 5, pacientes: 72 },
  { mes: "Abr", nutricionistas: 5, pacientes: 89 },
  { mes: "May", nutricionistas: 6, pacientes: 105 },
  { mes: "Jun", nutricionistas: 7, pacientes: 120 },
  { mes: "Jul", nutricionistas: 8, pacientes: 147 },
];

const recentActivity = [
  { user: "karen@dkfitt.com", action: "Inició sesión", date: "27/03/2026 09:15" },
  { user: "admin@dkfitt.com", action: "Creó nueva nutricionista", date: "27/03/2026 08:30" },
  { user: "laura.m@dkfitt.com", action: "Registró plan nutricional", date: "26/03/2026 17:45" },
  { user: "sistema", action: "Nueva cuenta solicitada: ana.r@gmail.com", date: "26/03/2026 15:20" },
  { user: "carlos.n@dkfitt.com", action: "Actualizó ficha de paciente", date: "26/03/2026 14:10" },
  { user: "sistema", action: "Backup automático completado", date: "26/03/2026 03:00" },
];

export default function DashboardAdmin() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard del Administrador</h1>
          <p className="text-muted-foreground">Vista general del sistema DK Fitt</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Nutricionistas registradas por mes</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                  <Bar dataKey="nutricionistas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Crecimiento de pacientes</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                  <Line type="monotone" dataKey="pacientes" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Actividad reciente del sistema</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 font-medium">Usuario</th>
                  <th className="text-left py-2 font-medium">Acción</th>
                  <th className="text-left py-2 font-medium">Fecha y hora</th>
                </tr></thead>
                <tbody>
                  {recentActivity.map((a, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2.5 text-foreground">{a.user}</td>
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
