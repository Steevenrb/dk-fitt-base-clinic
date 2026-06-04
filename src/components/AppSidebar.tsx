import {
  LayoutDashboard, Users, ClipboardList, UtensilsCrossed,
  Activity, Bell, CalendarDays,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu,
  SidebarMenuItem, useSidebar,
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
      <Sidebar collapsible="icon" className="border-r border-sidebar-border/70 bg-sidebar">
        <SidebarContent className="bg-sidebar px-2">
          <div className={`flex flex-col items-center justify-center px-4 ${collapsed ? "pt-4 pb-4" : "pt-6 pb-5"}`}>
            <img src={logoSrc} alt="DK Fitt" className={collapsed ? "h-11 w-11 object-contain" : "h-24 w-24 object-contain"} />
            {!collapsed && (
              <div className="mt-3 text-center">
                <span className="text-lg font-bold tracking-tight text-foreground">
                  Panel <span className="text-foreground">Clinico</span>
                </span>
                <p className="mt-1 text-[11px] font-medium text-sidebar-foreground/70">nutricion activa</p>
              </div>
            )}                    
          </div>
          <SidebarGroup className="px-2">
            <SidebarGroupContent>
              <SidebarMenu className="gap-3.5">
                {navItems.map((item) => {
                  const isActive = item.url === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className={`group/nav flex w-full items-center rounded-full px-3 py-2.5 text-sm transition-[background-color,color,transform] duration-200 hover:bg-[#F7CA5E]/20 hover:text-[#253027] active:scale-[0.98] ${
                          isActive ? "bg-[#F7CA5E] text-[#253027] font-semibold" : "text-sidebar-foreground"
                        } ${collapsed ? "justify-center px-2" : ""}`}
                        activeClassName="bg-[#F7CA5E] text-[#253027] font-semibold"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#253027]">
                          <item.icon className="h-4 w-4" />
                        </span>
                        {!collapsed && <span className="ml-3 truncate">{item.title}</span>}
                      </NavLink>
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
