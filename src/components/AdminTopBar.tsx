import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function AdminTopBar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border border-border">
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">AD</AvatarFallback>
          </Avatar>
          <div className="hidden md:block">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-none text-foreground">Administrador</p>
              <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">Admin</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Panel de administracion</p>
          </div>
        </div>
      </div>
    </header>
  );
}
