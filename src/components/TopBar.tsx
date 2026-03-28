import { ReactNode, useState } from "react";
import { Bell, Sun, Moon, LogOut, User, Lock, Settings } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from "@/components/ui/dropdown-menu";

interface TopBarProps {
  children?: ReactNode;
}

export function TopBar({ children }: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6 shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />
          {children}
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground" title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">5</span>
          </Button>

          <Button variant="ghost" size="icon" onClick={() => setShowLogout(true)} className="text-muted-foreground hover:text-foreground" title="Cerrar sesión">
            <LogOut className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border border-border">
              <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                {user?.avatar || "NK"}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block">
              <p className="text-sm font-medium leading-none text-foreground">{user?.name || "Nutricionista Karen"}</p>
              <p className="text-xs text-muted-foreground">Nutrióloga clínica</p>
            </div>
          </div>
        </div>
      </header>

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
