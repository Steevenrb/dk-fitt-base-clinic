import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useState } from "react";

const activities = [
  { user: "admin@dkfitt.com", rol: "Admin", accion: "Creó cuenta de nutricionista", ip: "192.168.1.100", fecha: "27/03/2026 08:30" },
  { user: "karen@dkfitt.com", rol: "Nutricionista", accion: "Inició sesión", ip: "10.0.0.45", fecha: "27/03/2026 09:15" },
  { user: "karen@dkfitt.com", rol: "Nutricionista", accion: "Registró nuevo paciente", ip: "10.0.0.45", fecha: "27/03/2026 09:30" },
  { user: "laura.m@dkfitt.com", rol: "Nutricionista", accion: "Creó plan nutricional", ip: "172.16.0.23", fecha: "26/03/2026 17:45" },
  { user: "admin@dkfitt.com", rol: "Admin", accion: "Desactivó cuenta de nutricionista", ip: "192.168.1.100", fecha: "26/03/2026 16:00" },
  { user: "carlos.n@dkfitt.com", rol: "Nutricionista", accion: "Actualizó ficha de paciente", ip: "10.0.0.78", fecha: "26/03/2026 14:10" },
  { user: "laura.m@dkfitt.com", rol: "Nutricionista", accion: "Agendó cita", ip: "172.16.0.23", fecha: "26/03/2026 11:20" },
  { user: "admin@dkfitt.com", rol: "Admin", accion: "Reseteó contraseña de usuario", ip: "192.168.1.100", fecha: "25/03/2026 15:40" },
  { user: "karen@dkfitt.com", rol: "Nutricionista", accion: "Generó reporte de seguimiento", ip: "10.0.0.45", fecha: "25/03/2026 13:00" },
  { user: "sistema", rol: "Admin", accion: "Backup automático completado", ip: "127.0.0.1", fecha: "25/03/2026 03:00" },
  { user: "admin@dkfitt.com", rol: "Admin", accion: "Modificó configuración del sistema", ip: "192.168.1.100", fecha: "24/03/2026 10:15" },
  { user: "carlos.n@dkfitt.com", rol: "Nutricionista", accion: "Cerró sesión", ip: "10.0.0.78", fecha: "24/03/2026 18:00" },
];

export default function HistorialActividad() {
  const [search, setSearch] = useState("");
  const [filterRol, setFilterRol] = useState("Todos");

  const filtered = activities.filter(a => {
    const matchSearch = a.user.toLowerCase().includes(search.toLowerCase()) || a.accion.toLowerCase().includes(search.toLowerCase());
    const matchRol = filterRol === "Todos" || a.rol === filterRol;
    return matchSearch && matchRol;
  });

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
            <Input placeholder="Buscar por usuario o acción..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterRol} onValueChange={setFilterRol}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos los roles</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="Nutricionista">Nutricionista</SelectItem>
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
                  <th className="text-left p-3 font-medium text-muted-foreground">Acción</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">IP</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Fecha y hora</th>
                </tr></thead>
                <tbody>
                  {filtered.map((a, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
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
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
