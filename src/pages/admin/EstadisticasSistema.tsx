import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const pacientesPorNutri = [
  { nombre: "Karen L.", pacientes: 32 },
  { nombre: "Laura M.", pacientes: 28 },
  { nombre: "Carlos N.", pacientes: 22 },
  { nombre: "Ana R.", pacientes: 18 },
  { nombre: "Pedro S.", pacientes: 15 },
  { nombre: "Sofía G.", pacientes: 12 },
  { nombre: "Diego V.", pacientes: 10 },
  { nombre: "María P.", pacientes: 10 },
];

const accesosSemana = [
  { dia: "Lun", accesos: 45 }, { dia: "Mar", accesos: 52 },
  { dia: "Mié", accesos: 38 }, { dia: "Jue", accesos: 61 },
  { dia: "Vie", accesos: 55 }, { dia: "Sáb", accesos: 20 },
  { dia: "Dom", accesos: 12 },
];

const topNutris = [
  { nombre: "Karen López", pacientes: 32, planes: 28, adherencia: "87%" },
  { nombre: "Laura Martínez", pacientes: 28, planes: 25, adherencia: "92%" },
  { nombre: "Carlos Núñez", pacientes: 22, planes: 18, adherencia: "78%" },
  { nombre: "Ana Rodríguez", pacientes: 18, planes: 16, adherencia: "85%" },
];

const ts = { backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" };

export default function EstadisticasSistema() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estadísticas del Sistema</h1>
          <p className="text-muted-foreground">Métricas de uso y rendimiento de la plataforma</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Pacientes por nutricionista</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={pacientesPorNutri} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="nombre" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                  <Tooltip contentStyle={ts} />
                  <Bar dataKey="pacientes" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Accesos al sistema por día</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={accesosSemana}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={ts} />
                  <Line type="monotone" dataKey="accesos" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Nutricionistas más activas</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 font-medium">Nutricionista</th>
                  <th className="text-left py-2 font-medium">Pacientes</th>
                  <th className="text-left py-2 font-medium">Planes</th>
                  <th className="text-left py-2 font-medium">Adherencia promedio</th>
                </tr></thead>
                <tbody>{topNutris.map((n, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2.5 text-foreground font-medium">{n.nombre}</td>
                    <td className="py-2.5 text-primary font-semibold">{n.pacientes}</td>
                    <td className="py-2.5 text-muted-foreground">{n.planes}</td>
                    <td className="py-2.5 text-muted-foreground">{n.adherencia}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10"><span className="text-2xl">⚡</span></div>
            <div>
              <p className="text-sm text-muted-foreground">Disponibilidad del sistema</p>
              <p className="text-2xl font-bold text-primary">99.8%</p>
              <p className="text-xs text-muted-foreground">Último incidente: hace 45 días</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
