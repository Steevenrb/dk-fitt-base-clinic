import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import GridMotion from "@/components/GridMotion";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});

  const { login } = useAuth();
  const navigate = useNavigate();

  const leftPanelItems = [
    "/simple fish.jpg",
    "/cereals.jpg",
    "/fruit.jpg",
    "/carnes.jpg",
    "/vegetables.jpg"
  ];

  useEffect(() => {
    const expired = localStorage.getItem("dkfitt-session-expired");
    const params = new URLSearchParams(window.location.search);
    const reason = params.get("reason");
    const resolvedReason = reason || expired;
    if (resolvedReason === "inactive" || resolvedReason === "token") {
      localStorage.removeItem("dkfitt-session-expired");
      setLoginError(
        resolvedReason === "inactive"
          ? "La sesion se cerro por inactividad. Inicia sesion nuevamente."
          : "La sesion expiro. Inicia sesion nuevamente."
      );
      if (reason) {
        params.delete("reason");
        const next = params.toString();
        window.history.replaceState({}, "", next ? `${window.location.pathname}?${next}` : window.location.pathname);
      }
    }
  }, []);

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
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: "url('/fondo_login.png')" }} />

      <div className="relative z-10 flex h-screen overflow-hidden">
        <div className="hidden lg:flex h-full flex-[0_0_48%] items-stretch justify-start pl-28 xl:pl-44 2xl:pl-36 py-0">
          <div className="flex h-full w-full max-w-[400px] flex-col overflow-hidden bg-black/95 shadow-2xl">
            <div className="flex items-center justify-center px-8 pt-8 pb-4">
              <img src="/logo_dorado.png" alt="DK Fitt" className="h-20 w-auto object-contain drop-shadow-2xl" />
            </div>
            <div className="flex-1 min-h-0 overflow-hidden px-3 pb-3">
              <GridMotion items={leftPanelItems} gradientColor="#000000" />
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-10 sm:px-12">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-6 animate-in fade-in duration-300 backdrop-blur-sm rounded-2xl border-2 border-[#978c6d] shadow-2xl px-5 py-8 sm:px-6 sm:py-10 bg-white/95">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold text-slate-900">Iniciar sesión</h2>
                <p className="text-sm text-slate-600">Accede a tu plataforma clínica</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">Correo electrónico</Label>
                  <Input
                    placeholder="correo@dkfitt.com"
                    value={loginEmail}
                    onChange={e => { setLoginEmail(e.target.value); setLoginErrors(p => ({ ...p, email: undefined })); }}
                    className={loginErrors.email ? "border-destructive bg-white" : "bg-white border-slate-300"}
                  />
                  {loginErrors.email && <p className="text-xs text-destructive">{loginErrors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700">Contraseña</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={e => { setLoginPassword(e.target.value); setLoginErrors(p => ({ ...p, password: undefined })); }}
                      className={loginErrors.password ? "border-destructive pr-10 bg-white" : "pr-10 bg-white border-slate-300"}
                      onKeyDown={e => e.key === "Enter" && handleLogin()}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {loginErrors.password && <p className="text-xs text-destructive">{loginErrors.password}</p>}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox id="remember" />
                    <Label htmlFor="remember" className="text-sm cursor-pointer text-slate-700">Recordarme</Label>
                  </div>
                  <button className="text-xs text-[#b08e45] hover:text-[#8f7239] hover:underline">¿Olvidaste tu contraseña?</button>
                </div>

                {loginError && (
                  <div className="rounded-md bg-accent/20 border border-accent p-3 text-sm text-accent-foreground">
                    {loginError}
                  </div>
                )}

                <Button onClick={handleLogin} disabled={loading} className="w-full bg-[#e5b106] text-black hover:bg-[#cc8c02] h-11">
                  {loading ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <><LogIn className="h-4 w-4 mr-2" />Iniciar sesión</>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
