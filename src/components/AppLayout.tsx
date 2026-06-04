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
      <div className="flex min-h-[100dvh] w-full overflow-x-hidden bg-background">
        <AppSidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar>{topBarContent}</TopBar>
          <main className="flex-1 min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
