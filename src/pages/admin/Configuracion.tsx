import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Upload } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Configuracion() {
  const [platformName, setPlatformName] = useState("DK Fitt");
  const [timezone, setTimezone] = useState("America/Guayaquil");
  const [publicRegistration, setPublicRegistration] = useState(true);
  const [requireApproval, setRequireApproval] = useState(true);
  const { toast } = useToast();

  const handleSave = () => {
    toast({ title: "Configuración guardada", description: "Los cambios se han aplicado correctamente." });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
          <p className="text-muted-foreground">Ajustes generales de la plataforma</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Identidad de la plataforma</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de la plataforma</Label>
              <Input value={platformName} onChange={e => setPlatformName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Logo de la plataforma</Label>
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary"><span className="text-xl font-bold text-primary-foreground">DK</span></div>
                <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-2" />Cambiar logo</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Regional</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Zona horaria</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Registro y acceso</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Permitir registro público</p>
                <p className="text-xs text-muted-foreground">Los usuarios pueden crear una cuenta desde la pantalla de login</p>
              </div>
              <Switch checked={publicRegistration} onCheckedChange={setPublicRegistration} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Requerir aprobación del administrador</p>
                <p className="text-xs text-muted-foreground">Las nuevas cuentas requieren aprobación antes de poder acceder</p>
              </div>
              <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Save className="h-4 w-4 mr-2" />Guardar configuración
        </Button>
      </div>
    </AdminLayout>
  );
}
