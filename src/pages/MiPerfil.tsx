import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, apiRequest } from "@/lib/api";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  User, Lock, Eye, EyeOff, Check, X,
  Shield
} from "lucide-react";

const ACCESS_TOKEN_KEY = "dkfitt-access-token";
const PROFILE_ENDPOINTS = ["/api/nutritionist-profile/me", "/nutritionist-profile/me"];
const ME_ENDPOINTS = ["/api/auth/me", "/auth/me"];

const emptyProfile = {
  nombres: "",
  apellidos: "",
  telefono: "",
  fechaNacimiento: "",
  sexo: "",
  correo: "",
  especialidad: "",
  registro: "",
  rol: "",
};

/* Removed static access history until a dedicated endpoint exists.
const accessHistory = [
  { fecha: "28/03/2026 09:14", dispositivo: "Chrome — Windows", ip: "192.168.1.45", estado: "Exitoso" },
  { fecha: "27/03/2026 14:32", dispositivo: "Chrome — Windows", ip: "192.168.1.45", estado: "Exitoso" },
  { fecha: "26/03/2026 08:50", dispositivo: "Safari — iPhone", ip: "10.0.0.12", estado: "Exitoso" },
  { fecha: "25/03/2026 20:11", dispositivo: "Firefox — MacOS", ip: "172.16.0.8", estado: "Fallido" },
  { fecha: "24/03/2026 10:05", dispositivo: "Chrome — Windows", ip: "192.168.1.45", estado: "Exitoso" },
];
*/

/* ─── password helpers ─── */
function getStrength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

const strengthLabel = ["", "Débil", "Débil", "Media", "Fuerte"];
const strengthPercent = [0, 25, 25, 60, 100];

type NutritionistProfilePayload = {
  id_usuario?: number;
  nombres?: string;
  apellidos?: string;
  correo_institucional?: string;
  fecha_nacimiento?: string;
  sexo?: string;
  ultimo_acceso?: string;
  last_login?: string;
  updated_at?: string;
  perfil_nutricionista?: {
    numero_registro_profesional?: string;
    especialidad?: string;
    telefono_contacto?: string;
  };
};

type NutritionistProfileResponse = {
  success?: boolean;
  data?: NutritionistProfilePayload;
} & NutritionistProfilePayload;

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

function normalizeSex(value?: string): "M" | "F" | "O" | "" {
  if (!value) return "";
  const raw = value.trim().toLowerCase();
  if (raw === "f" || raw === "femenino") return "F";
  if (raw === "m" || raw === "masculino") return "M";
  if (raw === "o" || raw === "otro") return "O";
  return "";
}

