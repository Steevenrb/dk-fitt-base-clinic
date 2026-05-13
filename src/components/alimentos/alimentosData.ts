/* ─── Shared types & data for Alimentos y Recetas ─── */

export interface Alimento {
  id: string;
  idAlimento?: number | null;
  nombre: string;
  calorias: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  grasasSaturadas: number;
  azucares: number;
  fibra: number;
  sodio: number;
  categoria: "Fruta" | "Vegetal" | "Proteína" | "Proteína vegetal" | "Cereal" | "Lácteo" | "Grasa" | "Legumbre" | "Bebida" | "Snack" | "Otro";
}

export interface Ingrediente {
  alimento: Alimento;
  cantidad: number;
  unidad: string;
  factorGramos: number;
}

export interface PacienteAsignado {
  id: string;
  nombre: string;
}

export interface Receta {
  id: string;
  nombre: string;
  categoria: "Desayuno" | "Refrigerio mañana" | "Almuerzo" | "Refrigerio tarde" | "Cena" | "Snack" | "Bebida";
  porciones: number;
  tiempoPrep: number;
  ingredientes: Ingrediente[];
  pasos: string[];
  aptitud: Record<string, boolean>;
  notaClinica: string;
  imagen?: string;
  // Campos nuevos para IA y seguimiento
  generado_por_ia?: boolean;
  id_tiempo_comida?: number;
  created_at?: Date | string;
  uso_count?: number;
  pacientes_asignados?: PacienteAsignado[];
  aptitud_clinica?: string;
}

export const unidades = [
  { value: "gramos", label: "gramos", factor: 1 },
  { value: "ml", label: "ml", factor: 1 },
  { value: "unidades", label: "unidades", factor: 100 },
  { value: "tazas", label: "tazas", factor: 240 },
  { value: "cucharadas", label: "cucharadas", factor: 15 },
];

