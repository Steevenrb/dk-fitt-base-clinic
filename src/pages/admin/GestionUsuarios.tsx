import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, UserX, KeyRound, Copy, Check } from "lucide-react";
import { useState } from "react";

interface Nutricionista {
  id: number;
  nombre: string;
  correo: string;
  registro: string;
  especialidad: string;
  estado: "Activo" | "Inactivo" | "Pendiente";
  ultimoAcceso: string;
  avatar: string;
  telefono: string;
  sexo: string;
  fechaNac: string;
}

const initialNutris: Nutricionista[] = [
  { id: 1, nombre: "Karen López", correo: "karen@dkfitt.com", registro: "NUT-2024-001", especialidad: "Nutrición clínica", estado: "Activo", ultimoAcceso: "27/03/2026 09:15", avatar: "KL", telefono: "+593 987 111 222", sexo: "Femenino", fechaNac: "1990-05-12" },
  { id: 2, nombre: "Laura Martínez", correo: "laura.m@dkfitt.com", registro: "NUT-2024-002", especialidad: "Nutrición deportiva", estado: "Activo", ultimoAcceso: "26/03/2026 17:45", avatar: "LM", telefono: "+593 987 333 444", sexo: "Femenino", fechaNac: "1988-11-03" },
  { id: 3, nombre: "Carlos Núñez", correo: "carlos.n@dkfitt.com", registro: "NUT-2023-015", especialidad: "Nutrición pediátrica", estado: "Inactivo", ultimoAcceso: "20/03/2026 10:30", avatar: "CN", telefono: "+593 987 555 666", sexo: "Masculino", fechaNac: "1985-07-20" },
  { id: 4, nombre: "Ana Rodríguez", correo: "ana.r@gmail.com", registro: "NUT-2026-003", especialidad: "Nutrición clínica", estado: "Pendiente", ultimoAcceso: "—", avatar: "AR", telefono: "+593 987 777 888", sexo: "Femenino", fechaNac: "1995-02-14" },
];

