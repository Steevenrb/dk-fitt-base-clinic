import { AppLayout } from "@/components/AppLayout";

const Index = () => {
  return (
    <AppLayout>
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">
            Bienvenida a <span className="text-primary">DK Fitt</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Tu sistema de gestión clínica nutricional
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
