import { ReactNode, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { User, Activity, HeartPulse, AlertTriangle, Apple, CalendarDays, Cake, Mail, UserRound, BadgeInfo, Utensils, Wheat, Milk, Salad, Trash2, Scale, Ruler, Percent, Dumbbell, Droplets, Gauge, Bone } from "lucide-react";

const ACCESS_TOKEN_KEY = "dkfitt-access-token";
const PROFILE_ENDPOINTS = ["/api/patient-profile", "/patient-profile"];
const PATIENT_DETAIL_ENDPOINTS = ["/api/patients", "/patients"];
const DASHBOARD_PATIENT_ENDPOINTS = ["/api/dashboard/patient", "/dashboard/patient"];
const CLINICAL_EVALUATION_ENDPOINTS = ["/api/clinical-evaluations", "/clinical-evaluations"];

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
  id_paciente?: number;
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
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
};

type DashboardPatientProfile = {
  nombres?: string;
  apellidos?: string;
  correo_institucional?: string;
  edad?: number;
  fecha_nacimiento?: string;
  sexo?: string;
  nivel_actividad_fisica?: string;
  objetivo?: string;
};

type DashboardPatientApiData = {
  perfil?: DashboardPatientProfile;
};

type ClinicalProfileView = {
  profileId: number | null;
  fullName: string;
  birthDate: string;
  age: string;
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
  { key: "proteinas", label: "Proteinas", icon: "ðŸ¥©" },
  { key: "carbohidratos", label: "Carbohidratos", icon: "ðŸŒ¾" },
  { key: "lacteos", label: "Lacteos", icon: "ðŸ¥›" },
  { key: "vegetales", label: "Vegetales", icon: "ðŸ¥¦" },
  { key: "frutas", label: "Frutas", icon: "ðŸŽ" },
] as const;

const preferenceCategoryTone = {
  proteinas: {
    pill: "bg-[#FA9C5C]",
    panel: "border-[#FA9C5C]/70 bg-[#FA9C5C]/15",
    chip: "border-[#FA9C5C]/50 bg-white/70",
  },
  carbohidratos: {
    pill: "bg-[#F7CA5E]",
    panel: "border-[#F7CA5E]/70 bg-[#F7CA5E]/20",
    chip: "border-[#F7CA5E]/50 bg-white/70",
  },
  lacteos: {
    pill: "bg-[#A8D1E7]",
    panel: "border-[#A8D1E7]/75 bg-[#A8D1E7]/20",
    chip: "border-[#A8D1E7]/55 bg-white/70",
  },
  vegetales: {
    pill: "bg-[#C5EB6F]",
    panel: "border-[#C5EB6F]/75 bg-[#C5EB6F]/20",
    chip: "border-[#C5EB6F]/55 bg-white/70",
  },
  frutas: {
    pill: "bg-[#F49C9C]",
    panel: "border-[#F49C9C]/75 bg-[#F49C9C]/20",
    chip: "border-[#F49C9C]/55 bg-white/70",
  },
  noDeseados: {
    pill: "bg-[#E6E6E6]",
    panel: "border-[#D2D2D2] bg-[#E6E6E6]/45",
    chip: "border-[#D2D2D2] bg-white/70",
  },
} as const;

const preferenceCategoryIcon = {
  proteinas: Utensils,
  carbohidratos: Wheat,
  lacteos: Milk,
  vegetales: Salad,
  frutas: Apple,
  noDeseados: Trash2,
} as const;

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