export default function GestionUsuarios() {
  const [nutris, setNutris] = useState<Nutricionista[]>(initialNutris);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<Nutricionista | null>(null);
  const [showDeactivate, setShowDeactivate] = useState<Nutricionista | null>(null);
  const [showReset, setShowReset] = useState<Nutricionista | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form
  const [fNombres, setFNombres] = useState("");
  const [fApellidos, setFApellidos] = useState("");
  const [fCorreo, setFCorreo] = useState("");
  const [fRegistro, setFRegistro] = useState("");
  const [fEspecialidad, setFEspecialidad] = useState("");
  const [fFechaNac, setFFechaNac] = useState("");
  const [fSexo, setFSexo] = useState("");
  const [fTelefono, setFTelefono] = useState("");

  const filtered = nutris.filter(n => {
    const matchSearch = n.nombre.toLowerCase().includes(search.toLowerCase()) || n.correo.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filterEstado === "Todos" || n.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  const clearForm = () => { setFNombres(""); setFApellidos(""); setFCorreo(""); setFRegistro(""); setFEspecialidad(""); setFFechaNac(""); setFSexo(""); setFTelefono(""); };

  const openEdit = (n: Nutricionista) => {
    const [first, ...rest] = n.nombre.split(" ");
    setFNombres(first);
    setFApellidos(rest.join(" "));
    setFCorreo(n.correo);
    setFRegistro(n.registro);
    setFEspecialidad(n.especialidad);
    setFFechaNac(n.fechaNac);
    setFSexo(n.sexo);
    setFTelefono(n.telefono);
    setShowEdit(n);
  };

  const handleCreate = () => {
    const newN: Nutricionista = {
      id: Date.now(), nombre: `${fNombres} ${fApellidos}`, correo: fCorreo, registro: fRegistro,
      especialidad: fEspecialidad, estado: "Activo", ultimoAcceso: "—",
      avatar: `${fNombres[0] || ""}${fApellidos[0] || ""}`.toUpperCase(), telefono: fTelefono, sexo: fSexo, fechaNac: fFechaNac,
    };
    setNutris(p => [...p, newN]);
    setShowCreate(false);
    clearForm();
    setShowSuccess(true);
  };

  const handleEditSave = () => {
    if (!showEdit) return;
    setNutris(p => p.map(n => n.id === showEdit.id ? { ...n, nombre: `${fNombres} ${fApellidos}`, correo: fCorreo, registro: fRegistro, especialidad: fEspecialidad, fechaNac: fFechaNac, sexo: fSexo, telefono: fTelefono } : n));
    setShowEdit(null);
    clearForm();
  };

  const handleDeactivate = () => {
    if (!showDeactivate) return;
    setNutris(p => p.map(n => n.id === showDeactivate.id ? { ...n, estado: "Inactivo" } : n));
    setShowDeactivate(null);
  };

  const copyPassword = () => { navigator.clipboard.writeText("NutriTemp2024"); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const estadoBadge = (e: string) => {
    if (e === "Activo") return <Badge className="bg-primary/20 text-primary border-primary/30">{e}</Badge>;
    if (e === "Inactivo") return <Badge variant="secondary">{e}</Badge>;
    return <Badge className="bg-accent/20 text-accent-foreground border-accent/30">{e}</Badge>;
  };

  const formFields = (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Nombres</Label><Input value={fNombres} onChange={e => setFNombres(e.target.value)} /></div>
        <div className="space-y-1"><Label>Apellidos</Label><Input value={fApellidos} onChange={e => setFApellidos(e.target.value)} /></div>
      </div>
      <div className="space-y-1"><Label>Correo electrónico</Label><Input value={fCorreo} onChange={e => setFCorreo(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Registro profesional</Label><Input value={fRegistro} onChange={e => setFRegistro(e.target.value)} /></div>
        <div className="space-y-1"><Label>Especialidad</Label><Input value={fEspecialidad} onChange={e => setFEspecialidad(e.target.value)} placeholder="Ej: Nutrición clínica" /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1"><Label>Fecha de nacimiento</Label><Input type="date" value={fFechaNac} onChange={e => setFFechaNac(e.target.value)} /></div>
        <div className="space-y-1">
          <Label>Sexo</Label>
          <Select value={fSexo} onValueChange={setFSexo}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent><SelectItem value="Femenino">Femenino</SelectItem><SelectItem value="Masculino">Masculino</SelectItem><SelectItem value="Otro">Otro</SelectItem></SelectContent></Select>
        </div>
        <div className="space-y-1"><Label>Teléfono</Label><Input value={fTelefono} onChange={e => setFTelefono(e.target.value)} /></div>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h1>
            <p className="text-muted-foreground">Administra las cuentas de nutricionistas en el sistema</p>
          </div>
          <Button onClick={() => { clearForm(); setShowCreate(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />Crear nutricionista
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre o correo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              <SelectItem value="Activo">Activo</SelectItem>
              <SelectItem value="Inactivo">Inactivo</SelectItem>
              <SelectItem value="Pendiente">Pendiente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Nutricionista</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Correo</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Registro</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Especialidad</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Último acceso</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Acciones</th>
                </tr></thead>
                <tbody>
                  {filtered.map(n => (
                    <tr key={n.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/20 text-primary text-xs">{n.avatar}</AvatarFallback></Avatar>
                          <span className="text-foreground font-medium">{n.nombre}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{n.correo}</td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">{n.registro}</td>
                      <td className="p-3 text-muted-foreground hidden lg:table-cell">{n.especialidad}</td>
                      <td className="p-3">{estadoBadge(n.estado)}</td>
                      <td className="p-3 text-muted-foreground hidden lg:table-cell">{n.ultimoAcceso}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(n)} title="Editar"><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setShowDeactivate(n)} title="Desactivar"><UserX className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowReset(n)} title="Resetear contraseña"><KeyRound className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Crear nutricionista</DialogTitle><DialogDescription>Completa los datos del nuevo profesional</DialogDescription></DialogHeader>
          {formFields}
          <DialogFooter><Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button><Button onClick={handleCreate} className="bg-primary text-primary-foreground">Crear cuenta</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={!!showEdit} onOpenChange={() => setShowEdit(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar nutricionista</DialogTitle><DialogDescription>Modifica los datos de {showEdit?.nombre}</DialogDescription></DialogHeader>
          {formFields}
          <DialogFooter><Button variant="outline" onClick={() => setShowEdit(null)}>Cancelar</Button><Button onClick={handleEditSave} className="bg-primary text-primary-foreground">Guardar cambios</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success modal */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cuenta creada exitosamente</DialogTitle><DialogDescription>Se ha generado una contraseña temporal para el nuevo usuario.</DialogDescription></DialogHeader>
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted border border-border">
            <code className="flex-1 text-sm font-mono text-foreground">NutriTemp2024</code>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyPassword}>
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">El usuario deberá cambiarla en su primer inicio de sesión.</p>
          <DialogFooter><Button onClick={() => setShowSuccess(false)} className="bg-primary text-primary-foreground">Entendido</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate modal */}
      <Dialog open={!!showDeactivate} onOpenChange={() => setShowDeactivate(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>¿Desactivar cuenta?</DialogTitle><DialogDescription>¿Estás seguro de que deseas desactivar la cuenta de {showDeactivate?.nombre}? Esta acción impedirá su acceso al sistema.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setShowDeactivate(null)}>Cancelar</Button><Button onClick={handleDeactivate} className="bg-accent text-accent-foreground hover:bg-accent/90">Desactivar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password modal */}
      <Dialog open={!!showReset} onOpenChange={() => setShowReset(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resetear contraseña</DialogTitle><DialogDescription>Se enviará una nueva contraseña temporal al correo {showReset?.correo}</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setShowReset(null)}>Cancelar</Button><Button onClick={() => { setShowReset(null); setShowSuccess(true); }} className="bg-primary text-primary-foreground">Confirmar reset</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
