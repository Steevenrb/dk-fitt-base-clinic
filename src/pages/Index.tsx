import { AppLayout } from "@/components/AppLayout";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { WeightChart } from "@/components/dashboard/WeightChart";
import { CaloriesChart } from "@/components/dashboard/CaloriesChart";
import { PatientsTable } from "@/components/dashboard/PatientsTable";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";

const Index = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Resumen clínico · semana del 16 al 23 de marzo 2026</p>
        </div>

        {/* KPIs */}
        <KpiCards />

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <WeightChart />
          <CaloriesChart />
        </div>

        {/* Patients + Alerts */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <PatientsTable />
          </div>
          <AlertsPanel />
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
