import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { User, Activity, HeartPulse, AlertTriangle, Apple } from "lucide-react";

const ACCESS_TOKEN_KEY = "dkfitt-access-token";
const PROFILE_ENDPOINTS = ["/api/patient-profile", "/patient-profile"];
const PATIENT_DETAIL_ENDPOINTS = ["/api/patients", "/patients"];

type ApiCondition = {
  id_condicion?: number;
  nombre?: string;
  descripcion?: string;
};

type ApiFood = {
  id_preferencia?: number;
  id_alimento?: number;
  nombre_alimento?: string;
  tipo?: string;
};

type ApiSport = {
  id_actividad_interes?: number;
  deporte?: string;
};

type ProfileApiData = {
  id_perfil?: number;
  id_usuario?: number;
  nombre_completo?: string;
  nombres?: string;
  apellidos?: string;
  fecha_nacimiento?: string;
  telefono?: string;
  telefono_contacto?: string;
  sexo?: string;
  correo_institucional?: string;
  correo?: string;
  email?: string;
  nivel_actividad_fisica?: string;
  objetivo?: string;
  alergias_intolerancias?: string;
  restricciones_alimenticias?: string;
  formulario_completado?: boolean;
  fecha_ultima_actualizacion?: string;
  condiciones?: ApiCondition[];
  alimentos_preferidos?: ApiFood[];
  alimentos_restringidos?: ApiFood[];
  deportes?: ApiSport[];
};

type PatientDetailApiData = {
  id_usuario?: number;
  nombre_completo?: string;
  nombres?: string;
  apellidos?: string;
  fecha_nacimiento?: string;
  telefono?: string;
  telefono_contacto?: string;
  sexo?: string;
  correo_institucional?: string;
  correo?: string;
  email?: string;
  nivel_actividad_fisica?: string;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
};

type ClinicalProfileView = {
  fullName: string;
  birthDate: string;
  phone: string;
  sex: string;
  email: string;
  activityLevelKey: string;
  sports: string[];
  medicalConditions: ApiCondition[];
  medicalObservation: string;
  allergiesRaw: string;
  preferredFoods: string[];
  dislikesOrRestrictions: string;
};

const activityLevels = [
  { key: "sedentario", label: "Sedentario", desc: "Sin act. fisica" },
  { key: "bajo", label: "Bajo", desc: "1-2 dias por semana" },
  { key: "medio", label: "Medio", desc: "3-4 dias por semana" },
  { key: "alto", label: "Alto", desc: "5+ dias por semana" },
];

const baseMedicalOptions = [
  "Diabetes tipo 1",
  "Diabetes tipo 2",
  "Diabetes",
  "Hipertension arterial",
  "Hipertension",
  "Hipotiroidismo",
  "Hipertiroidismo",
  "Sindrome de ovario poliquistico (SOP)",
  "Insuficiencia renal",
  "Enfermedad cardiovascular",
  "Anemia",
];

const baseAllergyOptions = [
  "Intolerancia a la lactosa",
  "Lactosa",
  "Celiaquia (gluten)",
  "Alergia a frutos secos",
  "Alergia a mariscos",
  "Alergia al huevo",
  "Alergia a la soya",
];

const prefCategories = [
  { key: "proteinas", label: "Proteinas", icon: "🥩" },
  { key: "carbohidratos", label: "Carbohidratos", icon: "🌾" },
  { key: "lacteos", label: "Lacteos", icon: "🥛" },
  { key: "vegetales", label: "Vegetales", icon: "🥦" },
  { key: "frutas", label: "Frutas", icon: "🍎" },
] as const;

const OPTION_WIDTH_CLASS = "w-full sm:w-[15.5rem]";