export const catColors: Record<string, string> = {
  Fruta: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Proteína: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  Cereal: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Lácteo: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  Vegetal: "bg-lime-500/15 text-lime-400 border-lime-500/30",
  Grasa: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  Otro: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

export const recetaCatColors: Record<string, string> = {
  Desayuno: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  "Refrigerio mañana": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Almuerzo: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "Refrigerio tarde": "bg-sky-500/15 text-sky-400 border-sky-500/30",
  Cena: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  Snack: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  Bebida: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
};

// Mapeo de tiempo de comida a iconos y colores para las tarjetas
export const tiempoComidaConfig: Record<string, { icon: string; bgColor: string; iconColor: string }> = {
  Desayuno: { icon: "Sun", bgColor: "bg-yellow-100 dark:bg-yellow-950/30", iconColor: "text-yellow-600 dark:text-yellow-400" },
  "Media mañana": { icon: "Apple", bgColor: "bg-green-100 dark:bg-green-950/30", iconColor: "text-green-600 dark:text-green-400" },
  Almuerzo: { icon: "UtensilsCrossed", bgColor: "bg-orange-100 dark:bg-orange-950/30", iconColor: "text-orange-600 dark:text-orange-400" },
  "Media tarde": { icon: "Cookie", bgColor: "bg-blue-100 dark:bg-blue-950/30", iconColor: "text-blue-600 dark:text-blue-400" },
  Cena: { icon: "Moon", bgColor: "bg-violet-100 dark:bg-violet-950/30", iconColor: "text-violet-600 dark:text-violet-400" },
};

export const aptitudLabels: Record<string, string> = {
  general: "Pacientes en general",
  diabeticos: "Diabéticos",
  hipertensos: "Hipertensos",
  celiacos: "Celíacos (sin gluten)",
  lactosa: "Intolerantes a la lactosa",
  vegetarianos: "Vegetarianos",
  veganos: "Veganos",
  renal: "Insuficiencia renal",
};

export const alimentosDB: Alimento[] = [
  { id: "1", nombre: "Manzana", calorias: 52, proteinas: 0.3, carbohidratos: 13.8, grasas: 0.2, grasasSaturadas: 0, azucares: 10.4, fibra: 2.4, sodio: 1, categoria: "Fruta" },
  { id: "2", nombre: "Plátano", calorias: 89, proteinas: 1.1, carbohidratos: 22.8, grasas: 0.3, grasasSaturadas: 0.1, azucares: 12.2, fibra: 2.6, sodio: 1, categoria: "Fruta" },
  { id: "3", nombre: "Pollo a la plancha", calorias: 165, proteinas: 31, carbohidratos: 0, grasas: 3.6, grasasSaturadas: 1, azucares: 0, fibra: 0, sodio: 74, categoria: "Proteína" },
  { id: "4", nombre: "Arroz integral", calorias: 123, proteinas: 2.7, carbohidratos: 25.6, grasas: 1, grasasSaturadas: 0.2, azucares: 0.4, fibra: 1.8, sodio: 1, categoria: "Cereal" },
  { id: "5", nombre: "Aguacate", calorias: 160, proteinas: 2, carbohidratos: 8.5, grasas: 14.7, grasasSaturadas: 2.1, azucares: 0.7, fibra: 6.7, sodio: 7, categoria: "Fruta" },
  { id: "6", nombre: "Huevo", calorias: 155, proteinas: 13, carbohidratos: 1.1, grasas: 11, grasasSaturadas: 3.3, azucares: 1.1, fibra: 0, sodio: 124, categoria: "Proteína" },
  { id: "7", nombre: "Leche descremada", calorias: 34, proteinas: 3.4, carbohidratos: 5, grasas: 0.1, grasasSaturadas: 0.1, azucares: 5, fibra: 0, sodio: 42, categoria: "Lácteo" },
  { id: "8", nombre: "Espinaca", calorias: 23, proteinas: 2.9, carbohidratos: 3.6, grasas: 0.4, grasasSaturadas: 0.1, azucares: 0.4, fibra: 2.2, sodio: 79, categoria: "Vegetal" },
  { id: "9", nombre: "Avena", calorias: 389, proteinas: 16.9, carbohidratos: 66.3, grasas: 6.9, grasasSaturadas: 1.2, azucares: 0, fibra: 10.6, sodio: 2, categoria: "Cereal" },
  { id: "10", nombre: "Atún", calorias: 132, proteinas: 28.2, carbohidratos: 0, grasas: 1.3, grasasSaturadas: 0.4, azucares: 0, fibra: 0, sodio: 47, categoria: "Proteína" },
  { id: "11", nombre: "Aceite de oliva", calorias: 884, proteinas: 0, carbohidratos: 0, grasas: 100, grasasSaturadas: 14, azucares: 0, fibra: 0, sodio: 2, categoria: "Grasa" },
  { id: "12", nombre: "Brócoli", calorias: 34, proteinas: 2.8, carbohidratos: 7, grasas: 0.4, grasasSaturadas: 0, azucares: 1.7, fibra: 2.6, sodio: 33, categoria: "Vegetal" },
  { id: "13", nombre: "Quinoa", calorias: 120, proteinas: 4.4, carbohidratos: 21.3, grasas: 1.9, grasasSaturadas: 0.2, azucares: 0.9, fibra: 2.8, sodio: 7, categoria: "Cereal" },
  { id: "14", nombre: "Salmón", calorias: 208, proteinas: 20, carbohidratos: 0, grasas: 13, grasasSaturadas: 3.1, azucares: 0, fibra: 0, sodio: 59, categoria: "Proteína" },
  { id: "15", nombre: "Yogur griego natural", calorias: 97, proteinas: 9, carbohidratos: 3.6, grasas: 5, grasasSaturadas: 3.2, azucares: 3.2, fibra: 0, sodio: 36, categoria: "Lácteo" },
  { id: "16", nombre: "Almendras", calorias: 579, proteinas: 21.2, carbohidratos: 21.6, grasas: 49.9, grasasSaturadas: 3.7, azucares: 4.4, fibra: 12.5, sodio: 1, categoria: "Otro" },
  { id: "17", nombre: "Tomate", calorias: 18, proteinas: 0.9, carbohidratos: 3.9, grasas: 0.2, grasasSaturadas: 0, azucares: 2.6, fibra: 1.2, sodio: 5, categoria: "Vegetal" },
  { id: "18", nombre: "Pepino", calorias: 15, proteinas: 0.7, carbohidratos: 3.6, grasas: 0.1, grasasSaturadas: 0, azucares: 1.7, fibra: 0.5, sodio: 2, categoria: "Vegetal" },
  { id: "19", nombre: "Fresa", calorias: 32, proteinas: 0.7, carbohidratos: 7.7, grasas: 0.3, grasasSaturadas: 0, azucares: 4.9, fibra: 2, sodio: 1, categoria: "Fruta" },
  { id: "20", nombre: "Mantequilla de maní", calorias: 588, proteinas: 25, carbohidratos: 20, grasas: 50, grasasSaturadas: 10, azucares: 9, fibra: 6, sodio: 459, categoria: "Grasa" },
];

export const calcIngredienteCal = (ing: Ingrediente) => {
  const g = ing.cantidad * ing.factorGramos;
  return Math.round(ing.alimento.calorias * (g / 100));
};

export const calcTotales = (ingredientes: Ingrediente[]) => {
  const t = { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0, fibra: 0, azucares: 0, sodio: 0 };
  ingredientes.forEach(ing => {
    const ratio = (ing.cantidad * ing.factorGramos) / 100;
    t.calorias += ing.alimento.calorias * ratio;
    t.proteinas += ing.alimento.proteinas * ratio;
    t.carbohidratos += ing.alimento.carbohidratos * ratio;
    t.grasas += ing.alimento.grasas * ratio;
    t.fibra += ing.alimento.fibra * ratio;
    t.azucares += ing.alimento.azucares * ratio;
    t.sodio += ing.alimento.sodio * ratio;
  });
  return t;
};

export const calcMacroData = (totales: ReturnType<typeof calcTotales>) => {
  const calProt = totales.proteinas * 4;
  const calCarb = totales.carbohidratos * 4;
  const calGras = totales.grasas * 9;
  const total = calProt + calCarb + calGras || 1;
  return [
    { name: "Proteínas", value: Math.round((calProt / total) * 100), fill: "hsl(var(--primary))" },
    { name: "Carbohidratos", value: Math.round((calCarb / total) * 100), fill: "hsl(38, 98%, 40%)" },
    { name: "Grasas", value: Math.round((calGras / total) * 100), fill: "hsl(0, 84%, 60%)" },
  ];
};

export const chartConfig = {
  proteinas: { label: "Proteínas", color: "hsl(var(--primary))" },
  carbohidratos: { label: "Carbohidratos", color: "hsl(38, 98%, 40%)" },
  grasas: { label: "Grasas", color: "hsl(0, 84%, 60%)" },
};

/* ─── Example recipes ─── */
export const recetasEjemplo: Receta[] = [
  {
    id: "r1",
    nombre: "Bowl de proteínas",
    categoria: "Almuerzo",
    porciones: 2,
    tiempoPrep: 25,
    ingredientes: [
      { alimento: alimentosDB[2], cantidad: 150, unidad: "gramos", factorGramos: 1 },
      { alimento: alimentosDB[3], cantidad: 1, unidad: "tazas", factorGramos: 240 },
      { alimento: alimentosDB[4], cantidad: 0.5, unidad: "unidades", factorGramos: 100 },
      { alimento: alimentosDB[7], cantidad: 60, unidad: "gramos", factorGramos: 1 },
      { alimento: alimentosDB[10], cantidad: 1, unidad: "cucharadas", factorGramos: 15 },
    ],
    pasos: [
      "Cocinar la pechuga de pollo a la plancha con sal y pimienta.",
      "Cocinar el arroz integral según las instrucciones del paquete.",
      "Lavar y cortar las espinacas frescas.",
      "Cortar el aguacate en láminas.",
      "Servir el arroz como base, colocar el pollo cortado, las espinacas y el aguacate.",
      "Rociar con aceite de oliva y servir."
    ],
    aptitud: { general: true, diabeticos: true, hipertensos: true, celiacos: true, lactosa: true, vegetarianos: false, veganos: false, renal: true },
    notaClinica: "Receta alta en proteínas de calidad. Ideal para pacientes en fase de ganancia muscular o recuperación.",
    generado_por_ia: false,
    id_tiempo_comida: 2,
    created_at: "2025-04-15",
    uso_count: 3,
    pacientes_asignados: [
      { id: "p1", nombre: "María García" },
      { id: "p3", nombre: "Juan López" },
    ],
  },
  {
    id: "r2",
    nombre: "Avena con frutas",
    categoria: "Desayuno",
    porciones: 1,
    tiempoPrep: 10,
    ingredientes: [
      { alimento: alimentosDB[8], cantidad: 50, unidad: "gramos", factorGramos: 1 },
      { alimento: alimentosDB[6], cantidad: 1, unidad: "tazas", factorGramos: 240 },
      { alimento: alimentosDB[1], cantidad: 0.5, unidad: "unidades", factorGramos: 100 },
      { alimento: alimentosDB[18], cantidad: 80, unidad: "gramos", factorGramos: 1 },
    ],
    pasos: [
      "Calentar la leche descremada en una olla pequeña.",
      "Agregar la avena y cocinar a fuego medio revolviendo por 5 minutos.",
      "Servir en un bowl y agregar el plátano en rodajas y las fresas cortadas.",
      "Opcionalmente agregar canela al gusto."
    ],
    aptitud: { general: true, diabeticos: false, hipertensos: true, celiacos: false, lactosa: false, vegetarianos: true, veganos: false, renal: true },
    notaClinica: "Desayuno energético con fibra soluble. No apto para diabéticos sin ajuste de porción por alto índice glucémico de la avena con frutas.",
    generado_por_ia: true,
    id_tiempo_comida: 1,
    created_at: "2025-04-20",
    uso_count: 5,
    pacientes_asignados: [
      { id: "p2", nombre: "Carlos Rodríguez" },
      { id: "p4", nombre: "Ana Martínez" },
      { id: "p5", nombre: "Luis Pérez" },
    ],
  },
  {
    id: "r3",
    nombre: "Ensalada mediterránea",
    categoria: "Cena",
    porciones: 2,
    tiempoPrep: 15,
    ingredientes: [
      { alimento: alimentosDB[16], cantidad: 200, unidad: "gramos", factorGramos: 1 },
      { alimento: alimentosDB[17], cantidad: 150, unidad: "gramos", factorGramos: 1 },
      { alimento: alimentosDB[4], cantidad: 0.5, unidad: "unidades", factorGramos: 100 },
      { alimento: alimentosDB[10], cantidad: 2, unidad: "cucharadas", factorGramos: 15 },
      { alimento: alimentosDB[12], cantidad: 100, unidad: "gramos", factorGramos: 1 },
    ],
    pasos: [
      "Cocinar la quinoa según las instrucciones del paquete y dejar enfriar.",
      "Cortar los tomates en cubos y el pepino en rodajas.",
      "Cortar el aguacate en cubos.",
      "Mezclar todos los ingredientes en un bowl grande.",
      "Aderezar con aceite de oliva, sal y limón al gusto."
    ],
    aptitud: { general: true, diabeticos: true, hipertensos: true, celiacos: true, lactosa: true, vegetarianos: true, veganos: true, renal: false },
    notaClinica: "Ensalada rica en grasas saludables y fibra. No recomendada para insuficiencia renal por alto contenido de potasio del aguacate y tomate.",
    generado_por_ia: true,
    id_tiempo_comida: 5,
    created_at: "2025-04-18",
    uso_count: 2,
    pacientes_asignados: [
      { id: "p6", nombre: "Elena Sánchez" },
    ],
  },
  {
    id: "r4",
    nombre: "Batido verde energético",
    categoria: "Snack",
    porciones: 1,
    tiempoPrep: 5,
    ingredientes: [
      { alimento: alimentosDB[7], cantidad: 40, unidad: "gramos", factorGramos: 1 },
      { alimento: alimentosDB[1], cantidad: 1, unidad: "unidades", factorGramos: 100 },
      { alimento: alimentosDB[6], cantidad: 1, unidad: "tazas", factorGramos: 240 },
      { alimento: alimentosDB[19], cantidad: 1, unidad: "cucharadas", factorGramos: 15 },
    ],
    pasos: [
      "Lavar las espinacas frescas.",
      "Pelar el plátano y trozar.",
      "Colocar todos los ingredientes en la licuadora.",
      "Licuar por 1-2 minutos hasta obtener una mezcla homogénea.",
      "Servir inmediatamente."
    ],
    aptitud: { general: true, diabeticos: false, hipertensos: false, celiacos: true, lactosa: false, vegetarianos: true, veganos: false, renal: false },
    notaClinica: "Alto contenido de potasio y sodio por la mantequilla de maní. No recomendado para hipertensos ni pacientes renales sin supervisión.",
    generado_por_ia: true,
    id_tiempo_comida: 4,
    created_at: "2025-04-22",
    uso_count: 1,
    pacientes_asignados: [],
  },
];
