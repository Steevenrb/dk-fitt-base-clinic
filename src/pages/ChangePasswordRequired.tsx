import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, ApiError } from "@/lib/api";

function extractMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return "No se pudo actualizar la contrasena.";

  const payload = error.payload as {
    message?: string | string[];
    error?: string | { message?: string; details?: Array<{ field?: string; message?: string }> };
  } | null;

  if (Array.isArray(payload?.message) && payload.message.length > 0) return payload.message.join(" | ");
  if (typeof payload?.message === "string" && payload.message.trim()) return payload.message;

  if (typeof payload?.error === "object" && payload.error) {
    const detailMsgs = Array.isArray(payload.error.details)
      ? payload.error.details
          .map((d) => [d.field, d.message].filter(Boolean).join(": "))
          .filter(Boolean)
      : [];
    if (detailMsgs.length > 0) return detailMsgs.join(" | ");
    if (payload.error.message) return payload.error.message;
  }

  if (typeof payload?.error === "string" && payload.error.trim()) return payload.error;

  return error.message || "No se pudo actualizar la contrasena.";
}

export default function ChangePasswordRequired() {
  const navigate = useNavigate();
  const { user, clearPasswordChangeRequirement, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const strongEnough =
    newPassword.trim().length >= 8 &&
    /[A-Z]/.test(newPassword.trim()) &&
    /[0-9]/.test(newPassword.trim()) &&
    /[^A-Za-z0-9]/.test(newPassword.trim());

  const canSubmit = currentPassword.trim() && newPassword.trim() && confirmPassword.trim() && strongEnough && newPassword.trim() === confirmPassword.trim();

  const submit = async () => {
    if (!canSubmit) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const accessToken = localStorage.getItem("dkfitt-access-token") || undefined;
      await apiRequest("/auth/change-password", {
        method: "PATCH",
        accessToken,
        body: {
          contrasena_actual: currentPassword.trim(),
          contrasena_nueva: newPassword.trim(),
        },
      });

      clearPasswordChangeRequirement();
      setSuccess("Contrasena actualizada correctamente.");
      navigate(user?.role === "admin" ? "/admin" : "/", { replace: true });
    } catch (e) {
      console.error("Change password error payload:", e instanceof ApiError ? e.payload : e);
      setError(extractMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <Card className="w-full max-w-lg border-primary/20 shadow-lg">
        <CardContent className="p-6 space-y-5">
          <div className="space-y-2 text-center">
            <div className="mx-auto h-10 w-10 rounded-full bg-primary/15 text-primary grid place-items-center">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Cambio de contrasena requerido</h1>
            <p className="text-sm text-muted-foreground">
              Tu cuenta ingreso con una contrasena temporal. Debes crear una contrasena nueva para continuar.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Contrasena actual</Label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Ingresa la contrasena temporal"
                className="pr-10"
              />
              <button type="button" onClick={() => setShowCurrent((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nueva contrasena</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimo 8 caracteres, mayuscula, numero y especial"
                className="pr-10"
              />
              <button type="button" onClick={() => setShowNew((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Confirmar nueva contrasena</Label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contrasena"
                className="pr-10"
              />
              <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {newPassword && !strongEnough && (
            <p className="text-xs text-destructive">La contrasena debe tener al menos 8 caracteres, una mayuscula, un numero y un caracter especial.</p>
          )}
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-destructive">Las contrasenas no coinciden.</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-primary">{success}</p>}

          <div className="flex gap-2">
            <Button variant="outline" className="w-full" onClick={handleLogout} disabled={loading}>Cerrar sesion</Button>
            <Button className="w-full bg-primary text-primary-foreground" onClick={submit} disabled={!canSubmit || loading}>
              {loading ? "Actualizando..." : "Actualizar contrasena"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
