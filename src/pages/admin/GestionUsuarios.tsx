import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, UserX, UserCheck, KeyRound, Copy, Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiRequest, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface UsuarioGestion {
  id: number;
  nombres: string;
  apellidos: string;
  nombre: string;
  correo: string;
  rol: "administrador" | "nutricionista" | "paciente" | string;
  estado: "activo" | "inactivo" | string;
  fechaRegistro: string;
  ultimoAcceso: string;
  avatar: string;
  registro: string;
  especialidad: string;
  telefono: string;
  sexo: "M" | "F" | "O" | "";
  fechaNac: string;
}

const ACCESS_TOKEN_KEY = "dkfitt-access-token";
const DEFAULT_TEMP_PASSWORD = "NutriTemp2024!";

const ADMIN_LIST_ENDPOINTS = ["/api/admin/users", "/admin/users", "/api/admin/usuarios", "/api/users"];
const CREATE_NUTRI_ENDPOINT = "/api/admin/nutritionists";
const UPDATE_USER_ENDPOINTS = ["/api/admin/users", "/admin/users", "/api/admin/usuarios"];

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function normalizeSexo(value?: string | null): "M" | "F" | "O" | "" {
  if (value === "M" || value === "F" || value === "O") return value;
  return "";
}

function normalizeEstadoCuenta(item: Record<string, unknown>): "activo" | "inactivo" | string {
  const raw = item.estado ?? item.estado_cuenta ?? item.status ?? item.account_status;
  if (typeof raw === "boolean") return raw ? "activo" : "inactivo";
  if (typeof item.activo === "boolean") return item.activo ? "activo" : "inactivo";
  const estado = String(raw ?? "activo").toLowerCase();
  if (["activo", "active", "habilitado"].includes(estado)) return "activo";
  if (["inactivo", "inactive", "desactivado", "suspendido", "bloqueado"].includes(estado)) return "inactivo";
  return estado || "activo";
}

function formatDateForInput(value?: unknown): string {
  if (!value) return "";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function getObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function cleanField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return text === "—" || text === "â€”" ? "" : text;
}

function roleLabel(role: string): string {
  if (role === "administrador") return "Administrador";
  if (role === "nutricionista") return "Nutricionista";
  if (role === "paciente") return "Paciente";
  return role;
}

function roleBadge(role: string) {
  if (role === "administrador") return <Badge className="bg-destructive/15 text-destructive border-destructive/30">Administrador</Badge>;
  if (role === "nutricionista") return <Badge className="bg-primary/20 text-primary border-primary/30">Nutricionista</Badge>;
  if (role === "paciente") return <Badge variant="secondary">Paciente</Badge>;
  return <Badge variant="outline">{role}</Badge>;
}

