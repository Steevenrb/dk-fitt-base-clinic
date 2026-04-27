import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import GridMotion from "@/components/GridMotion";
import Particles from "@/components/Particles";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});

  const { login } = useAuth();
  const navigate = useNavigate();
  // Centralized background config: edit images/colors here
  const loginBackgroundConfig = {
    left: {
      // Add or remove image paths (relative to /public). They will be repeated to fill the grid.
      items: [
        "/simple fish.jpg",
        "/fruits2.jpg",
        "/fruit.jpg",
        "/carnes.jpg",
        "/vegetables.jpg"
      ],
      gradientColor: "#000000"
    },
    particles: {
      particleColors: ["#f9cb22"],
      particleCount: 250,
      particleSpread: 20,
      speed: 0.1,
      particleBaseSize: 250,
      moveParticlesOnHover: false,
      particleHoverFactor: 0.8,
      alphaParticles: true,
      disableRotation: false
    }
  } as const;

  const leftPanelItems = (() => {
    const src = Array.isArray(loginBackgroundConfig.left.items) && loginBackgroundConfig.left.items.length > 0
      ? loginBackgroundConfig.left.items
      : ["/fondo_food.jpg"];
    const total = 28;
    const out: string[] = [];
    for (let i = 0; i < total; i++) out.push(src[i % src.length]);
    return out;
  })();

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
    <div className="min-h-screen flex bg-white">
      {/* Left panel */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0">
          <GridMotion items={leftPanelItems} gradientColor="#000000" />
        </div>
        <div className="absolute inset-0 f5ebcf/30" />
      </div>

      {/* Right panel */}
      <div className="flex-1 relative flex items-center justify-center p-6 sm:p-12 overflow-hidden">
          <div className="absolute inset-0 z-0" style={{ backgroundColor: "#f5ebcf" }} />
          <div className="absolute inset-0 z-10 pointer-events-none">
            <Particles
              particleColors={loginBackgroundConfig.particles.particleColors}
              particleCount={loginBackgroundConfig.particles.particleCount}
              particleSpread={loginBackgroundConfig.particles.particleSpread}
              speed={loginBackgroundConfig.particles.speed}
              particleBaseSize={loginBackgroundConfig.particles.particleBaseSize}
              moveParticlesOnHover={loginBackgroundConfig.particles.moveParticlesOnHover}
              particleHoverFactor={loginBackgroundConfig.particles.particleHoverFactor}
              alphaParticles={loginBackgroundConfig.particles.alphaParticles}
              disableRotation={loginBackgroundConfig.particles.disableRotation}
            />
          </div>

        <div className="relative z-20 w-full max-w-md space-y-6">
          <div className="flex items-center justify-center mb-6">
            <img src="/logo_DKFitt.png" alt="DK Fitt" className="h-40 w-40 object-contain drop-shadow-2xl" />
          </div>

          <div className="space-y-6 animate-in fade-in duration-300 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-2xl p-6 sm:p-8" style={{ backgroundColor: "#f8f6f1" }}>
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
                <button className="text-xs text-emerald-700 hover:underline">¿Olvidaste tu contraseña?</button>
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
  );
}
