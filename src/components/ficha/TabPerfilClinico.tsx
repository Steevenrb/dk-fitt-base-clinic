import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Edit, Save, User, Activity, HeartPulse, AlertTriangle, Apple,
  Plus, X, Camera
} from "lucide-react";

const activityLevels = [
  { key: "sedentario", label: "Sedentario", desc: "Sin act. física" },
  { key: "bajo", label: "Bajo", desc: "1-2 días por semana" },
  { key: "moderado", label: "Moderado", desc: "3-4 días por semana" },
  { key: "alto", label: "Alto", desc: "5+ días por semana" },
];

const medicalOptions = [
  "Diabetes tipo 1", "Diabetes tipo 2", "Hipertensión arterial",
  "Hipotiroidismo", "Hipertiroidismo", "Síndrome de ovario poliquístico (SOP)",
  "Insuficiencia renal", "Enfermedad cardiovascular", "Anemia",
];

const allergyOptions = [
  "Intolerancia a la lactosa", "Celiaquía (gluten)", "Alergia a frutos secos",
  "Alergia al mariscos", "Alergia al huevo", "Alergia a la soya",
];

interface ProfileData {
  nombre: string;
  sexo: string;
  fechaNacimiento: string;
  correo: string;
  telefono: string;
  actividadFisica: string;
  deportes: string[];
  tieneCondiciones: boolean;
  condiciones: string[];
  otraCondicion: string;
  observacionesMedicas: string;
  tieneAlergias: boolean;
  alergias: string[];
  otraAlergia: string;
  descripcionAlergias: string;
  preferencias: Record<string, string[]>;
  noLeGusta: string;
}

const initialData: ProfileData = {
  nombre: "María González",
  sexo: "Femenino",
  fechaNacimiento: "1992-03-15",
  correo: "maria.gonzalez@email.com",
  telefono: "+593 987 654 321",
  actividadFisica: "moderado",
  deportes: ["Yoga", "Caminata"],
  tieneCondiciones: true,
  condiciones: ["Hipotiroidismo", "Síndrome de ovario poliquístico (SOP)"],
  otraCondicion: "",
  observacionesMedicas: "Levotiroxina 50mcg en ayunas. Control endocrinológico cada 6 meses.",
  tieneAlergias: true,
  alergias: ["Intolerancia a la lactosa"],
  otraAlergia: "",
  descripcionAlergias: "Sensibilidad moderada. Tolera pequeñas cantidades de queso curado.",
  preferencias: {
    proteinas: ["Pollo", "Huevo", "Atún"],
    carbohidratos: ["Arroz integral", "Avena", "Quinoa"],
    lacteos: ["Leche sin lactosa", "Yogur sin lactosa"],
    vegetales: ["Espinaca", "Brócoli", "Zanahoria"],
    frutas: ["Manzana", "Banano", "Fresas"],
  },
  noLeGusta: "Hígado, sardinas, coliflor",
};

const prefCategories = [
  { key: "proteinas", label: "Proteínas", icon: "🥩" },
  { key: "carbohidratos", label: "Carbohidratos", icon: "🌾" },
  { key: "lacteos", label: "Lácteos", icon: "🥛" },
  { key: "vegetales", label: "Vegetales", icon: "🥦" },
  { key: "frutas", label: "Frutas", icon: "🍎" },
];

function calcAge(dob: string) {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age--;
  return age;
}

