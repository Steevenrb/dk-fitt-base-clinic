import {
  LayoutDashboard,
  Users,
  ClipboardList,
  UtensilsCrossed,
  Activity,
  Bell,
  CalendarDays,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Pacientes", url: "/pacientes", icon: Users },
  { title: "Planes Nutricionales", url: "/planes", icon: ClipboardList },
  { title: "Seguimiento", url: "/seguimiento", icon: Activity },
  { title: "Alertas", url: "/alertas", icon: Bell },
  { title: "Citas", url: "/citas", icon: CalendarDays },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Logo */}
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
                const isActive =
                  item.url === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.url);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className={`hover:bg-sidebar-accent ${isActive ? "bg-sidebar-accent text-primary font-semibold" : ""}`}
                        activeClassName="bg-sidebar-accent text-primary font-semibold"
                      >
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
  );
}
