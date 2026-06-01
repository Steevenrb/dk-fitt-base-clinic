import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login.tsx";
import Index from "./pages/Index.tsx";
import Pacientes from "./pages/Pacientes.tsx";
import FichaPaciente from "./pages/FichaPaciente.tsx";
import PlanesNutricionales from "./pages/PlanesNutricionales.tsx";
import PlanesIndex from "./pages/PlanesIndex.tsx";
import Seguimiento from "./pages/Seguimiento.tsx";
import Alertas from "./pages/Alertas.tsx";
import Citas from "./pages/Citas.tsx";
import AlimentosRecetas from "./pages/AlimentosRecetas.tsx";
import MiPerfil from "./pages/MiPerfil.tsx";
import DashboardAdmin from "./pages/admin/DashboardAdmin.tsx";
import GestionUsuarios from "./pages/admin/GestionUsuarios.tsx";
import HistorialActividad from "./pages/admin/HistorialActividad.tsx";
import NotFound from "./pages/NotFound.tsx";
import ChangePasswordRequired from "./pages/ChangePasswordRequired.tsx";

const queryClient = new QueryClient();

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: "admin" | "nutricionista" }) {
  const { isAuthenticated, user, requiresPasswordChange } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiresPasswordChange && location.pathname !== "/cambiar-contrasena") {
    return <Navigate to="/cambiar-contrasena" replace />;
  }
  if (role && user?.role !== role) return <Navigate to={user?.role === "admin" ? "/admin" : "/"} replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, user, requiresPasswordChange } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated
            ? <Navigate to={requiresPasswordChange ? "/cambiar-contrasena" : (user?.role === "admin" ? "/admin" : "/")} replace />
            : <Login />
        }
      />
      <Route path="/cambiar-contrasena" element={<ProtectedRoute><ChangePasswordRequired /></ProtectedRoute>} />

      {/* Nutricionista routes */}
      <Route path="/" element={<ProtectedRoute role="nutricionista"><Index /></ProtectedRoute>} />
      <Route path="/pacientes" element={<ProtectedRoute role="nutricionista"><Pacientes /></ProtectedRoute>} />
      <Route path="/pacientes/:id" element={<ProtectedRoute role="nutricionista"><FichaPaciente /></ProtectedRoute>} />
      <Route path="/planes" element={<ProtectedRoute role="nutricionista"><PlanesIndex /></ProtectedRoute>} />
      <Route path="/planes/ver/:id" element={<ProtectedRoute role="nutricionista"><PlanesNutricionales /></ProtectedRoute>} />
      <Route path="/alimentos" element={<ProtectedRoute role="nutricionista"><AlimentosRecetas /></ProtectedRoute>} />
      <Route path="/seguimiento" element={<ProtectedRoute role="nutricionista"><Seguimiento /></ProtectedRoute>} />
      <Route path="/alertas" element={<ProtectedRoute role="nutricionista"><Alertas /></ProtectedRoute>} />
      <Route path="/citas" element={<ProtectedRoute role="nutricionista"><Citas /></ProtectedRoute>} />
      <Route path="/mi-perfil" element={<ProtectedRoute role="nutricionista"><MiPerfil /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute role="admin"><DashboardAdmin /></ProtectedRoute>} />
      <Route path="/admin/usuarios" element={<ProtectedRoute role="admin"><GestionUsuarios /></ProtectedRoute>} />
      <Route path="/admin/historial" element={<ProtectedRoute role="admin"><HistorialActividad /></ProtectedRoute>} />
      

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