const foodCategoryKeywords: Record<string, string[]> = {
  proteinas: ["pollo", "atun", "pescado", "res", "huevo", "huevos", "pavo"],
  carbohidratos: ["arroz", "avena", "banana", "batata", "legumbres", "pan", "papas", "pasta", "quinoa"],
  lacteos: ["queso", "yogur", "crema", "cuajada", "leche", "mantequilla"],
  vegetales: ["brocoli", "cebolla", "espinaca", "lechuga", "pimientos", "zanahoria"],
  frutas: ["fresas", "manzana", "naranja", "sandia", "uvas", "arandanos"],
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatDate(value?: string): string {
  if (!value) return "---";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "---";
  return d.toLocaleDateString("es-EC", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function formatSex(value?: string): string {
  const raw = String(value || "").toUpperCase();
  if (raw === "F") return "Femenino";
  if (raw === "M") return "Masculino";
  if (raw === "O") return "Otro";
  return value || "---";
}

function normalizeActivityKey(value?: string): string {
  const raw = normalizeText(value || "");
  if (raw === "moderado") return "medio";
  return raw;
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function splitList(raw: string): string[] {
  return raw
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueMerge(base: string[], dynamic: string[]): string[] {
  const map = new Map<string, string>();
  for (const item of [...base, ...dynamic]) {
    const key = normalizeText(item);
    if (!map.has(key)) map.set(key, item);
  }
  return [...map.values()];
}

function categorizeFoods(foods: string[]): Record<string, string[]> {
  const result: Record<string, string[]> = {
    proteinas: [],
    carbohidratos: [],
    lacteos: [],
    vegetales: [],
    frutas: [],
  };

  for (const food of foods) {
    const normalizedFood = normalizeText(food);
    let assigned = false;

    for (const [category, keywords] of Object.entries(foodCategoryKeywords)) {
      if (keywords.some((keyword) => normalizedFood.includes(keyword))) {
        result[category].push(food);
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      result.vegetales.push(food);
    }
  }

  for (const key of Object.keys(result)) {
    result[key] = [...new Set(result[key])];
  }

  return result;
}

async function requestProfileWithFallback(patientId: number, token: string): Promise<ApiResponse<ProfileApiData>> {
  let lastError: unknown;
  for (const base of PROFILE_ENDPOINTS) {
    try {
      return await apiRequest<ApiResponse<ProfileApiData>>(`${base}/${patientId}`, {
        method: "GET",
        accessToken: token,
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function requestPatientDetailWithFallback(patientId: number, token: string): Promise<ApiResponse<PatientDetailApiData> | null> {
  let lastError: unknown;
  for (const base of PATIENT_DETAIL_ENDPOINTS) {
    try {
      return await apiRequest<ApiResponse<PatientDetailApiData>>(`${base}/${patientId}`, {
        method: "GET",
        accessToken: token,
      });
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    return null;
  }

  return null;
}

function toViewModel(profile?: ProfileApiData, detail?: PatientDetailApiData): ClinicalProfileView {
  const fullName =
    detail?.nombre_completo
    || profile?.nombre_completo
    || `${detail?.nombres || profile?.nombres || ""} ${detail?.apellidos || profile?.apellidos || ""}`.trim()
    || "---";

  const preferredFoods = (profile?.alimentos_preferidos || [])
    .map((item) => item.nombre_alimento)
    .filter((v): v is string => Boolean(v));

  const sports = (profile?.deportes || [])
    .map((item) => item.deporte)
    .filter((v): v is string => Boolean(v));

  return {
    fullName,
    birthDate: formatDate(detail?.fecha_nacimiento || profile?.fecha_nacimiento),
    phone: detail?.telefono || detail?.telefono_contacto || profile?.telefono || profile?.telefono_contacto || "---",
    sex: formatSex(detail?.sexo || profile?.sexo),
    email: detail?.correo_institucional || detail?.correo || detail?.email || profile?.correo_institucional || profile?.correo || profile?.email || "---",
    activityLevelKey: normalizeActivityKey(profile?.nivel_actividad_fisica || detail?.nivel_actividad_fisica),
    sports,
    medicalConditions: profile?.condiciones || [],
    medicalObservation: profile?.objetivo || "---",
    allergiesRaw: profile?.alergias_intolerancias || "---",
    preferredFoods,
    dislikesOrRestrictions: profile?.restricciones_alimenticias || "---",
  };
}

export function TabPerfilClinico({ patientId }: { patientId: number }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ClinicalProfileView>(toViewModel(undefined, undefined));

  useEffect(() => {
    const fetchProfile = async () => {
      if (!patientId || Number.isNaN(patientId)) {
        setLoading(false);
        setProfile(toViewModel(undefined, undefined));
        return;
      }

      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) {
        setLoading(false);
        setProfile(toViewModel(undefined, undefined));
        toast({ title: "Sesion no valida", description: "No se encontro token de acceso.", variant: "destructive" });
        return;
      }

      setLoading(true);
      try {
        const profileRes = await requestProfileWithFallback(patientId, token);
        const detailRes = await requestPatientDetailWithFallback(patientId, token);
        setProfile(toViewModel(profileRes.data, detailRes?.data));
      } catch {
        setProfile(toViewModel(undefined, undefined));
        toast({
          title: "No se pudo cargar perfil clinico",
          description: "Verifica endpoint GET /patient-profile/{patientId}.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void fetchProfile();
  }, [patientId, toast]);

  const initials = useMemo(() => getInitials(profile.fullName === "---" ? "Paciente" : profile.fullName), [profile.fullName]);

  const selectedConditionNames = useMemo(
    () => profile.medicalConditions.map((c) => c.nombre).filter((v): v is string => Boolean(v)),
    [profile.medicalConditions],
  );

  const medicalOptions = useMemo(
    () => uniqueMerge(baseMedicalOptions, selectedConditionNames),
    [selectedConditionNames],
  );

  const selectedConditionSet = useMemo(
    () => new Set(selectedConditionNames.map((name) => normalizeText(name))),
    [selectedConditionNames],
  );

  const allergyTokens = useMemo(() => {
    if (!profile.allergiesRaw || profile.allergiesRaw === "---") return [];
    return splitList(profile.allergiesRaw);
  }, [profile.allergiesRaw]);

  const allergyOptions = useMemo(
    () => uniqueMerge(baseAllergyOptions, allergyTokens),
    [allergyTokens],
  );

  const selectedAllergySet = useMemo(
    () => new Set(allergyTokens.map((item) => normalizeText(item))),
    [allergyTokens],
  );

  const foodsByCategory = useMemo(() => categorizeFoods(profile.preferredFoods), [profile.preferredFoods]);

  return (
    <div className="space-y-6">
      {loading && (
        <Card className="border-border">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">Cargando perfil clinico...</CardContent>
        </Card>
      )}

      {!loading && (
        <>
          <Card className="border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Datos Personales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex flex-col items-center gap-2">
                  <Avatar className="h-28 w-28 border-2 border-primary">
                    <AvatarFallback className="text-3xl font-bold bg-primary/15 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Info label="Nombre completo" value={profile.fullName} />
                  <Info label="Sexo" value={profile.sex} />
                  <Info label="Fecha de nacimiento" value={profile.birthDate} />
                  <Info label="Correo electronico" value={profile.email} />
                  <Info label="Telefono" value={profile.phone} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Actividad Fisica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Nivel de actividad fisica</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {activityLevels.map((level) => {
                  const active = profile.activityLevelKey === level.key;
                  return (
                    <div
                      key={level.key}
                      className={`rounded-lg border p-3 text-center transition-colors ${
                        active
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      <p className="text-xs font-semibold">{level.label}</p>
                      <p className="text-[10px] mt-0.5 opacity-70">{level.desc}</p>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Deportes o actividades</label>
                <div className="flex flex-wrap gap-1.5">
                  {profile.sports.length > 0 ? (
                    profile.sports.map((sport) => (
                      <Badge key={sport} variant="outline" className="bg-primary/15 text-primary border-primary/30 text-xs">
                        {sport}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">---</span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Objetivo del paciente</label>
                <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground leading-relaxed">{profile.medicalObservation}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-primary" /> Condiciones Medicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-[max-content_max-content] gap-y-2 sm:gap-x-2 sm:justify-start">
                {medicalOptions.map((condition) => {
                  const active = selectedConditionSet.has(normalizeText(condition));
                  return (
                    <div key={condition} className="justify-self-start">
                      <span
                      className={`${OPTION_WIDTH_CLASS} inline-flex rounded-md border px-2.5 py-1.5 text-xs leading-none ${
                        active
                          ? "border-accent/50 bg-accent/15 text-accent font-semibold"
                          : "border-border text-muted-foreground"
                      }`}
                      >
                        {condition}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Observacion / Descripcion</label>
                {profile.medicalConditions.length > 0 ? (
                  <div className="space-y-1.5">
                    {profile.medicalConditions.map((condition) => (
                      <div key={`${condition.id_condicion || condition.nombre || "obs"}`} className="rounded-md border border-border bg-muted/20 px-3 py-2">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <span className="font-semibold text-foreground">{condition.nombre || "Condicion"}: </span>
                          {condition.descripcion || "---"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                    <p className="text-xs text-muted-foreground leading-relaxed">---</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" /> Alergias e Intolerancias
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-[max-content_max-content] gap-y-2 sm:gap-x-2 sm:justify-start">
                {allergyOptions.map((allergy) => {
                  const active = selectedAllergySet.has(normalizeText(allergy));
                  return (
                    <div key={allergy} className="justify-self-start">
                      <span
                      className={`${OPTION_WIDTH_CLASS} inline-flex rounded-md border px-2.5 py-1.5 text-xs leading-none ${
                        active
                          ? "border-accent/50 bg-accent/15 text-accent font-semibold"
                          : "border-border text-muted-foreground"
                      }`}
                      >
                        {allergy}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descripcion</label>
                <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground leading-relaxed">{profile.allergiesRaw}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Apple className="h-4 w-4 text-primary" /> Preferencias Alimenticias
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {prefCategories.map((category) => (
                <div key={category.key} className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-xs font-semibold mb-2">{category.icon} {category.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(foodsByCategory[category.key] || []).length > 0 ? (
                      foodsByCategory[category.key].map((food) => (
                        <Badge key={`${category.key}-${food}`} variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">
                          {food}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">---</span>
                    )}
                  </div>
                </div>
              ))}

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Alimentos que no le gustan / restricciones</label>
                <p className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3">{profile.dislikesOrRestrictions}</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <p className="text-sm text-foreground">{value || "---"}</p>
    </div>
  );
}
