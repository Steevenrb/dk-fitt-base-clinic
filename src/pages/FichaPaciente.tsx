import { ArrowLeft, Ban } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabResumen } from "@/components/ficha/TabResumen";
import { TabPerfilClinico } from "@/components/ficha/TabPerfilClinico";
import { TabEvaluaciones } from "@/components/ficha/TabEvaluaciones";
import { TabPlan } from "@/components/ficha/TabPlan";
import { TabSeguimiento } from "@/components/ficha/TabSeguimiento";
import { TabConsumo } from "@/components/ficha/TabConsumo";
import { TabAlertas } from "@/components/ficha/TabAlertas";
import { TabCitas } from "@/components/ficha/TabCitas";

const ACCESS_TOKEN_KEY = "dkfitt-access-token";
const PATIENT_DETAIL_ENDPOINTS = ["/api/patients", "/patients"];

type PatientHeaderView = {
  name: string;
  status: string;
  adherence: string;
  diagnosis: string;
  age: string;
  startDate: string;
  profileId: number | null;
};

function normalizeStatusLabel(value?: string): string {
  const raw = String(value || "").toLowerCase();
  if (raw === "activo") return "Activo";
  if (raw === "pendiente") return "Pendiente";
  if (raw === "suspendido") return "Suspendido";
  if (raw === "finalizado") return "Finalizado";
  return value || "";
}

function normalizeAdherenceLabel(value?: string): string {
  const raw = String(value || "").toLowerCase();
  if (raw === "alto" || raw === "alta") return "Adherencia Alta";
  if (raw === "medio" || raw === "media") return "Adherencia Media";
  if (raw === "bajo" || raw === "baja") return "Adherencia Baja";
  return value ? `Adherencia ${value}` : "";
}

function calcAgeLabel(value?: string): string {
  if (!value) return "";
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return Number.isFinite(age) && age >= 0 ? `${age} años` : "";
}

function formatStartDate(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("es-EC", { year: "numeric", month: "short", day: "2-digit" });
  return `Inicio: ${date}`;
}

async function requestPatientWithFallback(patientId: number, token: string): Promise<Record<string, unknown>> {
  let lastError: unknown;
  for (const base of PATIENT_DETAIL_ENDPOINTS) {
    try {
      const res = await apiRequest<{ success?: boolean; data?: Record<string, unknown> }>(`${base}/${patientId}`, {
        method: "GET",
        accessToken: token,
      });
      return (res.data || {}) as Record<string, unknown>;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function mapPatientHeader(item: Record<string, unknown>): PatientHeaderView {
  const name =
    String(item.nombre_completo ?? "").trim()
    || `${String(item.nombres ?? "").trim()} ${String(item.apellidos ?? "").trim()}`.trim();

  const status = normalizeStatusLabel(String(item.estado_plan ?? item.estado_tratamiento ?? item.estado ?? ""));
  const adherence = normalizeAdherenceLabel(String(item.nivel_adherencia ?? item.adherencia ?? ""));
  const diagnosis = String(item.diagnostico ?? item.objetivo ?? "").trim();
  const age = calcAgeLabel(String(item.fecha_nacimiento ?? ""));
  const startDate = formatStartDate(String(item.fecha_inicio_plan ?? item.fecha_inicio ?? item.inicio_plan ?? ""));
  const profileIdRaw = item.id_perfil ?? item.perfil_id ?? item.profile_id;
  const profileId = typeof profileIdRaw === "number" && Number.isFinite(profileIdRaw) ? profileIdRaw : null;

  return { name, status, adherence, diagnosis, age, startDate, profileId };
}

const FichaPaciente = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const patientId = Number(id || 0);
  const [loadingHeader, setLoadingHeader] = useState(true);
  const [header, setHeader] = useState<PatientHeaderView>({
    name: "",
    status: "",
    adherence: "",
    diagnosis: "",
    age: "",
    startDate: "",
    profileId: null,
  });

  useEffect(() => {
    const fetchHeader = async () => {
      if (!patientId || Number.isNaN(patientId)) {
        setLoadingHeader(false);
        return;
      }

      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) {
        setLoadingHeader(false);
        toast({ title: "Sesion no valida", description: "No se encontro token de acceso.", variant: "destructive" });
        return;
      }

      setLoadingHeader(true);
      try {
        const raw = await requestPatientWithFallback(patientId, token);
        setHeader(mapPatientHeader(raw));
      } catch {
        setHeader({ name: "", status: "", adherence: "", diagnosis: "", age: "", startDate: "", profileId: null });
        toast({ title: "No se pudo cargar ficha", description: "Verifica endpoint GET /patients/{id}.", variant: "destructive" });
      } finally {
        setLoadingHeader(false);
      }
    };

    void fetchHeader();
  }, [patientId, toast]);

  const subtitle = useMemo(() => {
    const parts = [header.diagnosis, header.age, header.startDate].filter(Boolean);
    return parts.join(" · ");
  }, [header]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back + header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/pacientes")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">{loadingHeader ? "" : header.name}</h1>
                {header.status && (
                  <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 text-[11px]">{header.status}</Badge>
                )}
                {header.adherence && (
                  <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[11px]">{header.adherence}</Badge>
                )}
              </div>
              {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs text-accent border-accent/30 hover:bg-accent/10">
              <Ban className="h-3.5 w-3.5" /> Suspender plan
            </Button>
          </div>
        </div>
        <Tabs defaultValue="resumen" className="space-y-6">
          <TabsList className="bg-card border border-border p-1 h-auto flex-wrap">
            <TabsTrigger value="resumen" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Resumen General</TabsTrigger>
            <TabsTrigger value="perfil" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Perfil Clínico</TabsTrigger>
            <TabsTrigger value="evaluaciones" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Evaluaciones Clínicas</TabsTrigger>
            <TabsTrigger value="plan" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Plan Nutricional</TabsTrigger>
            <TabsTrigger value="seguimiento" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Seguimiento</TabsTrigger>
            <TabsTrigger value="consumo" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Consumo Adicional</TabsTrigger>
            <TabsTrigger value="alertas" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Alertas</TabsTrigger>
            <TabsTrigger value="citas" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Citas</TabsTrigger>
          </TabsList>

          <TabsContent value="resumen"><TabResumen patientId={patientId} profileId={header.profileId} /></TabsContent>
          <TabsContent value="perfil"><TabPerfilClinico patientId={patientId} /></TabsContent>
          <TabsContent value="evaluaciones"><TabEvaluaciones patientId={patientId} profileId={header.profileId} /></TabsContent>
          <TabsContent value="plan"><TabPlan /></TabsContent>
          <TabsContent value="seguimiento"><TabSeguimiento /></TabsContent>
          <TabsContent value="consumo"><TabConsumo /></TabsContent>
          <TabsContent value="alertas"><TabAlertas /></TabsContent>
          <TabsContent value="citas"><TabCitas /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default FichaPaciente;