export function TabPerfilClinico() {
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState<ProfileData>(initialData);
  const [newSport, setNewSport] = useState("");
  const [newItems, setNewItems] = useState<Record<string, string>>({});

  const update = <K extends keyof ProfileData>(key: K, val: ProfileData[K]) =>
    setData(prev => ({ ...prev, [key]: val }));

  const toggleCondition = (c: string) => {
    const next = data.condiciones.includes(c)
      ? data.condiciones.filter(x => x !== c)
      : [...data.condiciones, c];
    update("condiciones", next);
  };

  const toggleAllergy = (a: string) => {
    const next = data.alergias.includes(a)
      ? data.alergias.filter(x => x !== a)
      : [...data.alergias, a];
    update("alergias", next);
  };

  const addSport = () => {
    if (newSport.trim() && !data.deportes.includes(newSport.trim())) {
      update("deportes", [...data.deportes, newSport.trim()]);
      setNewSport("");
    }
  };

  const addPrefItem = (cat: string) => {
    const val = (newItems[cat] || "").trim();
    if (val && !data.preferencias[cat]?.includes(val)) {
      update("preferencias", {
        ...data.preferencias,
        [cat]: [...(data.preferencias[cat] || []), val],
      });
      setNewItems(prev => ({ ...prev, [cat]: "" }));
    }
  };

  const removePrefItem = (cat: string, item: string) => {
    update("preferencias", {
      ...data.preferencias,
      [cat]: data.preferencias[cat].filter(x => x !== item),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-end">
        {editing ? (
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setEditing(false)}>
            <Save className="h-3.5 w-3.5" /> Guardar cambios
          </Button>
        ) : (
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setEditing(true)}>
            <Edit className="h-3.5 w-3.5" /> Editar perfil
          </Button>
        )}
      </div>

      {/* SECCIÓN 1 — Datos Personales */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Datos Personales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-28 w-28 border-2 border-primary">
                <AvatarFallback className="text-3xl font-bold bg-primary/15 text-primary">
                  {data.nombre.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {editing && (
                <Button variant="outline" size="sm" className="text-xs gap-1">
                  <Camera className="h-3 w-3" /> Cambiar foto
                </Button>
              )}
            </div>

            {/* Fields */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre completo" value={data.nombre} editing={editing}
                onChange={v => update("nombre", v)} />
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Sexo</label>
                {editing ? (
                  <Select value={data.sexo} onValueChange={v => update("sexo", v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Femenino", "Masculino", "Otro"].map(s => (
                        <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-foreground">{data.sexo}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Fecha de nacimiento</label>
                {editing ? (
                  <Input type="date" value={data.fechaNacimiento} className="h-9 text-xs"
                    onChange={e => update("fechaNacimiento", e.target.value)} />
                ) : (
                  <p className="text-sm text-foreground">
                    {new Date(data.fechaNacimiento).toLocaleDateString("es-ES")} ({calcAge(data.fechaNacimiento)} años)
                  </p>
                )}
              </div>
              <Field label="Correo electrónico" value={data.correo} editing={editing}
                onChange={v => update("correo", v)} />
              <Field label="Teléfono" value={data.telefono} editing={editing}
                onChange={v => update("telefono", v)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECCIÓN 2 — Actividad Física */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Actividad Física
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Nivel de actividad física</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {activityLevels.map(l => {
                const active = data.actividadFisica === l.key;
                return (
                  <button key={l.key} disabled={!editing}
                    onClick={() => update("actividadFisica", l.key)}
                    className={`rounded-lg border p-3 text-center transition-colors ${
                      active
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    } ${!editing ? "cursor-default" : "cursor-pointer"}`}
                  >
                    <p className="text-xs font-semibold">{l.label}</p>
                    <p className="text-[10px] mt-0.5 opacity-70">{l.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Deportes o actividades</label>
            <div className="flex flex-wrap gap-2">
              {data.deportes.map(d => (
                <Badge key={d} variant="outline" className="bg-primary/15 text-primary border-primary/30 text-xs gap-1">
                  {d}
                  {editing && (
                    <X className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => update("deportes", data.deportes.filter(x => x !== d))} />
                  )}
                </Badge>
              ))}
              {editing && (
                <div className="flex gap-1">
                  <Input value={newSport} onChange={e => setNewSport(e.target.value)}
                    placeholder="Agregar deporte..." className="h-7 text-xs w-36"
                    onKeyDown={e => e.key === "Enter" && addSport()} />
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={addSport}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECCIÓN 3 — Condiciones Médicas */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-primary" /> Condiciones Médicas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground">¿Padece alguna condición médica?</label>
            <Switch checked={data.tieneCondiciones} disabled={!editing}
              onCheckedChange={v => update("tieneCondiciones", v)} />
            <span className="text-xs text-muted-foreground">{data.tieneCondiciones ? "Sí" : "No"}</span>
          </div>

          {data.tieneCondiciones && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {medicalOptions.map(c => (
                  <label key={c} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox checked={data.condiciones.includes(c)} disabled={!editing}
                      onCheckedChange={() => toggleCondition(c)} />
                    <span className="text-foreground">{c}</span>
                  </label>
                ))}
                {editing && (
                  <div className="flex items-center gap-2">
                    <Checkbox checked={!!data.otraCondicion} disabled />
                    <Input value={data.otraCondicion} placeholder="Otra condición..."
                      className="h-7 text-xs flex-1"
                      onChange={e => update("otraCondicion", e.target.value)} />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {data.condiciones.map(c => (
                  <Badge key={c} variant="outline" className="bg-accent/15 text-accent border-accent/30 text-[10px]">
                    {c}
                  </Badge>
                ))}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Observaciones médicas</label>
                {editing ? (
                  <Textarea value={data.observacionesMedicas} className="text-xs min-h-[60px]"
                    placeholder="Medicamentos actuales, tratamientos..."
                    onChange={e => update("observacionesMedicas", e.target.value)} />
                ) : (
                  <p className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3">{data.observacionesMedicas}</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* SECCIÓN 4 — Alergias e Intolerancias */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" /> Alergias e Intolerancias
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground">¿Tiene alergias o intolerancias?</label>
            <Switch checked={data.tieneAlergias} disabled={!editing}
              onCheckedChange={v => update("tieneAlergias", v)} />
            <span className="text-xs text-muted-foreground">{data.tieneAlergias ? "Sí" : "No"}</span>
          </div>

          {data.tieneAlergias && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allergyOptions.map(a => (
                  <label key={a} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox checked={data.alergias.includes(a)} disabled={!editing}
                      onCheckedChange={() => toggleAllergy(a)} />
                    <span className="text-foreground">{a}</span>
                  </label>
                ))}
                {editing && (
                  <div className="flex items-center gap-2">
                    <Checkbox checked={!!data.otraAlergia} disabled />
                    <Input value={data.otraAlergia} placeholder="Otra alergia..."
                      className="h-7 text-xs flex-1"
                      onChange={e => update("otraAlergia", e.target.value)} />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {data.alergias.map(a => (
                  <Badge key={a} variant="outline" className="bg-accent/15 text-accent border-accent/30 text-[10px] gap-1">
                    <AlertTriangle className="h-2.5 w-2.5" /> {a}
                  </Badge>
                ))}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descripción detallada</label>
                {editing ? (
                  <Textarea value={data.descripcionAlergias} className="text-xs min-h-[60px]"
                    placeholder="Describe reacciones, nivel de sensibilidad..."
                    onChange={e => update("descripcionAlergias", e.target.value)} />
                ) : (
                  <p className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3">{data.descripcionAlergias}</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* SECCIÓN 5 — Preferencias Alimentarias */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Apple className="h-4 w-4 text-primary" /> Preferencias Alimentarias
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="text-xs font-medium text-muted-foreground block">Alimentos que consume con frecuencia</label>
          <div className="space-y-3">
            {prefCategories.map(cat => (
              <div key={cat.key} className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs font-semibold mb-2">{cat.icon} {cat.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(data.preferencias[cat.key] || []).map(item => (
                    <Badge key={item} variant="outline"
                      className="bg-primary/10 text-primary border-primary/30 text-[10px] gap-1">
                      {item}
                      {editing && (
                        <X className="h-2.5 w-2.5 cursor-pointer hover:text-destructive"
                          onClick={() => removePrefItem(cat.key, item)} />
                      )}
                    </Badge>
                  ))}
                  {editing && (
                    <div className="flex gap-1">
                      <Input value={newItems[cat.key] || ""}
                        onChange={e => setNewItems(prev => ({ ...prev, [cat.key]: e.target.value }))}
                        placeholder="Agregar..." className="h-6 text-[10px] w-24"
                        onKeyDown={e => e.key === "Enter" && addPrefItem(cat.key)} />
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => addPrefItem(cat.key)}>
                        <Plus className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Alimentos que no le gustan o evita</label>
            {editing ? (
              <Textarea value={data.noLeGusta} className="text-xs min-h-[60px]"
                placeholder="Ej: no tolera el sabor del pescado..."
                onChange={e => update("noLeGusta", e.target.value)} />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {data.noLeGusta.split(",").map(item => item.trim()).filter(Boolean).map(item => (
                  <Badge key={item} variant="outline" className="bg-muted text-muted-foreground border-border text-[10px]">
                    {item}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, editing, onChange }: {
  label: string; value: string; editing: boolean; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {editing ? (
        <Input value={value} onChange={e => onChange(e.target.value)} className="h-9 text-xs" />
      ) : (
        <p className="text-sm text-foreground">{value}</p>
      )}
    </div>
  );
}