function splitFoodList(value: string): string[] {
  const cleaned = value.trim();
  if (!cleaned || cleaned === "---") return [];
  return cleaned
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
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

function formatAgeFromBirthDate(value?: string): string {
  if (!value) return "---";
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return "---";

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  if (!Number.isFinite(age) || age < 0) return "---";
  return `${age} anos`;
}

function formatAge(value?: number, fallbackBirthDate?: string): string {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return `${value} anos`;
  }
  return formatAgeFromBirthDate(fallbackBirthDate);
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

async function requestDashboardPatientByIdWithFallback(id: number, token: string): Promise<ApiResponse<DashboardPatientApiData> | null> {
  let lastError: unknown;
  for (const base of DASHBOARD_PATIENT_ENDPOINTS) {
    try {
      return await apiRequest<ApiResponse<DashboardPatientApiData>>(`${base}/${id}`, {
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

function normalizeComparable(value?: string): string {
  return normalizeText(value || "");
}

function isSamePatient(
  detail?: PatientDetailApiData,
  profile?: ProfileApiData,
  dashboardPerfil?: DashboardPatientProfile,
): boolean {
  if (!dashboardPerfil) return false;

  const dashboardEmail = normalizeComparable(dashboardPerfil.correo_institucional);
  const detailEmail = normalizeComparable(detail?.correo_institucional || detail?.correo || detail?.email);
  const profileEmail = normalizeComparable(profile?.correo_institucional || profile?.correo || profile?.email);

  if (dashboardEmail && (dashboardEmail === detailEmail || dashboardEmail === profileEmail)) {
    return true;
  }

  const dashboardName = normalizeComparable(`${dashboardPerfil.nombres || ""} ${dashboardPerfil.apellidos || ""}`.trim());
  const detailName = normalizeComparable(detail?.nombre_completo || `${detail?.nombres || ""} ${detail?.apellidos || ""}`.trim());
  const profileName = normalizeComparable(profile?.nombre_completo || `${profile?.nombres || ""} ${profile?.apellidos || ""}`.trim());

  if (dashboardName && (dashboardName === detailName || dashboardName === profileName)) {
    return true;
  }

  return false;
}

async function requestDashboardPatientBestMatch(
  routePatientId: number,
  detail: PatientDetailApiData | undefined,
  profile: ProfileApiData | undefined,
  token: string,
): Promise<DashboardPatientProfile | undefined> {
  const candidateIds = [
    detail?.id_paciente,
    detail?.id_perfil,
    detail?.id_usuario,
    routePatientId,
  ]
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);

  const uniqueCandidateIds = [...new Set(candidateIds)];

  for (const candidateId of uniqueCandidateIds) {
    const dashboardRes = await requestDashboardPatientByIdWithFallback(candidateId, token);
    const dashboardPerfil = dashboardRes?.data?.perfil;
    if (isSamePatient(detail, profile, dashboardPerfil)) {
      return dashboardPerfil;
    }
  }

  return undefined;
}

function toViewModel(profile?: ProfileApiData, detail?: PatientDetailApiData, dashboardPerfil?: DashboardPatientProfile): ClinicalProfileView {
  const canUseDashboardPerfil = isSamePatient(detail, profile, dashboardPerfil);
  const birthDateRaw = canUseDashboardPerfil
    ? (dashboardPerfil?.fecha_nacimiento || detail?.fecha_nacimiento || profile?.fecha_nacimiento)
    : (detail?.fecha_nacimiento || profile?.fecha_nacimiento);
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
    profileId:
      typeof profile?.id_perfil === "number"
        ? profile.id_perfil
        : typeof detail?.id_perfil === "number"
          ? detail.id_perfil
          : null,
    fullName,
    birthDate: formatDate(birthDateRaw),
    age: canUseDashboardPerfil ? formatAge(dashboardPerfil?.edad, birthDateRaw) : formatAgeFromBirthDate(birthDateRaw),
    sex: formatSex(canUseDashboardPerfil ? (dashboardPerfil?.sexo || detail?.sexo || profile?.sexo) : (detail?.sexo || profile?.sexo)),
    email: detail?.correo_institucional || detail?.correo || detail?.email || profile?.correo_institucional || profile?.correo || profile?.email || dashboardPerfil?.correo_institucional || "---",
    activityLevelKey: normalizeActivityKey(
      canUseDashboardPerfil
        ? (dashboardPerfil?.nivel_actividad_fisica || profile?.nivel_actividad_fisica || detail?.nivel_actividad_fisica)
        : (profile?.nivel_actividad_fisica || detail?.nivel_actividad_fisica),
    ),
    sports,
    medicalConditions: profile?.condiciones || [],
    medicalObservation: (canUseDashboardPerfil ? dashboardPerfil?.objetivo : undefined) || profile?.objetivo || "---",
    allergiesRaw: profile?.alergias_intolerancias || "---",
    preferredFoods,
    dislikesOrRestrictions: profile?.restricciones_alimenticias || "---",
  };
}

type EvaluationFormState = {
  fecha_evaluacion: string;
  peso_kg: string;
  altura_cm: string;
  porcentaje_grasa: string;
  masa_muscular_kg: string;
  agua_corporal_pct: string;
  grasa_visceral: string;
  masa_osea_kg: string;
};

type CreateEvaluationPayload = {
  id_perfil: number;
  peso_kg: number;
  altura_cm: number;
  porcentaje_grasa: number;
  masa_muscular_kg: number;
  agua_corporal_pct: number;
  grasa_visceral: number;
  masa_osea_kg: number;
  fecha_evaluacion: string;
};

type CalculatedMetricsView = {
  imc: ReactNode;
  tmb: ReactNode;
  get: ReactNode;
  calorias: ReactNode;
  edadMetabolica: ReactNode;
};

function defaultCalculatedMetrics(): CalculatedMetricsView {
  return {
    imc: "---",
    tmb: "---",
    get: "---",
    calorias: "---",
    edadMetabolica: "---",
  };
}

function toNumberLabel(value: unknown, suffix = ""): string {
  if (value === null || value === undefined || value === "") return "---";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  const fixed = Number.isInteger(parsed) ? parsed.toString() : parsed.toFixed(2);
  return `${fixed}${suffix}`;
}

function pickValueByKeys(source: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function parseAgeLabel(ageLabel: string): number | undefined {
  const parsed = Number((ageLabel || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function objectiveAdjustmentFactor(objective: string): number {
  const raw = normalizeText(objective || "");
  if (!raw) return 0;
  if (raw.includes("reduc") || raw.includes("bajar") || raw.includes("perder")) return -0.15;
  if (raw.includes("aument") || raw.includes("ganar") || raw.includes("subir")) return 0.1;
  return 0;
}

function activityFactor(activityKey: string): number {
  if (activityKey === "alto") return 1.725;
  if (activityKey === "medio") return 1.55;
  if (activityKey === "bajo") return 1.375;
  return 1.2;
}

function estimateMetabolicAge(chronologicalAge: number, bmi: number, bodyFatPct: number): number {
  const bodyFatReference = 24;
  const bmiReference = 22;
  const extraFromFat = (bodyFatPct - bodyFatReference) * 0.45;
  const extraFromBmi = (bmi - bmiReference) * 0.6;
  const estimate = chronologicalAge + extraFromFat + extraFromBmi;
  if (!Number.isFinite(estimate)) return chronologicalAge;
  return Math.max(12, Math.round(estimate));
}

function classifyImc(value: number): { label: string; className: string } {
  if (value < 18.5) return { label: "BAJO PESO", className: "text-sky-500" };
  if (value < 25) return { label: "NORMAL", className: "text-[#647F16]" };
  if (value < 30) return { label: "SOBREPESO", className: "text-amber-500" };
  if (value < 35) return { label: "OBESIDAD 1", className: "text-orange-500" };
  if (value < 40) return { label: "OBESIDAD 2", className: "text-[#B7602B]" };
  return { label: "OBESIDAD 3", className: "text-red-600" };
}

function formatImcLabel(value: number): ReactNode {
  const { label, className } = classifyImc(value);
  return (
    <span className="text-foreground">
      {value.toFixed(2)} <span className={className}>{label}</span>
    </span>
  );
}

function mapCalculatedMetricsFromResponse(rawResponse: unknown): CalculatedMetricsView {
  if (!rawResponse || typeof rawResponse !== "object") return defaultCalculatedMetrics();

  const root = rawResponse as Record<string, unknown>;
  const baseData = (root.data && typeof root.data === "object")
    ? (root.data as Record<string, unknown>)
    : root;

  const nestedData = (baseData.data && typeof baseData.data === "object")
    ? (baseData.data as Record<string, unknown>)
    : null;

  const evaluationData = (baseData.evaluacion && typeof baseData.evaluacion === "object")
    ? (baseData.evaluacion as Record<string, unknown>)
    : null;

  const data = evaluationData || nestedData || baseData;

  const otros = (data.otros_indicadores && typeof data.otros_indicadores === "object")
    ? (data.otros_indicadores as Record<string, unknown>)
    : {};

  const imcRaw = pickValueByKeys(data, ["imc", "indice_masa_corporal"]);
  const imcParsed = typeof imcRaw === "number" ? imcRaw : typeof imcRaw === "string" ? Number(imcRaw) : NaN;
  const tmbRaw = pickValueByKeys(data, ["tmb_kcal", "tmb", "tasa_metabolica_basal", "tasa_metabolica_basal_kcal"]);
  const getRaw = pickValueByKeys(data, [
    "get_kcal",
    "get",
    "get_calculado",
    "gasto_energetico_total",
    "gasto_energetico_total_kcal",
    "gasto_energetico_total_calculado",
    "gasto_energetico_diario",
  ]) ?? pickValueByKeys(otros, ["get_kcal", "get", "gasto_energetico_total", "gasto_energetico_total_kcal"]);
  const caloriesRaw = pickValueByKeys(data, [
    "calorias_diarias_calculadas",
    "calorias_diarias_recomendadas",
    "calorias_recomendadas",
    "calorias_objetivo",
    "energia_recomendada_kcal",
  ]);
  const metabolicAgeRaw = pickValueByKeys(otros, ["edad_metabolica", "edad_metabolica_anos", "metabolic_age"])
    ?? pickValueByKeys(data, ["edad_metabolica", "edad_metabolica_anos", "metabolic_age"]);

  return {
    imc: Number.isFinite(imcParsed) ? formatImcLabel(imcParsed) : toNumberLabel(imcRaw),
    tmb: toNumberLabel(tmbRaw, " kcal"),
    get: toNumberLabel(getRaw, " kcal"),
    calorias: toNumberLabel(caloriesRaw, " kcal"),
    edadMetabolica: toNumberLabel(metabolicAgeRaw, " años"),
  };
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toOptionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function requestCreateEvaluationWithFallback(payload: CreateEvaluationPayload, token: string): Promise<unknown> {
  let lastError: unknown;
  for (const base of CLINICAL_EVALUATION_ENDPOINTS) {
    try {
      return await apiRequest(`${base}`, {
        method: "POST",
        accessToken: token,
        body: payload,
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export function TabPerfilClinico({ patientId }: { patientId: number }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ClinicalProfileView>(toViewModel(undefined, undefined));
  const [submittingEvaluation, setSubmittingEvaluation] = useState(false);
  const [calculatedMetrics, setCalculatedMetrics] = useState<CalculatedMetricsView>(defaultCalculatedMetrics());
  const [evaluationForm, setEvaluationForm] = useState<EvaluationFormState>({
    fecha_evaluacion: todayIsoDate(),
    peso_kg: "",
    altura_cm: "",
    porcentaje_grasa: "",
    masa_muscular_kg: "",
    agua_corporal_pct: "",
    grasa_visceral: "",
    masa_osea_kg: "",
  });

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
        const dashboardPerfil = await requestDashboardPatientBestMatch(
          patientId,
          detailRes?.data,
          profileRes.data,
          token,
        );
        setProfile(toViewModel(profileRes.data, detailRes?.data, dashboardPerfil));
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

  const imcPreview = useMemo(() => {
    const peso = toOptionalNumber(evaluationForm.peso_kg);
    const altura = toOptionalNumber(evaluationForm.altura_cm);
    if (!peso || !altura || altura <= 0) return "---";
    const meters = altura / 100;
    const imc = peso / (meters * meters);
    return Number.isFinite(imc) ? imc.toFixed(2) : "---";
  }, [evaluationForm.altura_cm, evaluationForm.peso_kg]);

  const estimatedCalculatedMetrics = useMemo<CalculatedMetricsView>(() => {
    const peso = toOptionalNumber(evaluationForm.peso_kg);
    const alturaCm = toOptionalNumber(evaluationForm.altura_cm);
    const grasaPct = toOptionalNumber(evaluationForm.porcentaje_grasa);
    const age = parseAgeLabel(profile.age);

    if (!peso || !alturaCm || !age || alturaCm <= 0) {
      return defaultCalculatedMetrics();
    }

    const alturaM = alturaCm / 100;
    const imc = peso / (alturaM * alturaM);

    const sexNorm = normalizeText(profile.sex);
    const isFemale = sexNorm.includes("femen");
    const isMale = sexNorm.includes("mascul");
    const sexConstant = isFemale ? -161 : isMale ? 5 : -78;
    const tmb = (10 * peso) + (6.25 * alturaCm) - (5 * age) + sexConstant;
    const get = tmb * activityFactor(profile.activityLevelKey);
    const kcalObjective = get * (1 + objectiveAdjustmentFactor(profile.medicalObservation));
    const metabolicAge = grasaPct !== undefined
      ? estimateMetabolicAge(age, imc, grasaPct)
      : undefined;

    return {
      imc: Number.isFinite(imc) ? formatImcLabel(imc) : "---",
      tmb: Number.isFinite(tmb) ? `${Math.round(tmb)} kcal` : "---",
      get: Number.isFinite(get) ? `${Math.round(get)} kcal` : "---",
      calorias: Number.isFinite(kcalObjective) ? `${Math.round(kcalObjective)} kcal` : "---",
      edadMetabolica: metabolicAge !== undefined ? `${metabolicAge} años (estimado)` : "---",
    };
  }, [
    evaluationForm.altura_cm,
    evaluationForm.peso_kg,
    evaluationForm.porcentaje_grasa,
    profile.activityLevelKey,
    profile.age,
    profile.medicalObservation,
    profile.sex,
  ]);

  const handleEvaluationFieldChange = (field: keyof EvaluationFormState, value: string) => {
    setEvaluationForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveClinicalEvaluation = async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      toast({ title: "Sesion no valida", description: "No se encontro token de acceso.", variant: "destructive" });
      return;
    }

    const resolvedProfileId = profile.profileId;
    if (!resolvedProfileId || Number.isNaN(resolvedProfileId)) {
      toast({
        title: "No se pudo registrar la evaluacion",
        description: "No se encontro id_perfil del paciente.",
        variant: "destructive",
      });
      return;
    }

    const fechaEvaluacion = evaluationForm.fecha_evaluacion.trim();
    const peso = toOptionalNumber(evaluationForm.peso_kg);
    const altura = toOptionalNumber(evaluationForm.altura_cm);
    const porcentajeGrasa = toOptionalNumber(evaluationForm.porcentaje_grasa);
    const masaMuscular = toOptionalNumber(evaluationForm.masa_muscular_kg);
    const aguaCorporal = toOptionalNumber(evaluationForm.agua_corporal_pct);
    const grasaVisceral = toOptionalNumber(evaluationForm.grasa_visceral);
    const masaOsea = toOptionalNumber(evaluationForm.masa_osea_kg);

    if (!fechaEvaluacion) {
      toast({
        title: "Datos incompletos",
        description: "La fecha de evaluacion es obligatoria.",
        variant: "destructive",
      });
      return;
    }

    if (
      peso === undefined
      || altura === undefined
      || porcentajeGrasa === undefined
      || masaMuscular === undefined
      || aguaCorporal === undefined
      || grasaVisceral === undefined
      || masaOsea === undefined
    ) {
      toast({
        title: "Datos incompletos",
        description: "Todos los datos medidos son obligatorios para registrar la evaluacion.",
        variant: "destructive",
      });
      return;
    }

    if (peso <= 0 || altura <= 0 || porcentajeGrasa < 0 || masaMuscular < 0 || aguaCorporal < 0 || grasaVisceral < 0 || masaOsea < 0) {
      toast({
        title: "Datos incompletos",
        description: "Verifica los valores: peso y altura > 0, y el resto >= 0.",
        variant: "destructive",
      });
      return;
    }

    const payload: CreateEvaluationPayload = {
      id_perfil: resolvedProfileId,
      peso_kg: peso,
      altura_cm: altura,
      porcentaje_grasa: porcentajeGrasa,
      masa_muscular_kg: masaMuscular,
      agua_corporal_pct: aguaCorporal,
      grasa_visceral: grasaVisceral,
      masa_osea_kg: masaOsea,
      fecha_evaluacion: fechaEvaluacion,
    };

    setSubmittingEvaluation(true);
    try {
      const response = await requestCreateEvaluationWithFallback(payload, token);
      setCalculatedMetrics(mapCalculatedMetricsFromResponse(response));
      window.dispatchEvent(new CustomEvent("dkfitt-patient-data-updated", {
        detail: { patientId, source: "clinical-evaluation" },
      }));
      toast({
        title: "Evaluacion registrada",
        description: "La evaluacion clinica se guardo correctamente en el historial.",
      });
      setEvaluationForm((prev) => ({
        ...prev,
        fecha_evaluacion: todayIsoDate(),
        peso_kg: "",
        altura_cm: "",
        porcentaje_grasa: "",
        masa_muscular_kg: "",
        agua_corporal_pct: "",
        grasa_visceral: "",
        masa_osea_kg: "",
      }));
    } catch (error) {
      let message = "No se pudo guardar la evaluacion clinica.";
      if (error instanceof ApiError) {
        const payloadError = error.payload as { message?: string } | null;
        message = payloadError?.message || error.message || message;
      }

      toast({
        title: "Error al registrar evaluacion",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmittingEvaluation(false);
    }
  };

  const unwantedFoods = splitFoodList(profile.dislikesOrRestrictions);

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
                <User className="h-4 w-4 text-[#8A6B1F]" /> Datos Personales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex flex-col items-center gap-2">
                  <Avatar className="h-28 w-28 border-2 border-[#F7CA5E]">
                    <AvatarFallback className="text-3xl font-bold bg-[#F7CA5E]/25 text-foreground">{initials}</AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Info label="Nombre completo" value={profile.fullName} icon={<UserRound className="h-4 w-4" />} />
                  <Info label="Sexo" value={profile.sex} icon={<BadgeInfo className="h-4 w-4" />} />
                  <Info label="Fecha de nacimiento" value={profile.birthDate} icon={<CalendarDays className="h-4 w-4" />} />
                  <Info label="Edad" value={profile.age} icon={<Cake className="h-4 w-4" />} />
                  <Info label="Correo electronico" value={profile.email} icon={<Mail className="h-4 w-4" />} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#8A6B1F]" /> Actividad Fisica
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
                          ? "border-[#F7CA5E] bg-[#F7CA5E]/25 text-foreground"
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
                      <Badge key={sport} variant="outline" className="bg-[#F7CA5E]/25 text-foreground border-[#F7CA5E]/60 text-xs">
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

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-[#8A6B1F]" /> Condiciones Medicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-[max-content_max-content] xl:grid-cols-1 2xl:grid-cols-[max-content_max-content] gap-y-2 sm:gap-x-2 sm:justify-start">
                  {medicalOptions.map((condition) => {
                    const active = selectedConditionSet.has(normalizeText(condition));
                    return (
                      <div key={condition} className="justify-self-start">
                        <span
                        className={`${OPTION_WIDTH_CLASS} inline-flex rounded-md border px-2.5 py-1.5 text-xs leading-none ${
                          active
                            ? "border-[#FA9C5C]/50 bg-[#FA9C5C]/15 text-foreground font-semibold"
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
                  <AlertTriangle className="h-4 w-4 text-[#B7602B]" /> Alergias e Intolerancias
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-[max-content_max-content] xl:grid-cols-1 2xl:grid-cols-[max-content_max-content] gap-y-2 sm:gap-x-2 sm:justify-start">
                  {allergyOptions.map((allergy) => {
                    const active = selectedAllergySet.has(normalizeText(allergy));
                    return (
                      <div key={allergy} className="justify-self-start">
                        <span
                        className={`${OPTION_WIDTH_CLASS} inline-flex rounded-md border px-2.5 py-1.5 text-xs leading-none ${
                          active
                            ? "border-[#FA9C5C]/50 bg-[#FA9C5C]/15 text-foreground font-semibold"
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
          </div>

          <Card className="border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Apple className="h-4 w-4 text-[#8A6B1F]" /> Preferencias Alimenticias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                {prefCategories.map((category) => {
                  const tone = preferenceCategoryTone[category.key];
                  const CategoryIcon = preferenceCategoryIcon[category.key];

                  return (
                    <div key={category.key} className="space-y-2">
                      <div className="flex justify-center">
                        <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-[#253027] ${tone.pill}`}>
                          <CategoryIcon className="h-3.5 w-3.5" />
                          {category.label}
                        </div>
                      </div>
                      <div className={`min-h-[92px] rounded-xl border p-3 ${tone.panel}`}>
                        <div className="flex flex-col gap-1.5">
                          {(foodsByCategory[category.key] || []).length > 0 ? (
                            foodsByCategory[category.key].map((food) => (
                              <Badge key={`${category.key}-${food}`} variant="outline" className={`w-fit text-[10px] text-[#253027] ${tone.chip}`}>
                                {food}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-[#253027]/70">---</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="space-y-2">
                  <div className="flex justify-center">
                    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-[#253027] ${preferenceCategoryTone.noDeseados.pill}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Alimentos no deseados
                    </div>
                  </div>
                  <div className={`min-h-[92px] rounded-xl border p-3 ${preferenceCategoryTone.noDeseados.panel}`}>
                    <div className="flex flex-col gap-1.5">
                      {unwantedFoods.length > 0 ? (
                        unwantedFoods.map((food) => (
                          <Badge key={`unwanted-${food}`} variant="outline" className={`w-fit text-[10px] text-[#253027] ${preferenceCategoryTone.noDeseados.chip}`}>
                            {food}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-[#253027]/70">---</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-[#8A6B1F]" /> Registro de Evaluacion Clinica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-3">
                  <MetricInput
                    label="Fecha de evaluacion *"
                    value={evaluationForm.fecha_evaluacion}
                    onChange={(value) => handleEvaluationFieldChange("fecha_evaluacion", value)}
                    type="date"
                    icon={<CalendarDays className="h-4 w-4" />}
                  />
                  <MetricInput
                    label="Peso (kg) *"
                    value={evaluationForm.peso_kg}
                    onChange={(value) => handleEvaluationFieldChange("peso_kg", value)}
                    step="0.1"
                    min="0"
                    icon={<Scale className="h-4 w-4" />}
                  />
                </div>

                <div className="space-y-3">
                  <MetricInput
                    label="Altura (cm) *"
                    value={evaluationForm.altura_cm}
                    onChange={(value) => handleEvaluationFieldChange("altura_cm", value)}
                    step="0.1"
                    min="0"
                    icon={<Ruler className="h-4 w-4" />}
                  />
                  <MetricInput
                    label="Porcentaje grasa (%) *"
                    value={evaluationForm.porcentaje_grasa}
                    onChange={(value) => handleEvaluationFieldChange("porcentaje_grasa", value)}
                    step="0.1"
                    min="0"
                    icon={<Percent className="h-4 w-4" />}
                  />
                </div>

                <div className="space-y-3">
                  <MetricInput
                    label="Masa muscular (kg) *"
                    value={evaluationForm.masa_muscular_kg}
                    onChange={(value) => handleEvaluationFieldChange("masa_muscular_kg", value)}
                    step="0.1"
                    min="0"
                    icon={<Dumbbell className="h-4 w-4" />}
                  />
                  <MetricInput
                    label="Agua corporal (%) *"
                    value={evaluationForm.agua_corporal_pct}
                    onChange={(value) => handleEvaluationFieldChange("agua_corporal_pct", value)}
                    step="0.1"
                    min="0"
                    icon={<Droplets className="h-4 w-4" />}
                  />
                </div>

                <div className="space-y-3">
                  <MetricInput
                    label="Grasa visceral *"
                    value={evaluationForm.grasa_visceral}
                    onChange={(value) => handleEvaluationFieldChange("grasa_visceral", value)}
                    step="0.1"
                    min="0"
                    icon={<Gauge className="h-4 w-4" />}
                  />
                  <MetricInput
                    label="Masa osea (kg) *"
                    value={evaluationForm.masa_osea_kg}
                    onChange={(value) => handleEvaluationFieldChange("masa_osea_kg", value)}
                    step="0.1"
                    min="0"
                    icon={<Bone className="h-4 w-4" />}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold tracking-wide text-foreground">DATOS CALCULADOS</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <CalculatedInfo label="Indice de Masa Corporal (IMC)" value={calculatedMetrics.imc !== "---" ? calculatedMetrics.imc : estimatedCalculatedMetrics.imc} imageSrc="/iconos/imc.webp" />
                  <CalculatedInfo label="Tasa Metabólica Basal (TMB)" value={calculatedMetrics.tmb !== "---" ? calculatedMetrics.tmb : estimatedCalculatedMetrics.tmb} imageSrc="/iconos/tmb.webp" />
                  <CalculatedInfo label="Gasto Energetico Total (GET)" value={calculatedMetrics.get !== "---" ? calculatedMetrics.get : estimatedCalculatedMetrics.get} imageSrc="/iconos/get.webp" />
                  <CalculatedInfo label="Calorias Diarias Recomendadas" value={calculatedMetrics.calorias !== "---" ? calculatedMetrics.calorias : estimatedCalculatedMetrics.calorias} imageSrc="/iconos/calorias.webp" />
                  <CalculatedInfo label="Edad Metabolica" value={calculatedMetrics.edadMetabolica !== "---" ? calculatedMetrics.edadMetabolica : estimatedCalculatedMetrics.edadMetabolica} imageSrc="/iconos/edad.webp" />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="button" onClick={() => void handleSaveClinicalEvaluation()} disabled={submittingEvaluation}>
                  {submittingEvaluation ? "Guardando..." : "Guardar evaluacion"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-[0_8px_18px_rgba(37,48,39,0.08)]">
      {icon ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F7CA5E]/30 text-[#253027]">
          {icon}
        </div>
      ) : null}
      <div className="min-w-0 space-y-1">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        <p className="break-words text-sm font-semibold text-foreground">{value || "---"}</p>
      </div>
    </div>
  );
}

function MetricInput({
  label,
  value,
  onChange,
  step,
  min,
  type = "number",
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  step?: string;
  min?: string;
  type?: "date" | "number";
  icon?: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
        {icon ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F7CA5E]/25 text-[#253027]">
            {icon}
          </div>
        ) : null}
        <Input
          type={type}
          inputMode={type === "number" ? "decimal" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          step={step}
          min={min}
          className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
        />
      </div>
    </div>
  );
}

function CalculatedInfo({ label, value, imageSrc }: { label: string; value: ReactNode; imageSrc: string }) {
  return (
    <div className="relative min-h-[112px] overflow-hidden rounded-xl border border-border bg-card p-4 shadow-[0_10px_22px_rgba(37,48,39,0.08)]">
      <img
        src={imageSrc}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-2 h-12 w-12 object-contain opacity-85"
      />
      <div className="relative z-10 pr-12">
        <p className="text-[11px] font-medium leading-snug text-muted-foreground">{label}</p>
        <p className="mt-3 text-lg font-bold text-foreground">{value || "---"}</p>
      </div>
    </div>
  );
}
