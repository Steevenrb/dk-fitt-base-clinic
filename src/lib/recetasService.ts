import { apiRequest } from "./api";

export interface GenerateRecipeParams {
  tiempoComida: string;
  caloriasObjetivo: number;
  preferencias?: {
    vegetariana?: boolean;
    vegana?: boolean;
    sinGluten?: boolean;
    sinLactosa?: boolean;
  };
}

export interface RecetaAI {
  id: string;
  nombre: string;
  tiempoComida: string;
  caloriasObjetivo: number;
  receta: {
    nombre: string;
    ingredientes: Array<{
      alimento: string;
      cantidad: number;
      unidad: string;
      calorias: number;
    }>;
    pasos: string[];
    tiempoPrep: number;
    porciones: number;
    nutrientes: {
      proteinas: number;
      carbohidratos: number;
      grasas: number;
      fibra: number;
      azucares: number;
      sodio: number;
    };
    aptitudClinica?: string;
    notaClinica?: string;
  };
  generado_por_ia: boolean;
  created_at: string;
}

export async function generarRecetaIA(params: GenerateRecipeParams, accessToken?: string): Promise<RecetaAI> {
  return apiRequest("/recipe-generator/generate", {
    method: "POST",
    body: params,
    accessToken,
  });
}

export async function generarVarianteReceta(
  tiempoComida: string,
  caloriasObjetivo: number,
  accessToken?: string
): Promise<RecetaAI> {
  return apiRequest("/recipe-generator/generate", {
    method: "POST",
    body: {
      tiempoComida,
      caloriasObjetivo,
      forzarNueva: true, // Fuerza una receta nueva ignorando caché
    },
    accessToken,
  });
}

export async function obtenerPlatos(accessToken?: string) {
  return apiRequest("/dishes", {
    method: "GET",
    accessToken,
  });
}

export async function obtenerPlato(id: string, accessToken?: string) {
  return apiRequest(`/dishes/${id}`, {
    method: "GET",
    accessToken,
  });
}

export async function obtenerPacientesAsignados(recetaId: string, accessToken?: string) {
  try {
    const response = await apiRequest(`/menus-diarios?plato_id=${recetaId}`, {
      method: "GET",
      accessToken,
    });
    // Procesar la respuesta para extraer pacientes únicos
    // Esto depende de cómo devuelva el backend los datos
    return response;
  } catch (error) {
    console.error("Error al obtener pacientes asignados:", error);
    return [];
  }
}

export async function contarUsoReceta(recetaId: string, accessToken?: string): Promise<number> {
  try {
    const menus = await apiRequest(`/menus-diarios?plato_id=${recetaId}`, {
      method: "GET",
      accessToken,
    });
    return Array.isArray(menus) ? menus.length : 0;
  } catch (error) {
    console.error("Error al contar uso de receta:", error);
    return 0;
  }
}
