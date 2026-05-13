import { useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Apple, BookOpen, ChefHat } from "lucide-react";

import { Alimento, Receta, alimentosDB, recetasEjemplo } from "@/components/alimentos/alimentosData";
import { TabAlimentos } from "@/components/alimentos/TabAlimentos";
import { TabRecetas } from "@/components/alimentos/TabRecetas";
import { TabConstructor } from "@/components/alimentos/TabConstructor";

const AlimentosRecetas = () => {
  const [activeTab, setActiveTab] = useState("alimentos");
  const [base, setBase] = useState<Alimento[]>(alimentosDB.slice(0, 12));
  const [recetas, setRecetas] = useState<Receta[]>(recetasEjemplo);
  const [editingRecipe, setEditingRecipe] = useState<Receta | null>(null);
  const [openCreateFoodSignal, setOpenCreateFoodSignal] = useState(0);
  const [recetasRefreshSignal, setRecetasRefreshSignal] = useState(0);

  const handleUseInRecipe = useCallback((a: Alimento) => {
    setActiveTab("constructor");
  }, []);

  const handleSaveRecipe = useCallback((r: Receta) => {
    setRecetas(prev => {
      const exists = prev.find(p => p.id === r.id);
      if (exists) return prev.map(p => p.id === r.id ? r : p);
      return [...prev, r];
    });
    setEditingRecipe(null);
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestión de Alimentos y Recetas</h1>
            <p className="text-muted-foreground text-sm mt-1">Composición nutricional y creación de recetas personalizadas</p>
          </div>
          {activeTab === "alimentos" && (
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setActiveTab("alimentos");
                  setOpenCreateFoodSignal((prev) => prev + 1);
                }}
              >
                <Plus className="h-4 w-4 mr-2" /> Registrar un nuevo alimento
              </Button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="alimentos"><Apple className="h-4 w-4 mr-2" /> Alimentos</TabsTrigger>
            <TabsTrigger value="recetas"><BookOpen className="h-4 w-4 mr-2" /> Recetas</TabsTrigger>
            <TabsTrigger value="constructor"><ChefHat className="h-4 w-4 mr-2" /> Constructor</TabsTrigger>
          </TabsList>

          <TabsContent value="alimentos" className="mt-4">
            <TabAlimentos
              base={base}
              setBase={setBase}
              onUseInRecipe={handleUseInRecipe}
              openCreateSignal={openCreateFoodSignal}
            />
          </TabsContent>

          <TabsContent value="recetas" className="mt-4">
            <TabRecetas
              onCreateManual={() => setActiveTab("constructor")}
              refreshSignal={recetasRefreshSignal}
            />
          </TabsContent>

          <TabsContent value="constructor" className="mt-4">
            <TabConstructor
              onSaveRecipe={handleSaveRecipe}
              editingRecipe={editingRecipe}
              onClearEdit={() => setEditingRecipe(null)}
              onSavedBackend={() => {
                setActiveTab("recetas");
                setRecetasRefreshSignal((prev) => prev + 1);
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default AlimentosRecetas;
