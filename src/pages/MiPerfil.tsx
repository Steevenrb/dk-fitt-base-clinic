import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  User, Lock, Settings, Camera, Eye, EyeOff, Check, X,
  Monitor, Globe, Bell, Clock, Shield
} from "lucide-react";

/* ─── mock data ─── */
const initialProfile = {
  nombres: "Carolina",
  apellidos: "Méndez",
  telefono: "+593 987 123 456",
  fechaNacimiento: "1990-07-22",
  sexo: "Femenino",
  bio: "Nutricionista clínica especializada en trastornos metabólicos y nutrición deportiva.",
  correo: "carolina.mendez@dkfitt.com",
  especialidad: "Nutrición Clínica",
  registro: "NUT-2024-0892",
  rol: "Nutricionista",
};

const accessHistory = [
  { fecha: "28/03/2026 09:14", dispositivo: "Chrome — Windows", ip: "192.168.1.45", estado: "Exitoso" },
  { fecha: "27/03/2026 14:32", dispositivo: "Chrome — Windows", ip: "192.168.1.45", estado: "Exitoso" },
  { fecha: "26/03/2026 08:50", dispositivo: "Safari — iPhone", ip: "10.0.0.12", estado: "Exitoso" },
  { fecha: "25/03/2026 20:11", dispositivo: "Firefox — MacOS", ip: "172.16.0.8", estado: "Fallido" },
  { fecha: "24/03/2026 10:05", dispositivo: "Chrome — Windows", ip: "192.168.1.45", estado: "Exitoso" },
];

const notifDefaults: Record<string, boolean> = {
  adherencia: true,
  citas: true,
  consumo: false,
  resumen: true,
  peso: true,
};

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
const strengthColor = ["", "bg-destructive", "bg-destructive", "bg-accent", "bg-primary"];
const strengthPercent = [0, 25, 25, 60, 100];

