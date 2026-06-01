import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { ReactNode } from "react";

interface AppLayoutProps {
  children: ReactNode;
  topBarContent?: ReactNode;
}

export function AppLayout({ children, topBarContent }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-x-hidden">
        <AppSidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar>{topBarContent}</TopBar>
          <main className="flex-1 min-w-0 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
