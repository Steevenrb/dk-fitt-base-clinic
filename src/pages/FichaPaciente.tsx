import { ArrowLeft, Edit, Ban } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabResumen } from "@/components/ficha/TabResumen";
import { TabPerfilClinico } from "@/components/ficha/TabPerfilClinico";
import { TabEvaluaciones } from "@/components/ficha/TabEvaluaciones";
import { TabPlan } from "@/components/ficha/TabPlan";
import { TabSeguimiento } from "@/components/ficha/TabSeguimiento";
import { TabConsumo } from "@/components/ficha/TabConsumo";
import { TabAlertas } from "@/components/ficha/TabAlertas";
import { TabCitas } from "@/components/ficha/TabCitas";

const FichaPaciente = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const patientId = Number(id || 0);

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
                <h1 className="text-xl font-bold text-foreground">María González</h1>
                <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30 text-[11px]">Activo</Badge>
                <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[11px]">Adherencia Media</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">Obesidad grado I · 34 años · Inicio: 15 Ene 2026</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs text-accent border-accent/30 hover:bg-accent/10">
              <Ban className="h-3.5 w-3.5" /> Suspender plan
            </Button>
            <Button size="sm" className="gap-1.5 text-xs">
              <Edit className="h-3.5 w-3.5" /> Editar
            </Button>
          </div>
        </div>

        {/* Tabs */}
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

          <TabsContent value="resumen"><TabResumen /></TabsContent>
          <TabsContent value="perfil"><TabPerfilClinico patientId={patientId} /></TabsContent>
          <TabsContent value="evaluaciones"><TabEvaluaciones /></TabsContent>
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
