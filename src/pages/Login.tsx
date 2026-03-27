import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, UserPlus, CheckCircle, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});

  // Register
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    const errs: { email?: string; password?: string } = {};
    if (!loginEmail.trim()) errs.email = "Este campo es obligatorio";
    if (!loginPassword.trim()) errs.password = "Este campo es obligatorio";
    setLoginErrors(errs);
    setLoginError("");
    if (Object.keys(errs).length) return;

    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const result = login(loginEmail, loginPassword);
    setLoading(false);

    if (result.success) {
      if (loginEmail === "admin") navigate("/admin");
      else navigate("/");
    } else {
      setLoginError(result.error || "Error desconocido");
    }
  };

  const getPasswordStrength = (p: string) => {
    if (p.length < 4) return { label: "Débil", color: "bg-destructive", w: "w-1/3" };
    if (p.length < 8) return { label: "Media", color: "bg-[hsl(var(--accent-amber))]", w: "w-2/3" };
    return { label: "Fuerte", color: "bg-primary", w: "w-full" };
  };

  const handleRegister = async () => {
    const errs: Record<string, string> = {};
    if (!regFirstName.trim()) errs.firstName = "Este campo es obligatorio";
    if (!regLastName.trim()) errs.lastName = "Este campo es obligatorio";
    if (!regEmail.trim()) errs.email = "Este campo es obligatorio";
    if (!regPassword.trim()) errs.password = "Este campo es obligatorio";
    if (regPassword !== regConfirm) errs.confirm = "Las contraseñas no coinciden";
    setRegErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setRegistered(true);
  };

  const switchToLogin = () => {
    setIsLogin(true);
    setRegistered(false);
  };

  const strength = getPasswordStrength(regPassword);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 25% 25%, hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative z-10 text-center space-y-6">
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary">
              <span className="text-2xl font-bold text-primary-foreground">DK</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground">
            DK <span className="text-primary">Fitt</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-sm">
            Plataforma clínica de nutrición profesional
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">DK</span>
            </div>
            <span className="text-lg font-bold text-foreground">DK <span className="text-primary">Fitt</span></span>
          </div>

          {isLogin ? (
            /* LOGIN FORM */
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold text-foreground">Iniciar sesión</h2>
                <p className="text-sm text-muted-foreground">Accede a tu plataforma clínica</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Correo electrónico</Label>
                  <Input
                    placeholder="correo@dkfitt.com"
                    value={loginEmail}
                    onChange={e => { setLoginEmail(e.target.value); setLoginErrors(p => ({ ...p, email: undefined })); }}
                    className={loginErrors.email ? "border-destructive" : ""}
                  />
                  {loginErrors.email && <p className="text-xs text-destructive">{loginErrors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Contraseña</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={e => { setLoginPassword(e.target.value); setLoginErrors(p => ({ ...p, password: undefined })); }}
                      className={loginErrors.password ? "border-destructive pr-10" : "pr-10"}
                      onKeyDown={e => e.key === "Enter" && handleLogin()}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {loginErrors.password && <p className="text-xs text-destructive">{loginErrors.password}</p>}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox id="remember" />
                    <Label htmlFor="remember" className="text-sm cursor-pointer">Recordarme</Label>
                  </div>
                  <button className="text-xs text-primary hover:underline">¿Olvidaste tu contraseña?</button>
                </div>

                {loginError && (
                  <div className="rounded-md bg-accent/20 border border-accent p-3 text-sm text-accent-foreground">
                    {loginError}
                  </div>
                )}

                <Button onClick={handleLogin} disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11">
                  {loading ? <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" /> : <><LogIn className="h-4 w-4 mr-2" />Iniciar sesión</>}
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">¿No tienes cuenta?</span></div>
              </div>

              <Button variant="outline" onClick={() => setIsLogin(false)} className="w-full">
                <UserPlus className="h-4 w-4 mr-2" />Regístrate aquí
              </Button>
            </div>
          ) : registered ? (
            /* REGISTERED MESSAGE */
            <div className="space-y-6 animate-in fade-in duration-300 text-center">
              <CheckCircle className="h-16 w-16 text-primary mx-auto" />
              <h2 className="text-xl font-bold text-foreground">Solicitud enviada</h2>
              <p className="text-sm text-muted-foreground">
                El administrador revisará tu cuenta y recibirás tus credenciales por correo electrónico.
              </p>
              <Button onClick={switchToLogin} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <ArrowLeft className="h-4 w-4 mr-2" />Volver al inicio de sesión
              </Button>
            </div>
          ) : (
            /* REGISTER FORM */
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold text-foreground">Crear cuenta</h2>
                <p className="text-sm text-muted-foreground">Completa tus datos para solicitar acceso</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Nombres</Label>
                    <Input value={regFirstName} onChange={e => setRegFirstName(e.target.value)} className={regErrors.firstName ? "border-destructive" : ""} />
                    {regErrors.firstName && <p className="text-xs text-destructive">{regErrors.firstName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Apellidos</Label>
                    <Input value={regLastName} onChange={e => setRegLastName(e.target.value)} className={regErrors.lastName ? "border-destructive" : ""} />
                    {regErrors.lastName && <p className="text-xs text-destructive">{regErrors.lastName}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Correo electrónico</Label>
                  <Input value={regEmail} onChange={e => setRegEmail(e.target.value)} className={regErrors.email ? "border-destructive" : ""} />
                  {regErrors.email && <p className="text-xs text-destructive">{regErrors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Contraseña</Label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} value={regPassword} onChange={e => setRegPassword(e.target.value)} className={`pr-10 ${regErrors.password ? "border-destructive" : ""}`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {regPassword && (
                    <div className="space-y-1">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${strength.color} ${strength.w} transition-all`} /></div>
                      <p className="text-xs text-muted-foreground">Fortaleza: {strength.label}</p>
                    </div>
                  )}
                  {regErrors.password && <p className="text-xs text-destructive">{regErrors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Confirmar contraseña</Label>
                  <div className="relative">
                    <Input type={showConfirmPassword ? "text" : "password"} value={regConfirm} onChange={e => setRegConfirm(e.target.value)} className={`pr-10 ${regErrors.confirm ? "border-destructive" : ""}`} />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {regErrors.confirm && <p className="text-xs text-destructive">{regErrors.confirm}</p>}
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox id="terms" />
                  <Label htmlFor="terms" className="text-sm cursor-pointer">Acepto los términos y condiciones</Label>
                </div>

                <Button onClick={handleRegister} disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11">
                  {loading ? <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" /> : <><UserPlus className="h-4 w-4 mr-2" />Crear cuenta</>}
                </Button>
              </div>

              <button onClick={switchToLogin} className="text-sm text-primary hover:underline w-full text-center">
                ¿Ya tienes cuenta? Inicia sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