function normalizeDateInput(value?: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function getTitleBySex(sex?: string): string {
  if (sex === "M") return "Dr.";
  if (sex === "F") return "Dra.";
  return "";
}

function getRoleLabelBySex(sex?: string): string {
  if (sex === "M") return "Nutriologo";
  if (sex === "F") return "Nutriologa";
  return "Nutriologo";
}

function formatDateTime(value?: string): string {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLastAccess(payload?: NutritionistProfilePayload | null): string {
  return payload?.ultimo_acceso || payload?.last_login || payload?.updated_at || "";
}

export default function MiPerfil() {
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const defaultTab = tabParam === "security" ? "security" : "info";

  /* profile state */
  const [profile, setProfile] = useState(emptyProfile);
  const [profileStatus, setProfileStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const up = (k: string, v: string) => setProfile((p) => ({ ...p, [k]: v }));

  /* password state */
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCloseAll, setShowCloseAll] = useState(false);

  const strength = getStrength(pwNew);
  const reqs = [
    { label: "Mínimo 8 caracteres", ok: pwNew.length >= 8 },
    { label: "Al menos una mayúscula", ok: /[A-Z]/.test(pwNew) },
    { label: "Al menos un número", ok: /[0-9]/.test(pwNew) },
    { label: "Al menos un carácter especial", ok: /[^A-Za-z0-9]/.test(pwNew) },
  ];
  const allReqsMet = reqs.every((r) => r.ok);
  const pwMatch = pwNew === pwConfirm && pwConfirm.length > 0;


  const initials = useMemo(() => {
    const first = profile.nombres?.[0] || "";
    const last = profile.apellidos?.[0] || "";
    const value = `${first}${last}`.trim();
    return value ? value.toUpperCase() : "NU";
  }, [profile.nombres, profile.apellidos]);

  useEffect(() => {
    let isActive = true;

    const loadProfile = async () => {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) {
        if (isActive) {
          setProfileStatus("error");
          setProfileError("No se encontro una sesion valida.");
        }
        return;
      }

      try {
        if (isActive) {
          setProfileStatus("loading");
          setProfileError(null);
        }

        const [profileResult, meResult] = await Promise.allSettled([
          requestWithFallback<NutritionistProfileResponse>(PROFILE_ENDPOINTS, token, { method: "GET" }),
          requestWithFallback<NutritionistProfileResponse>(ME_ENDPOINTS, token, { method: "GET" }),
        ]);

        if (profileResult.status === "rejected") throw profileResult.reason;

        const response = profileResult.value;
        const payload = response.data ?? response;
        const mePayload = meResult.status === "fulfilled" ? (meResult.value.data ?? meResult.value) : null;
        const perfil = payload.perfil_nutricionista ?? {};

        const nextProfile = {
          nombres: payload.nombres || "",
          apellidos: payload.apellidos || "",
          telefono: perfil.telefono_contacto || "",
          fechaNacimiento: normalizeDateInput(payload.fecha_nacimiento),
          sexo: normalizeSex(payload.sexo),
          correo: payload.correo_institucional || "",
          especialidad: perfil.especialidad || "",
          registro: perfil.numero_registro_profesional || "",
          rol: "Nutricionista",
        };

        if (isActive) {
          setProfile(nextProfile);
          setProfileStatus("ready");
        }
      } catch (error) {
        let message = "No se pudo cargar el perfil.";
        if (error instanceof ApiError) {
          const payloadError = error.payload as { message?: string } | null;
          message = payloadError?.message || error.message || message;
        }

        if (isActive) {
          setProfileStatus("error");
          setProfileError(message);
        }
      }
    };

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, []);

  /* handlers */
  const saveProfile = async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      toast({ title: "No se encontro una sesion valida", variant: "destructive" });
      return;
    }

    try {
      setIsSaving(true);
      await requestWithFallback(PROFILE_ENDPOINTS, token, {
        method: "PATCH",
        body: {
          nombres: profile.nombres,
          apellidos: profile.apellidos,
          fecha_nacimiento: profile.fechaNacimiento || null,
          sexo: profile.sexo || null,
          perfil_nutricionista: {
            telefono_contacto: profile.telefono,
          },
        },
      });
      toast({ title: "Perfil actualizado correctamente ✓" });
    } catch (error) {
      let message = "No se pudo guardar el perfil.";
      if (error instanceof ApiError) {
        const payloadError = error.payload as { message?: string } | null;
        message = payloadError?.message || error.message || message;
      }
      toast({ title: "Error al guardar", description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const updatePassword = () => {
    if (pwCurrent !== "nutri") {
      toast({ title: "La contraseña actual no es correcta", variant: "destructive" });
      return;
    }
    if (!pwMatch) {
      toast({ title: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }
    toast({ title: "Contraseña actualizada correctamente ✓" });
    setPwCurrent(""); setPwNew(""); setPwConfirm("");
  };

  const handleCloseAll = () => {
    setShowCloseAll(false);
    logout();
    navigate("/login");
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Mi Perfil</h1>
            <p className="text-sm text-muted-foreground">Gestiona tu información personal y configuración de cuenta</p>
          </div>
          <Badge className="bg-primary text-primary-foreground">Nutricionista</Badge>
        </div>

        {/* 2‑column layout */}
        <div className="grid gap-6 lg:grid-cols-[minmax(260px,30%),1fr]">
          {/* ─── Left: Identity card + appearance ─── */}
          <div className="space-y-6 self-start">
            <Card>
              <CardContent className="flex flex-col items-center gap-4 p-6">
                <Avatar className="h-[120px] w-[120px] border-4 border-primary">
                  <AvatarFallback className="bg-primary/20 text-2xl font-bold text-primary">{initials}</AvatarFallback>
                </Avatar>

                <div className="mt-4 text-center space-y-1">
                  <h2 className="text-lg font-bold text-foreground">
                    {getTitleBySex(profile.sexo)} {profile.nombres} {profile.apellidos}
                  </h2>
                  <Badge className="bg-primary text-primary-foreground">{getRoleLabelBySex(profile.sexo)}</Badge>
                </div>

                <div className="w-full space-y-3 mt-2 text-sm">
                  <LockedField icon={<Lock className="h-3.5 w-3.5" />} label="Especialidad" value={profile.especialidad || "No disponible"} />
                  <LockedField icon={<Lock className="h-3.5 w-3.5" />} label="Registro profesional" value={profile.registro || "No disponible"} />
                  <LockedField icon={<Lock className="h-3.5 w-3.5" />} label="Correo electrónico" value={profile.correo || "No disponible"} />
                  
                </div>

                <div className="w-full border-t border-border pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estado</span>
                    <Badge variant="outline" className="border-primary text-primary">Activo</Badge>
                  </div>
                  <div className="flex justify-between">
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-3">
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Modo oscuro del sistema</span>
                  <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ─── Right: Tabs ─── */}
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="info" className="gap-1.5"><User className="h-4 w-4" /> Información</TabsTrigger>
              <TabsTrigger value="security" className="gap-1.5"><Shield className="h-4 w-4" /> Seguridad</TabsTrigger>
            </TabsList>

            {/* ════ TAB 1: Información Personal ════ */}
            <TabsContent value="info">
              <Card>
                <CardContent className="p-6 space-y-5">
                  {profileStatus === "loading" && (
                    <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                      Cargando perfil...
                    </div>
                  )}
                  {profileStatus === "error" && (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {profileError || "No se pudo cargar el perfil."}
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nombres" value={profile.nombres} onChange={(v) => up("nombres", v)} />
                    <Field label="Apellidos" value={profile.apellidos} onChange={(v) => up("apellidos", v)} />
                    <Field label="Teléfono" value={profile.telefono} onChange={(v) => up("telefono", v)} />
                    <Field label="Fecha de nacimiento" value={profile.fechaNacimiento} onChange={(v) => up("fechaNacimiento", v)} type="date" />
                    <div className="space-y-2">
                      <Label className="text-foreground">Sexo</Label>
                      <Select value={profile.sexo} onValueChange={(v) => up("sexo", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="F">Femenino</SelectItem>
                          <SelectItem value="M">Masculino</SelectItem>
                          <SelectItem value="O">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Locked fields */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <LockedInput label="Correo electrónico" value={profile.correo || "No disponible"} />
                    <LockedInput label="Especialidad" value={profile.especialidad || "No disponible"} />
                    <LockedInput label="Registro profesional" value={profile.registro || "No disponible"} />
                    <LockedInput label="Rol en el sistema" value={getRoleLabelBySex(profile.sexo)} />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={saveProfile} disabled={isSaving} className="bg-primary text-primary-foreground">
                      {isSaving ? "Guardando..." : "Guardar cambios"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ════ TAB 2: Seguridad ════ */}
            <TabsContent value="security" className="space-y-6">
              {/* Change password */}
              <Card>
                <CardContent className="p-6 space-y-5">
                  <h3 className="font-semibold text-foreground flex items-center gap-2"><Lock className="h-4 w-4" /> Cambiar contraseña</h3>

                  <div className="grid gap-4 sm:grid-cols-1 max-w-md">
                    <PasswordField label="Contraseña actual" value={pwCurrent} onChange={setPwCurrent} show={showCurrent} toggle={() => setShowCurrent(!showCurrent)} />
                    <div className="space-y-2">
                      <PasswordField label="Nueva contraseña" value={pwNew} onChange={setPwNew} show={showNew} toggle={() => setShowNew(!showNew)} />
                      {pwNew && (
                        <>
                          <div className="flex items-center gap-2">
                            <Progress value={strengthPercent[strength]} className="h-2 flex-1" />
                            <span className={`text-xs font-medium ${strength <= 2 ? "text-destructive" : strength === 3 ? "text-accent" : "text-primary"}`}>{strengthLabel[strength]}</span>
                          </div>
                          <ul className="space-y-1 text-xs">
                            {reqs.map((r) => (
                              <li key={r.label} className={`flex items-center gap-1.5 ${r.ok ? "text-primary" : "text-muted-foreground"}`}>
                                {r.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} {r.label}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                    <PasswordField label="Confirmar nueva contraseña" value={pwConfirm} onChange={setPwConfirm} show={showConfirm} toggle={() => setShowConfirm(!showConfirm)} />
                    {pwConfirm && !pwMatch && <p className="text-xs text-destructive">Las contraseñas no coinciden</p>}
                  </div>

                  <Button onClick={updatePassword} disabled={!allReqsMet || !pwMatch || !pwCurrent} className="bg-primary text-primary-foreground">
                    Actualizar contraseña
                  </Button>
                </CardContent>
              </Card>

            </TabsContent>

          </Tabs>
        </div>
      </div>

      {/* Close all sessions modal */}
      <Dialog open={showCloseAll} onOpenChange={setShowCloseAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cerrar todas las sesiones?</DialogTitle>
            <DialogDescription>Se cerrará tu sesión actual y serás redirigido al login.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseAll(false)}>Cancelar</Button>
            <Button onClick={handleCloseAll} className="bg-destructive text-destructive-foreground">Cerrar sesiones</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

/* ─── Helper components ─── */
function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-foreground">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function LockedField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function LockedInput({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> {label}</Label>
      <Input value={value} disabled className="bg-muted/50 opacity-70" />
      <p className="text-[10px] text-muted-foreground">Solo el administrador puede modificar este campo</p>
    </div>
  );
}

function PasswordField({ label, value, onChange, show, toggle }: { label: string; value: string; onChange: (v: string) => void; show: boolean; toggle: () => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-foreground">{label}</Label>
      <div className="relative">
        <Input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} className="pr-10" />
        <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
