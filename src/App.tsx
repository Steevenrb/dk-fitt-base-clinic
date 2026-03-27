import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login.tsx";
import Index from "./pages/Index.tsx";
import Pacientes from "./pages/Pacientes.tsx";
import FichaPaciente from "./pages/FichaPaciente.tsx";
import PlanesNutricionales from "./pages/PlanesNutricionales.tsx";
import Seguimiento from "./pages/Seguimiento.tsx";
import Alertas from "./pages/Alertas.tsx";
import Citas from "./pages/Citas.tsx";
import AlimentosRecetas from "./pages/AlimentosRecetas.tsx";
import DashboardAdmin from "./pages/admin/DashboardAdmin.tsx";
import GestionUsuarios from "./pages/admin/GestionUsuarios.tsx";
import EstadisticasSistema from "./pages/admin/EstadisticasSistema.tsx";
import HistorialActividad from "./pages/admin/HistorialActividad.tsx";
import Configuracion from "./pages/admin/Configuracion.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: "admin" | "nutricionista" }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && user?.role !== role) return <Navigate to={user?.role === "admin" ? "/admin" : "/"} replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to={user?.role === "admin" ? "/admin" : "/"} replace /> : <Login />} />

      {/* Nutricionista routes */}
      <Route path="/" element={<ProtectedRoute role="nutricionista"><Index /></ProtectedRoute>} />
      <Route path="/pacientes" element={<ProtectedRoute role="nutricionista"><Pacientes /></ProtectedRoute>} />
      <Route path="/pacientes/:id" element={<ProtectedRoute role="nutricionista"><FichaPaciente /></ProtectedRoute>} />
      <Route path="/planes" element={<ProtectedRoute role="nutricionista"><PlanesNutricionales /></ProtectedRoute>} />
      <Route path="/alimentos" element={<ProtectedRoute role="nutricionista"><AlimentosRecetas /></ProtectedRoute>} />
      <Route path="/seguimiento" element={<ProtectedRoute role="nutricionista"><Seguimiento /></ProtectedRoute>} />
      <Route path="/alertas" element={<ProtectedRoute role="nutricionista"><Alertas /></ProtectedRoute>} />
      <Route path="/citas" element={<ProtectedRoute role="nutricionista"><Citas /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute role="admin"><DashboardAdmin /></ProtectedRoute>} />
      <Route path="/admin/usuarios" element={<ProtectedRoute role="admin"><GestionUsuarios /></ProtectedRoute>} />
      <Route path="/admin/estadisticas" element={<ProtectedRoute role="admin"><EstadisticasSistema /></ProtectedRoute>} />
      <Route path="/admin/historial" element={<ProtectedRoute role="admin"><HistorialActividad /></ProtectedRoute>} />
      <Route path="/admin/configuracion" element={<ProtectedRoute role="admin"><Configuracion /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
