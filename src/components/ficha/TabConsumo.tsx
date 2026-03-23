import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ExtraFood {
  id: number;
  name: string;
  description: string;
  date: string;
  calories: number;
  impact: "bajo" | "moderado" | "alto";
  imageUrl: string;
}

const extras: ExtraFood[] = [
  { id: 1, name: "Pan dulce", description: "Concha de chocolate del desayuno", date: "22 Mar 2026", calories: 320, impact: "alto", imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&h=200&fit=crop" },
  { id: 2, name: "Jugo natural", description: "Jugo de naranja con zanahoria, 350ml", date: "21 Mar 2026", calories: 140, impact: "moderado", imageUrl: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=300&h=200&fit=crop" },
  { id: 3, name: "Frutos secos", description: "Mix de nueces y arándanos secos, porción extra", date: "20 Mar 2026", calories: 180, impact: "moderado", imageUrl: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=300&h=200&fit=crop" },
  { id: 4, name: "Helado", description: "1 bola de helado de vainilla artesanal", date: "19 Mar 2026", calories: 250, impact: "alto", imageUrl: "https://images.unsplash.com/photo-1570197571499-166b36435e9f?w=300&h=200&fit=crop" },
  { id: 5, name: "Galletas integrales", description: "3 galletas de avena con miel", date: "18 Mar 2026", calories: 90, impact: "bajo", imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&h=200&fit=crop" },
  { id: 6, name: "Refresco light", description: "Lata de refresco sin azúcar, 355ml", date: "17 Mar 2026", calories: 5, impact: "bajo", imageUrl: "https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=300&h=200&fit=crop" },
];

const impactConfig = {
  bajo: { label: "Bajo", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  moderado: { label: "Moderado", className: "bg-primary/15 text-primary border-primary/30" },
  alto: { label: "Alto", className: "bg-accent/20 text-accent border-accent/30" },
};

export function TabConsumo() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground">Registro de Consumo Adicional</h3>
        <p className="text-xs text-muted-foreground mt-1">Alimentos fuera del plan nutricional reportados por la paciente</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {extras.map((item) => {
          const impact = impactConfig[item.impact];
          return (
            <div key={item.id} className="rounded-xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-lg hover:shadow-primary/5">
              <Dialog>
                <DialogTrigger asChild>
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-36 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  />
                </DialogTrigger>
                <DialogContent className="max-w-lg p-0 overflow-hidden">
                  <img src={item.imageUrl} alt={item.name} className="w-full" />
                </DialogContent>
              </Dialog>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{item.name}</p>
                  <Badge variant="outline" className={`text-[10px] ${impact.className}`}>{impact.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.description}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{item.date}</span>
                  <span className="font-semibold text-foreground">{item.calories} kcal</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