function calcAgeFromDate(fecha: string): number {
  const birth = new Date(fecha);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

type RequestWithAuth = Omit<RequestInit, "body"> & { body?: unknown };

async function requestWithFallback<T>(paths: string[], token: string, options: RequestWithAuth): Promise<T> {
  let lastError: unknown;
  for (const path of paths) {
    try {
      return await apiRequest<T>(path, {
        ...options,
        accessToken: token,
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function requestWithSuffixFallback<T>(basePaths: string[], suffix: string, token: string, options: RequestWithAuth): Promise<T> {
  let lastError: unknown;
  for (const basePath of basePaths) {
    try {
      return await apiRequest<T>(`${basePath}${suffix}`, {
        ...options,
        accessToken: token,
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function getAccessToken(): string | null {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token || token === "undefined" || token === "null") return null;
  return token;
}

function extractApiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "Error inesperado al comunicarse con la API.";
  const payload = error.payload as {
    message?: string | string[];
    error?: string | {
      code?: string;
      message?: string;
      details?: Array<{ field?: string; message?: string }>;
    };
    details?: string | string[];
    errors?: string | string[];
  } | null;
  if (Array.isArray(payload?.message) && payload?.message.length > 0) return payload.message.join(" | ");
  if (typeof payload?.message === "string" && payload.message.trim()) return payload.message;
  if (Array.isArray(payload?.details) && payload?.details.length > 0) return payload.details.join(" | ");
  if (typeof payload?.details === "string" && payload.details.trim()) return payload.details;
  if (Array.isArray(payload?.errors) && payload?.errors.length > 0) return payload.errors.join(" | ");
  if (typeof payload?.errors === "string" && payload.errors.trim()) return payload.errors;
  if (typeof payload?.error === "object" && payload.error) {
    const detailMsgs = Array.isArray(payload.error.details)
      ? payload.error.details
        .map((d) => [d.field, d.message].filter(Boolean).join(": "))
        .filter(Boolean)
      : [];
    if (detailMsgs.length > 0) return detailMsgs.join(" | ");
    if (typeof payload.error.message === "string" && payload.error.message.trim()) return payload.error.message;
  }
  if (typeof payload?.error === "string" && payload.error.trim()) return payload.error;
  return error.message || `HTTP ${error.status}`;
}

async function updateUserStatus(id: number, token: string, estado: "activo" | "inactivo") {
  return requestWithSuffixFallback(UPDATE_USER_ENDPOINTS, `/${id}/status`, token, {
    method: "PATCH",
    body: { estado },
  });
}

export default function GestionUsuarios() {
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<UsuarioGestion[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRol, setFilterRol] = useState("Todos");
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<UsuarioGestion | null>(null);
  const [showDeactivate, setShowDeactivate] = useState<UsuarioGestion | null>(null);
  const [showReset, setShowReset] = useState<UsuarioGestion | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successKind, setSuccessKind] = useState<"create" | "reset">("create");
  const [copied, setCopied] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState(DEFAULT_TEMP_PASSWORD);

  // Form
  const [fNombres, setFNombres] = useState("");
  const [fApellidos, setFApellidos] = useState("");
  const [fCorreo, setFCorreo] = useState("");
  const [fRegistro, setFRegistro] = useState("");
  const [fEspecialidad, setFEspecialidad] = useState("");
  const [fFechaNac, setFFechaNac] = useState("");
  const [fSexo, setFSexo] = useState<"M" | "F" | "O" | "">("");
  const [fTelefono, setFTelefono] = useState("");

  const filtered = useMemo(() => usuarios.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = u.nombre.toLowerCase().includes(q) || u.correo.toLowerCase().includes(q);
    const matchRol = filterRol === "Todos" || u.rol === filterRol;
    return matchSearch && matchRol;
  }), [usuarios, search, filterRol]);

  const clearForm = () => { setFNombres(""); setFApellidos(""); setFCorreo(""); setFRegistro(""); setFEspecialidad(""); setFFechaNac(""); setFSexo(""); setFTelefono(""); };

  const extractUsersFromResponse = (raw: unknown): Record<string, unknown>[] => {
    if (Array.isArray(raw)) return raw as Record<string, unknown>[];
    if (!raw || typeof raw !== "object") return [];

    const root = raw as Record<string, unknown>;
    const rootUsers = root.users;
    if (Array.isArray(rootUsers)) return rootUsers as Record<string, unknown>[];

    const data = root.data;
    if (!data) return [];
    if (Array.isArray(data)) return data as Record<string, unknown>[];
    if (typeof data !== "object") return [];

    const dataObj = data as Record<string, unknown>;
    const candidateKeys = ["users", "usuarios", "items", "results", "rows"];
    for (const key of candidateKeys) {
      const candidate = dataObj[key];
      if (Array.isArray(candidate)) {
        return candidate as Record<string, unknown>[];
      }
    }

    return [];
  };

  const mapApiUserToRow = (item: Record<string, unknown>): UsuarioGestion => {
    const nutricionistaProfile = getObject(item.perfil_nutricionista ?? item.nutricionista ?? item.nutritionist_profile);
    const perfil = getObject(item.perfil ?? item.profile);
    const datosPerfil = { ...perfil, ...nutricionistaProfile };
    const nombres = cleanField(item.nombres ?? item.nombre ?? datosPerfil.nombres ?? datosPerfil.nombre);
    const apellidos = cleanField(item.apellidos ?? item.apellido ?? datosPerfil.apellidos ?? datosPerfil.apellido);
    const correo = String(item.correo_institucional ?? item.correo ?? item.email ?? "");
    const rol = String(item.rol ?? item.role ?? "");
    const estado = normalizeEstadoCuenta(item);
    const nombre = `${nombres} ${apellidos}`.trim() || correo;
    const avatar = `${(nombres[0] || "")}${(apellidos[0] || "")}`.toUpperCase() || (correo[0]?.toUpperCase() || "U");

    return {
      id: Number(item.id_usuario ?? item.id ?? 0),
      nombres,
      apellidos,
      nombre,
      correo,
      rol,
      estado,
      fechaRegistro: formatDateTime(String(item.fecha_registro ?? item.created_at ?? "")),
      ultimoAcceso: formatDateTime(String(item.ultimo_acceso ?? item.last_login ?? item.updated_at ?? "")),
      avatar,
      registro: cleanField(datosPerfil.numero_registro_profesional ?? item.numero_registro_profesional ?? item.registro_profesional ?? item.registro),
      especialidad: cleanField(datosPerfil.especialidad ?? item.especialidad),
      telefono: cleanField(datosPerfil.telefono_contacto ?? datosPerfil.telefono ?? item.telefono_contacto ?? item.telefono),
      sexo: normalizeSexo(String(item.sexo ?? datosPerfil.sexo ?? "")),
      fechaNac: formatDateForInput(item.fecha_nacimiento ?? datosPerfil.fecha_nacimiento),
    };
  };

  const fetchUsers = async () => {
    const token = getAccessToken();
    if (!token) {
      setLoadingUsers(false);
      toast({ title: "Sesión no válida", description: "No se encontró token de acceso.", variant: "destructive" });
      return;
    }

    setLoadingUsers(true);
    try {
      const res = await requestWithFallback<unknown>(ADMIN_LIST_ENDPOINTS, token, { method: "GET" });
      const payload = extractUsersFromResponse(res);
      setUsuarios(payload.map((u) => mapApiUserToRow(u)));
    } catch (error) {
      const detail = error instanceof ApiError ? ` (${error.status} - ${error.message})` : "";
      toast({
        title: "No se pudo cargar usuarios",
        description: `Revisa endpoint y token de admin${detail}`,
        variant: "destructive",
      });
      setUsuarios([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const openEdit = (n: UsuarioGestion) => {
    setFNombres(n.nombres);
    setFApellidos(n.apellidos);
    setFCorreo(n.correo);
    setFRegistro(cleanField(n.registro));
    setFEspecialidad(cleanField(n.especialidad));
    setFFechaNac(n.fechaNac);
    setFSexo(n.sexo);
    setFTelefono(cleanField(n.telefono));
    setShowEdit(n);
  };

  const handleCreate = async () => {
    const token = getAccessToken();
    if (!token) {
      toast({ title: "Sesión no válida", description: "No se encontró token de acceso.", variant: "destructive" });
      return;
    }

    if (!fNombres || !fApellidos || !fCorreo || !fRegistro || !fFechaNac || !fSexo) {
      toast({ title: "Campos requeridos", description: "Completa nombres, apellidos, correo, registro, fecha de nacimiento y sexo.", variant: "destructive" });
      return;
    }

    const edad = calcAgeFromDate(fFechaNac);
    if (edad < 16 || edad > 99) {
      toast({ title: "Edad inválida", description: "La edad calculada debe estar entre 16 y 99 años.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        correo_institucional: fCorreo,
        contrasena_temporal: DEFAULT_TEMP_PASSWORD,
        nombres: fNombres,
        apellidos: fApellidos,
        edad,
        sexo: fSexo,
        fecha_nacimiento: fFechaNac,
        rol: "nutricionista",
        perfil_nutricionista: {
          numero_registro_profesional: fRegistro,
          especialidad: fEspecialidad || null,
          telefono_contacto: fTelefono || null,
        },
      };

      const res = await apiRequest<{ success?: boolean; data?: { temporary_password?: string }; temporary_password?: string }>(CREATE_NUTRI_ENDPOINT, {
        method: "POST",
        accessToken: token,
        body: payload,
      });

      const temporaryPassword = res?.data?.temporary_password || res?.temporary_password || DEFAULT_TEMP_PASSWORD;
      setGeneratedPassword(temporaryPassword);
      setSuccessKind("create");
      setShowCreate(false);
      clearForm();
      setShowSuccess(true);
      await fetchUsers();
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        console.error("Create nutritionist validation error payload:", error.payload);
      }
      if (error instanceof ApiError) {
        const detail = extractApiErrorMessage(error);
        toast({ title: `Error al crear cuenta (${error.status})`, description: detail, variant: "destructive" });
      } else {
        toast({ title: "Error al crear cuenta", description: "No se pudo crear nutricionista por un error inesperado.", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSave = async () => {
    if (!showEdit) return;
    const token = getAccessToken();
    if (!token) return;

    setIsSubmitting(true);
    try {
      await requestWithSuffixFallback(UPDATE_USER_ENDPOINTS, `/${showEdit.id}`, token, {
        method: "PATCH",
        body: {
          nombres: fNombres,
          apellidos: fApellidos,
          correo_institucional: fCorreo,
          correo: fCorreo,
          fecha_nacimiento: fFechaNac || undefined,
          sexo: fSexo || undefined,
          numero_registro_profesional: fRegistro || undefined,
          especialidad: fEspecialidad || undefined,
          telefono_contacto: fTelefono || undefined,
          perfil_nutricionista: {
            numero_registro_profesional: fRegistro || null,
            especialidad: fEspecialidad || null,
            telefono_contacto: fTelefono || null,
          },
        },
      });
      setShowEdit(null);
      clearForm();
      await fetchUsers();
    } catch (error) {
      const detail = error instanceof ApiError ? extractApiErrorMessage(error) : "Verifica que exista PATCH /api/admin/users/:id (o equivalente).";
      toast({ title: "No se pudo editar usuario", description: detail, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!showDeactivate) return;
    const token = getAccessToken();
    if (!token) return;

    const nextEstado = showDeactivate.estado === "inactivo" ? "activo" : "inactivo";
    setIsSubmitting(true);
    try {
      await updateUserStatus(showDeactivate.id, token, nextEstado);
      toast({
        title: nextEstado === "activo" ? "Cuenta activada" : "Cuenta desactivada",
        description: nextEstado === "activo"
          ? `${showDeactivate.nombre} ya puede acceder al sistema.`
          : `${showDeactivate.nombre} ya no podra acceder al sistema.`,
      });
      setShowDeactivate(null);
      await fetchUsers();
    } catch (error) {
      const detail = error instanceof ApiError ? extractApiErrorMessage(error) : "Verifica endpoint PATCH /api/admin/users/:id/status.";
      toast({ title: nextEstado === "activo" ? "No se pudo activar" : "No se pudo desactivar", description: detail, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!showReset) return;
    const token = getAccessToken();
    if (!token) return;

    setIsSubmitting(true);
    try {
      const res = await requestWithSuffixFallback<{
        success?: boolean;
        data?: { temporary_password?: string; contrasena_temporal?: string; password_temporal?: string };
        temporary_password?: string;
        contrasena_temporal?: string;
        password_temporal?: string;
      }>(UPDATE_USER_ENDPOINTS, `/${showReset.id}/reset-password`, token, {
        method: "POST",
      });
      setGeneratedPassword(
        res?.data?.temporary_password ||
        res?.data?.contrasena_temporal ||
        res?.data?.password_temporal ||
        res?.temporary_password ||
        res?.contrasena_temporal ||
        res?.password_temporal ||
        DEFAULT_TEMP_PASSWORD
      );
      setShowReset(null);
      setSuccessKind("reset");
      setShowSuccess(true);
      await fetchUsers();
    } catch (error) {
      const detail = error instanceof ApiError ? extractApiErrorMessage(error) : "Verifica endpoint POST /api/admin/users/:id/reset-password.";
      toast({ title: "No se pudo resetear contraseña", description: detail, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyPassword = () => { navigator.clipboard.writeText(generatedPassword); setCopied(true); setTimeout(() => setCopied(false), 2000); };

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
          <Select value={fSexo} onValueChange={(v) => setFSexo(v as "M" | "F" | "O")}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent><SelectItem value="F">Femenino</SelectItem><SelectItem value="M">Masculino</SelectItem><SelectItem value="O">Otro</SelectItem></SelectContent></Select>
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
            <p className="text-muted-foreground">Administra las cuentas de en el sistema</p>
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
          <Select value={filterRol} onValueChange={setFilterRol}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              <SelectItem value="administrador">Administrador</SelectItem>
              <SelectItem value="nutricionista">Nutricionista</SelectItem>
              <SelectItem value="paciente">Paciente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Nombre</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Correo</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Fecha de registro</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Rol</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Último acceso</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Acciones</th>
                </tr></thead>
                <tbody>
                  {loadingUsers ? (
                    <tr>
                      <td className="p-4 text-muted-foreground" colSpan={6}>Cargando usuarios...</td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td className="p-4 text-muted-foreground" colSpan={6}>No hay usuarios para mostrar.</td>
                    </tr>
                  ) : filtered.map(n => {
                    const isInactive = n.estado === "inactivo";
                    return (
                    <tr key={n.id} className={`border-b border-border/50 hover:bg-muted/20 ${isInactive ? "opacity-45 grayscale" : ""}`}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/20 text-primary text-xs">{n.avatar}</AvatarFallback></Avatar>
                          <div className="flex flex-col">
                            <span className="text-foreground font-medium">{n.nombre}</span>
                            {isInactive && <span className="text-xs text-muted-foreground">Cuenta inactiva</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{n.correo}</td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">{n.fechaRegistro}</td>
                      <td className="p-3">{roleBadge(n.rol)}</td>
                      <td className="p-3 text-muted-foreground hidden lg:table-cell">{n.ultimoAcceso}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {n.rol !== "paciente" && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={n.rol === "administrador" || isSubmitting} onClick={() => openEdit(n)} title="Editar"><Edit className="h-3.5 w-3.5" /></Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${isInactive ? "text-primary" : "text-destructive"}`}
                            disabled={n.rol === "administrador" || isSubmitting}
                            onClick={() => setShowDeactivate(n)}
                            title={isInactive ? "Activar" : "Desactivar"}
                          >
                            {isInactive ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={n.rol === "administrador" || isSubmitting} onClick={() => setShowReset(n)} title="Resetear contraseña"><KeyRound className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
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
          <DialogFooter><Button variant="outline" onClick={() => setShowCreate(false)} disabled={isSubmitting}>Cancelar</Button><Button onClick={handleCreate} className="bg-primary text-primary-foreground" disabled={isSubmitting}>Crear cuenta</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      <Dialog open={!!showEdit} onOpenChange={() => setShowEdit(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar nutricionista</DialogTitle><DialogDescription>Modifica los datos de {showEdit?.nombre}</DialogDescription></DialogHeader>
          {formFields}
          <DialogFooter><Button variant="outline" onClick={() => setShowEdit(null)} disabled={isSubmitting}>Cancelar</Button><Button onClick={handleEditSave} className="bg-primary text-primary-foreground" disabled={isSubmitting}>Guardar cambios</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success modal */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{successKind === "create" ? "Cuenta creada exitosamente" : "Contraseña reseteada"}</DialogTitle>
            <DialogDescription>Se ha generado una contraseña temporal para el usuario.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 p-3 rounded-md bg-muted border border-border">
            <code className="flex-1 text-sm font-mono text-foreground">{generatedPassword}</code>
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
          <DialogFooter><Button variant="outline" onClick={() => setShowDeactivate(null)} disabled={isSubmitting}>Cancelar</Button><Button onClick={handleDeactivate} className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={isSubmitting}>{showDeactivate?.estado === "inactivo" ? "Activar" : "Desactivar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password modal */}
      <Dialog open={!!showReset} onOpenChange={() => setShowReset(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resetear contraseña</DialogTitle><DialogDescription>Se enviará una nueva contraseña temporal al correo {showReset?.correo}</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setShowReset(null)} disabled={isSubmitting}>Cancelar</Button><Button onClick={handleResetPassword} className="bg-primary text-primary-foreground" disabled={isSubmitting}>Confirmar reset</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
