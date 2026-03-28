import {
  LayoutDashboard, Users, ClipboardList, UtensilsCrossed,
  Activity, Bell, CalendarDays, Sun, Moon, LogOut, UserCircle,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Pacientes", url: "/pacientes", icon: Users },
  { title: "Planes Nutricionales", url: "/planes", icon: ClipboardList },
  { title: "Alimentos y Recetas", url: "/alimentos", icon: UtensilsCrossed },
  { title: "Seguimiento", url: "/seguimiento", icon: Activity },
  { title: "Alertas", url: "/alertas", icon: Bell },
  { title: "Citas", url: "/citas", icon: CalendarDays },
];

export function AppSidebar() {
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

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarContent>
          <div className="flex items-center gap-3 px-4 py-6">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">DK</span>
            </div>
            {!collapsed && (
              <span className="text-lg font-bold tracking-tight text-foreground">
                DK <span className="text-primary">Fitt</span>
              </span>
            )}
          </div>

          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const isActive = item.url === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <NavLink to={item.url} end={item.url === "/"} className={`hover:bg-sidebar-accent ${isActive ? "bg-sidebar-accent text-primary font-semibold" : ""}`} activeClassName="bg-sidebar-accent text-primary font-semibold">
                          <item.icon className="mr-2 h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
                {/* Separator */}
                <div className="my-2 border-t border-sidebar-border" />
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === "/mi-perfil"}>
                    <NavLink to="/mi-perfil" className={`hover:bg-sidebar-accent ${location.pathname === "/mi-perfil" ? "bg-sidebar-accent text-primary font-semibold" : ""}`} activeClassName="bg-sidebar-accent text-primary font-semibold">
                      <UserCircle className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Mi Perfil</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setShowLogout(true)} className="hover:bg-sidebar-accent text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    {!collapsed && <span>Cerrar sesión</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
