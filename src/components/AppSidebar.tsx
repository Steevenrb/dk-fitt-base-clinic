import {
  LayoutDashboard, Users, ClipboardList, UtensilsCrossed,
  Activity, Bell, CalendarDays,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/use-theme";

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
  const { theme } = useTheme();
  const logoSrc = theme === "light" ? "/logo_DKFitt_invertido.png" : "/logo_DKFitt.png";

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarContent>
          <div className={`flex flex-col items-center justify-center px-4 ${collapsed ? "pt-4 pb-3" : "pt-6 pb-4"}`}>
            <div className={`flex shrink-0 items-center justify-center rounded-xl transparent ${collapsed ? "h-12 w-12" : "h-28 w-28"}`}>
              <img src={logoSrc} alt="DK Fitt" className={collapsed ? "h-10 w-10 object-contain" : "h-24 w-24 object-contain"} />
            </div>
            {!collapsed && (
              <span className="mt-1 text-center text-lg font-bold tracking-tight text-foreground">
                Panel <span className="text-primary">Clinico</span>
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
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </>
  );
}
