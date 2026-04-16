import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});

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
    const result = await login(loginEmail, loginPassword);
    setLoading(false);

    if (result.success) {
      if (result.requiresPasswordChange) {
        navigate("/cambiar-contrasena");
        return;
      }
      if (result.role === "admin") navigate("/admin");
      else navigate("/");
    } else {
      setLoginError(result.error || "Error desconocido");
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: "url('/fondo_food.jpg')" }} />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex flex-col items-center justify-center gap-4 text-center">
          <img src="/logo_DKFitt.png" alt="DK Fitt" className="h-56 w-56 object-contain drop-shadow-2xl" />
          <p className="text-xl font-semibold text-white drop-shadow-md">La Salud es Vida</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center mb-4">
            <img src="/logo_DKFitt.png" alt="DK Fitt" className="h-14 w-14 object-contain" />
          </div>

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
          </div>
        </div>
      </div>
    </div>
  );
}