export default function MiPerfil() {
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "info";

  /* profile state */
  const [profile, setProfile] = useState(initialProfile);
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

  /* preferences */
  const [notifs, setNotifs] = useState(notifDefaults);
  const [timezone, setTimezone] = useState("America/Guayaquil");

  /* handlers */
  const saveProfile = () => toast({ title: "Perfil actualizado correctamente ✓" });

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

  const savePreferences = () => toast({ title: "Preferencias guardadas ✓" });

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
          {/* ─── Left: Identity card ─── */}
          <Card className="self-start">
            <CardContent className="flex flex-col items-center gap-4 p-6">
              <div className="relative">
                <Avatar className="h-[120px] w-[120px] border-4 border-primary">
                  <AvatarFallback className="bg-primary/20 text-2xl font-bold text-primary">CM</AvatarFallback>
                </Avatar>
                <Button size="sm" variant="secondary" className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs gap-1">
                  <Camera className="h-3 w-3" /> Cambiar foto
                </Button>
              </div>

              <div className="mt-4 text-center space-y-1">
                <h2 className="text-lg font-bold text-foreground">Dra. {profile.nombres} {profile.apellidos}</h2>
                <Badge className="bg-primary text-primary-foreground">Nutricionista</Badge>
              </div>

              <div className="w-full space-y-3 mt-2 text-sm">
                <LockedField icon={<Lock className="h-3.5 w-3.5" />} label="Especialidad" value={profile.especialidad} />
                <LockedField icon={<Lock className="h-3.5 w-3.5" />} label="Registro profesional" value={profile.registro} />
                <LockedField icon={<Lock className="h-3.5 w-3.5" />} label="Correo electrónico" value={profile.correo} />
                <p className="text-[11px] text-muted-foreground text-center">Para modificar estos datos contacta al administrador</p>
              </div>

              <div className="w-full border-t border-border pt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estado</span>
                  <Badge variant="outline" className="border-primary text-primary">Activo</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Último acceso</span>
                  <span className="text-foreground">Hoy, 09:14 AM</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ─── Right: Tabs ─── */}
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="info" className="gap-1.5"><User className="h-4 w-4" /> Información</TabsTrigger>
              <TabsTrigger value="security" className="gap-1.5"><Shield className="h-4 w-4" /> Seguridad</TabsTrigger>
              <TabsTrigger value="prefs" className="gap-1.5"><Settings className="h-4 w-4" /> Preferencias</TabsTrigger>
            </TabsList>

            {/* ════ TAB 1: Información Personal ════ */}
            <TabsContent value="info">
              <Card>
                <CardContent className="p-6 space-y-5">
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
                          <SelectItem value="Femenino">Femenino</SelectItem>
                          <SelectItem value="Masculino">Masculino</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground">Descripción profesional</Label>
                    <Textarea value={profile.bio} onChange={(e) => up("bio", e.target.value)} rows={3} />
                  </div>

                  {/* Locked fields */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <LockedInput label="Correo electrónico" value={profile.correo} />
                    <LockedInput label="Especialidad" value={profile.especialidad} />
                    <LockedInput label="Registro profesional" value={profile.registro} />
                    <LockedInput label="Rol en el sistema" value={profile.rol} />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={saveProfile} className="bg-primary text-primary-foreground">Guardar cambios</Button>
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

              {/* Active sessions */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2"><Monitor className="h-4 w-4" /> Sesiones activas</h3>
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-3">
                      <Monitor className="h-5 w-5 text-primary" />
                      <div className="text-sm">
                        <p className="font-medium text-foreground">Navegador web — Chrome</p>
                        <p className="text-muted-foreground">IP: 192.168.1.45 · Inicio: 28/03/2026 09:14</p>
                      </div>
                    </div>
                    <Badge className="bg-primary text-primary-foreground">Sesión actual</Badge>
                  </div>
                  <Button variant="outline" className="text-destructive border-destructive/30" onClick={() => setShowCloseAll(true)}>
                    Cerrar todas las sesiones
                  </Button>
                </CardContent>
              </Card>

              {/* Access history */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold text-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> Historial de accesos</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="text-left py-2 pr-4">Fecha y hora</th>
                          <th className="text-left py-2 pr-4">Dispositivo</th>
                          <th className="text-left py-2 pr-4">IP</th>
                          <th className="text-left py-2">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accessHistory.map((a, i) => (
                          <tr key={i} className="border-b border-border/50">
                            <td className="py-2 pr-4 text-foreground">{a.fecha}</td>
                            <td className="py-2 pr-4 text-foreground">{a.dispositivo}</td>
                            <td className="py-2 pr-4 text-muted-foreground">{a.ip}</td>
                            <td className="py-2">
                              <Badge variant={a.estado === "Fallido" ? "destructive" : "outline"} className={a.estado === "Fallido" ? "bg-accent text-accent-foreground" : "border-primary text-primary"}>
                                {a.estado}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ════ TAB 3: Preferencias ════ */}
            <TabsContent value="prefs">
              <Card>
                <CardContent className="p-6 space-y-8">
                  {/* Appearance */}
                  <section className="space-y-4">
                    <h3 className="font-semibold text-foreground">Apariencia</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Modo oscuro</span>
                      <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">Idioma</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary text-primary-foreground">Español</Badge>
                        <Badge variant="outline" className="opacity-50">English <span className="ml-1 text-[10px]">Próximamente</span></Badge>
                      </div>
                    </div>
                  </section>

                  {/* Notifications */}
                  <section className="space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2"><Bell className="h-4 w-4" /> Notificaciones</h3>
                    {[
                      { key: "adherencia", label: "Alertas de baja adherencia de pacientes" },
                      { key: "citas", label: "Recordatorio de citas del día" },
                      { key: "consumo", label: "Notificaciones de consumo adicional elevado" },
                      { key: "resumen", label: "Resumen semanal de pacientes" },
                      { key: "peso", label: "Alertas de cambios de peso importantes" },
                    ].map((n) => (
                      <div key={n.key} className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{n.label}</span>
                        <Switch checked={notifs[n.key]} onCheckedChange={(v) => setNotifs((prev) => ({ ...prev, [n.key]: v }))} />
                      </div>
                    ))}
                  </section>

                  {/* Timezone */}
                  <section className="space-y-4">
                    <h3 className="font-semibold text-foreground">Zona horaria</h3>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Guayaquil">América/Guayaquil (UTC-5)</SelectItem>
                        <SelectItem value="America/Bogota">América/Bogotá (UTC-5)</SelectItem>
                        <SelectItem value="America/Lima">América/Lima (UTC-5)</SelectItem>
                        <SelectItem value="America/Mexico_City">América/Ciudad de México (UTC-6)</SelectItem>
                        <SelectItem value="America/Santiago">América/Santiago (UTC-3)</SelectItem>
                        <SelectItem value="America/Argentina/Buenos_Aires">América/Buenos Aires (UTC-3)</SelectItem>
                        <SelectItem value="Europe/Madrid">Europa/Madrid (UTC+1)</SelectItem>
                      </SelectContent>
                    </Select>
                  </section>

                  <div className="flex justify-end">
                    <Button onClick={savePreferences} className="bg-primary text-primary-foreground">Guardar preferencias</Button>
                  </div>
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
