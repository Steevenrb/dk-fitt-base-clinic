import { LayoutDashboard, Users, BarChart3, History, Settings, LogOut, Sun, Moon } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { title: "Dashboard Admin", url: "/admin", icon: LayoutDashboard },
  { title: "Gestión de Usuarios", url: "/admin/usuarios", icon: Users },
  { title: "Estadísticas del Sistema", url: "/admin/estadisticas", icon: BarChart3 },
  { title: "Historial de Actividad", url: "/admin/historial", icon: History },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  const logoSrc = theme === "light" ? "/logo_DKFitt_invertido.png" : "/logo_DKFitt.png";

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarContent>
          <div className="flex flex-col items-center justify-center px-4 pt-6 pb-4">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl transparent">
              <img src={logoSrc} alt="DK Fitt" className="h-24 w-24 object-contain" />
            </div>
            {!collapsed && (
              <span className="mt-1 text-center text-lg font-bold tracking-tight text-foreground">
                Panel <span className="text-primary">Administrativo</span>
              </span>
            )}
          </div>

          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const isActive = item.url === "/admin"
                    ? location.pathname === "/admin"
                    : location.pathname.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <NavLink to={item.url} end={item.url === "/admin"} className={`hover:bg-sidebar-accent ${isActive ? "bg-sidebar-accent text-primary font-semibold" : ""}`} activeClassName="bg-sidebar-accent text-primary font-semibold">
                          <item.icon className="mr-2 h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-3">
          <button onClick={toggleTheme} className="flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
            {theme === "dark" ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            {!collapsed && <span>{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>}
          </button>
        </SidebarFooter>
      </Sidebar>

      <Dialog open={showLogout} onOpenChange={setShowLogout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Deseas cerrar sesión?</DialogTitle>
            <DialogDescription>Serás redirigido a la pantalla de inicio de sesión.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogout(false)}>Cancelar</Button>
            <Button onClick={handleLogout} className="bg-primary text-primary-foreground">Cerrar sesión</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
