import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Save, Search, Edit, Eye, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Alimento, catColors } from "./alimentosData";
import { apiRequest } from "@/lib/api";
import * as XLSX from "xlsx";

interface TabAlimentosProps {
  base: Alimento[];
  setBase: React.Dispatch<React.SetStateAction<Alimento[]>>;
  onUseInRecipe: (a: Alimento) => void;
  openCreateSignal?: number;
}

type CategoriaDetalle = "proteinas" | "carbohidratos" | "grasas" | "lacteos" | "frutas" | "vegetales" | "otros";

type AlimentoDetalle = {
  id_alimento_detalle: number;
  nombre: string;
  categoria: CategoriaDetalle;
  calorias: number;
  proteinas: number;
  grasas: number;
  carbohidratos: number;
  fibra: number;
  ags: number;
  agm: number;
  agpi: number;
  colesterol: number;
  calcio: number;
  fosforo: number;
  hierro: number;
  potasio: number;
  sodio: number;
  zinc: number;
  vitamina_c: number;
  vitamina_a: number;
  folatos: number;
  vitamina_b12: number;
  fuente?: string;
  created_at?: string;
};

type ApiListResponse = {
  success?: boolean;
  data?: AlimentoDetalle[];
  items?: AlimentoDetalle[];
  results?: AlimentoDetalle[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    total_pages?: number;
  };
};

const DETALLE_ENDPOINTS = ["/api/alimentos-detalle", "/alimentos-detalle"];
const PAGE_SIZE = 50;
const CATEGORY_OPTIONS: CategoriaDetalle[] = ["proteinas", "carbohidratos", "grasas", "lacteos", "frutas", "vegetales", "otros"];

type DetailFormState = {
  nombre: string;
  categoria: CategoriaDetalle;
  calorias: string;
  proteinas: string;
  grasas: string;
  carbohidratos: string;
  fibra: string;
  ags: string;
  agm: string;
  agpi: string;
  colesterol: string;
  calcio: string;
  fosforo: string;
  hierro: string;
  potasio: string;
  sodio: string;
  zinc: string;
  vitamina_c: string;
  vitamina_a: string;
  folatos: string;
  vitamina_b12: string;
  fuente: string;
};

type ImportMode = "manual" | "archivo";

const defaultFormState: DetailFormState = {
  nombre: "",
  categoria: "otros",
  calorias: "",
  proteinas: "",
  grasas: "",
  carbohidratos: "",
  fibra: "",
  ags: "",
  agm: "",
  agpi: "",
  colesterol: "",
  calcio: "",
  fosforo: "",
  hierro: "",
  potasio: "",
  sodio: "",
  zinc: "",
  vitamina_c: "",
  vitamina_a: "",
  folatos: "",
  vitamina_b12: "",
  fuente: "",
};

const numericKeys: Array<keyof DetailFormState> = [
  "calorias",
  "proteinas",
  "grasas",
  "carbohidratos",
  "fibra",
  "ags",
  "agm",
  "agpi",
  "colesterol",
  "calcio",
  "fosforo",
  "hierro",
  "potasio",
  "sodio",
  "zinc",
  "vitamina_c",
  "vitamina_a",
  "folatos",
  "vitamina_b12",
];

function categoryLabel(cat: CategoriaDetalle): string {
  const labels: Record<CategoriaDetalle, string> = {
    proteinas: "Proteinas",
    carbohidratos: "Carbohidratos",
    grasas: "Grasas",
    lacteos: "Lacteos",
    frutas: "Frutas",
    vegetales: "Vegetales",
    otros: "Otros",
  };
  return labels[cat];
}

function categoryToLegacy(cat: CategoriaDetalle): Alimento["categoria"] {
  if (cat === "proteinas") return "Proteína";
  if (cat === "carbohidratos") return "Cereal";
  if (cat === "grasas") return "Grasa";
  if (cat === "lacteos") return "Lácteo";
  if (cat === "frutas") return "Fruta";
  if (cat === "vegetales") return "Vegetal";
  return "Otro";
}

function parseNum(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function parseOptionalNum(raw: string): string {
  const normalized = String(raw ?? "").trim();
  if (!normalized) return "";
  const parsed = Number(normalized.replace(",", "."));
  return Number.isFinite(parsed) ? String(parsed) : "";
}

function normalizeHeader(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function parseCategoriaValue(raw: string): CategoriaDetalle {
  const normalized = normalizeHeader(raw);
  if (!normalized) return "otros";
  if (normalized.includes("prote") || normalized.includes("protein")) return "proteinas";
  if (normalized.includes("carb") || normalized.includes("cereal") || normalized.includes("harina")) return "carbohidratos";
  if (normalized.includes("gras") || normalized.includes("lipid") || normalized.includes("aceite")) return "grasas";
  if (normalized.includes("lact") || normalized.includes("leche") || normalized.includes("yog")) return "lacteos";
  if (normalized.includes("frut")) return "frutas";
  if (normalized.includes("veget") || normalized.includes("verd")) return "vegetales";
  return "otros";
}

function findSpreadsheetValue(row: Record<string, unknown>, aliases: string[]): string {
  for (const [key, value] of Object.entries(row)) {
    if (aliases.includes(normalizeHeader(key))) {
      return String(value ?? "").trim();
    }
  }
  return "";
}

function mapSpreadsheetRow(row: Record<string, unknown>): DetailFormState | null {
  const nombre = findSpreadsheetValue(row, ["nombre", "alimento", "descripcion", "producto", "item"]);
  if (!nombre) return null;

  return {
    nombre,
    categoria: parseCategoriaValue(findSpreadsheetValue(row, ["categoria", "grupo", "tipo", "clasificacion"])),
    calorias: parseOptionalNum(findSpreadsheetValue(row, ["calorias", "energia", "kcal", "energia100g", "kcal100g"])),
    proteinas: parseOptionalNum(findSpreadsheetValue(row, ["proteinas", "proteina", "protein", "proteinas100g"])),
    grasas: parseOptionalNum(findSpreadsheetValue(row, ["grasas", "grasa", "lipidos", "grasastotales"])),
    carbohidratos: parseOptionalNum(findSpreadsheetValue(row, ["carbohidratos", "carbohidrato", "hidratos", "hidratosdecarbono", "carbs"])),
    fibra: parseOptionalNum(findSpreadsheetValue(row, ["fibra"])),
    ags: parseOptionalNum(findSpreadsheetValue(row, ["ags", "grasassaturadas", "saturadas", "acidosgrasossaturados"])),
    agm: parseOptionalNum(findSpreadsheetValue(row, ["agm", "grasasmonoinsaturadas", "monoinsaturadas", "acidosgrasosmonoinsaturados"])),
    agpi: parseOptionalNum(findSpreadsheetValue(row, ["agpi", "grasaspolinsaturadas", "polinsaturadas", "acidosgrasospolinsaturados"])),
    colesterol: parseOptionalNum(findSpreadsheetValue(row, ["colesterol"])),
    calcio: parseOptionalNum(findSpreadsheetValue(row, ["calcio"])),
    fosforo: parseOptionalNum(findSpreadsheetValue(row, ["fosforo", "fósforo"])),
    hierro: parseOptionalNum(findSpreadsheetValue(row, ["hierro"])),
    potasio: parseOptionalNum(findSpreadsheetValue(row, ["potasio"])),
    sodio: parseOptionalNum(findSpreadsheetValue(row, ["sodio"])),
    zinc: parseOptionalNum(findSpreadsheetValue(row, ["zinc"])),
    vitamina_c: parseOptionalNum(findSpreadsheetValue(row, ["vitaminac", "vitamina c", "vitaminacmg", "vitaminac100g"])),
    vitamina_a: parseOptionalNum(findSpreadsheetValue(row, ["vitaminaa", "vitamina a", "vitaminaamcg", "vitaminaa100g"])),
    folatos: parseOptionalNum(findSpreadsheetValue(row, ["folatos", "folate", "acidofolico"])),
    vitamina_b12: parseOptionalNum(findSpreadsheetValue(row, ["vitaminab12", "vitamina b12", "b12"])),
    fuente: findSpreadsheetValue(row, ["fuente", "origen", "procedencia"]),
  };
}

async function readSpreadsheetRows(file: File): Promise<DetailFormState[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const workbook = extension === "csv"
    ? XLSX.read(await file.text(), { type: "string" })
    : XLSX.read(await file.arrayBuffer(), { type: "array" });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const worksheet = workbook.Sheets[sheetName];
  const csvText = XLSX.utils.sheet_to_csv(worksheet, { blankrows: false });
  if (!csvText.trim()) return [];

  const csvWorkbook = XLSX.read(csvText, { type: "string" });
  const csvSheetName = csvWorkbook.SheetNames[0];
  if (!csvSheetName) return [];

  const csvWorksheet = csvWorkbook.Sheets[csvSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(csvWorksheet, { defval: "" });
  return rows.map(mapSpreadsheetRow).filter((row): row is DetailFormState => row !== null);
}

function toPayload(form: DetailFormState): Omit<AlimentoDetalle, "id_alimento_detalle" | "created_at"> {
  return {
    nombre: form.nombre.trim(),
    categoria: form.categoria,
    calorias: parseNum(form.calorias),
    proteinas: parseNum(form.proteinas),
    grasas: parseNum(form.grasas),
    carbohidratos: parseNum(form.carbohidratos),
    fibra: parseNum(form.fibra),
    ags: parseNum(form.ags),
    agm: parseNum(form.agm),
    agpi: parseNum(form.agpi),
    colesterol: parseNum(form.colesterol),
    calcio: parseNum(form.calcio),
    fosforo: parseNum(form.fosforo),
    hierro: parseNum(form.hierro),
    potasio: parseNum(form.potasio),
    sodio: parseNum(form.sodio),
    zinc: parseNum(form.zinc),
    vitamina_c: parseNum(form.vitamina_c),
    vitamina_a: parseNum(form.vitamina_a),
    folatos: parseNum(form.folatos),
    vitamina_b12: parseNum(form.vitamina_b12),
    fuente: form.fuente.trim() || undefined,
  };
}

function toForm(item: AlimentoDetalle): DetailFormState {
  return {
    nombre: item.nombre,
    categoria: item.categoria,
    calorias: String(item.calorias ?? 0),
    proteinas: String(item.proteinas ?? 0),
    grasas: String(item.grasas ?? 0),
    carbohidratos: String(item.carbohidratos ?? 0),
    fibra: String(item.fibra ?? 0),
    ags: String(item.ags ?? 0),
    agm: String(item.agm ?? 0),
    agpi: String(item.agpi ?? 0),
    colesterol: String(item.colesterol ?? 0),
    calcio: String(item.calcio ?? 0),
    fosforo: String(item.fosforo ?? 0),
    hierro: String(item.hierro ?? 0),
    potasio: String(item.potasio ?? 0),
    sodio: String(item.sodio ?? 0),
    zinc: String(item.zinc ?? 0),
    vitamina_c: String(item.vitamina_c ?? 0),
    vitamina_a: String(item.vitamina_a ?? 0),
    folatos: String(item.folatos ?? 0),
    vitamina_b12: String(item.vitamina_b12 ?? 0),
    fuente: item.fuente || "",
  };
}

function extractRows(res: ApiListResponse | AlimentoDetalle[]): AlimentoDetalle[] {
  return Array.isArray(res)
    ? res
    : Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.items)
        ? res.items
        : Array.isArray(res.results)
          ? res.results
          : [];
}

type PagedResult = {
  rows: AlimentoDetalle[];
  page: number;
  total?: number;
  totalPages?: number;
};

type DetalleFilters = {
  search?: string;
  categoria?: CategoriaDetalle | "todas";
};

async function getDetallePage(token: string, page: number, limit: number, filters: DetalleFilters): Promise<PagedResult> {
  let lastError: unknown;
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const search = filters.search?.trim();
  if (search) params.set("search", search);
  if (filters.categoria && filters.categoria !== "todas") params.set("categoria", filters.categoria);

  for (const base of DETALLE_ENDPOINTS) {
    try {
      const pageRes = await apiRequest<ApiListResponse | AlimentoDetalle[]>(`${base}?${params.toString()}`, {
        method: "GET",
        accessToken: token,
      });
      const pageRows = extractRows(pageRes);

      if (Array.isArray(pageRes)) {
        const total = pageRows.length;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const start = (page - 1) * limit;
        return {
          rows: pageRows.slice(start, start + limit).sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })),
          page,
          total,
          totalPages,
        };
      }

      const totalPages = typeof pageRes.meta?.total_pages === "number" ? pageRes.meta.total_pages : undefined;
      const total = typeof pageRes.meta?.total === "number" ? pageRes.meta.total : undefined;

      return {
        rows: pageRows.sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })),
        page,
        total,
        totalPages,
      };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function createDetalle(payload: Omit<AlimentoDetalle, "id_alimento_detalle" | "created_at">, token: string): Promise<void> {
  let lastError: unknown;
  for (const base of DETALLE_ENDPOINTS) {
    try {
      await apiRequest(base, { method: "POST", accessToken: token, body: payload });
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function updateDetalle(id: number, payload: Omit<AlimentoDetalle, "id_alimento_detalle" | "created_at">, token: string): Promise<void> {
  let lastError: unknown;
  for (const base of DETALLE_ENDPOINTS) {
    try {
      await apiRequest(`${base}/${id}`, { method: "PATCH", accessToken: token, body: payload });
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function deleteDetalle(id: number, token: string): Promise<void> {
  let lastError: unknown;
  for (const base of DETALLE_ENDPOINTS) {
    try {
      await apiRequest(`${base}/${id}`, { method: "DELETE", accessToken: token });
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

function syncBaseFromDetalle(rows: AlimentoDetalle[]): Alimento[] {
  return rows.map((r) => ({
    id: String(r.id_alimento_detalle),
    nombre: r.nombre,
    categoria: categoryToLegacy(r.categoria),
    calorias: r.calorias ?? 0,
    proteinas: r.proteinas ?? 0,
    carbohidratos: r.carbohidratos ?? 0,
    grasas: r.grasas ?? 0,
    grasasSaturadas: r.ags ?? 0,
    azucares: 0,
    fibra: r.fibra ?? 0,
    sodio: r.sodio ?? 0,
  }));
}

export function TabAlimentos({ setBase, openCreateSignal }: TabAlimentosProps) {
  const [rows, setRows] = useState<AlimentoDetalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<ImportMode>("manual");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);

  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState<"todas" | CategoriaDetalle>("todas");

  const [manualForm, setManualForm] = useState<DetailFormState>(defaultFormState);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<DetailFormState>(defaultFormState);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<AlimentoDetalle | null>(null);

  const loadRows = async (targetPage = page) => {
    const token = localStorage.getItem("dkfitt-access-token");
    if (!token) {
      toast.error("Sesion no valida");
      return;
    }

    setLoading(true);
    try {
      const fetched = await getDetallePage(token, targetPage, PAGE_SIZE, {
        search: filtroNombre,
        categoria: filtroCategoria,
      });
      setRows(fetched.rows);
      setBase(syncBaseFromDetalle(fetched.rows));
      setTotalItems(typeof fetched.total === "number" ? fetched.total : null);
      setTotalPages(typeof fetched.totalPages === "number" ? fetched.totalPages : null);
    } catch {
      toast.error("No se pudo cargar alimentos_detalle");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows(page);
  }, [page]);

  useEffect(() => {
    if (openCreateSignal === undefined || openCreateSignal === 0) return;
    setCreateMode("manual");
    setImportFile(null);
    setCreateOpen(true);
  }, [openCreateSignal]);

  useEffect(() => {
    if (page === 1) {
      void loadRows(1);
      return;
    }
    setPage(1);
  }, [filtroNombre, filtroCategoria]);

  const updateFormField = (field: keyof DetailFormState, value: string, onEdit = false) => {
    if (onEdit) {
      setEditForm((prev) => ({ ...prev, [field]: value }));
      return;
    }
    setManualForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!manualForm.nombre.trim()) {
      toast.error("El nombre del alimento es obligatorio");
      return;
    }

    const token = localStorage.getItem("dkfitt-access-token");
    if (!token) {
      toast.error("Sesion no valida");
      return;
    }

    setSaving(true);
    try {
      await createDetalle(toPayload(manualForm), token);
      toast.success("Alimento creado correctamente");
      setManualForm(defaultFormState);
      await loadRows();
    } catch {
      toast.error("No se pudo crear el alimento");
    } finally {
      setSaving(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error("Selecciona un archivo para importar");
      return;
    }

    const token = localStorage.getItem("dkfitt-access-token");
    if (!token) {
      toast.error("Sesion no valida");
      return;
    }

    setImporting(true);
    try {
      const spreadsheetRows = await readSpreadsheetRows(importFile);
      if (spreadsheetRows.length === 0) {
        toast.error("El archivo no contiene filas válidas");
        return;
      }

      let created = 0;
      let failed = 0;

      for (const row of spreadsheetRows) {
        try {
          await createDetalle(toPayload(row), token);
          created += 1;
        } catch {
          failed += 1;
        }
      }

      await loadRows(page);
      setImportFile(null);
      setCreateOpen(false);

      if (failed > 0) {
        toast.warning(`Importación parcial: ${created} alimentos cargados y ${failed} omitidos`);
      } else {
        toast.success(`Importación completada: ${created} alimentos cargados`);
      }
    } catch {
      toast.error("No se pudo importar el archivo");
    } finally {
      setImporting(false);
    }
  };

  const openEdit = (item: AlimentoDetalle) => {
    setEditId(item.id_alimento_detalle);
    setEditForm(toForm(item));
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editId) return;

    const token = localStorage.getItem("dkfitt-access-token");
    if (!token) {
      toast.error("Sesion no valida");
      return;
    }

    setSaving(true);
    try {
      await updateDetalle(editId, toPayload(editForm), token);
      toast.success("Alimento actualizado");
      setEditOpen(false);
      await loadRows();
    } catch {
      toast.error("No se pudo actualizar el alimento");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem("dkfitt-access-token");
    if (!token) {
      toast.error("Sesion no valida");
      return;
    }

    setSaving(true);
    try {
      await deleteDetalle(id, token);
      toast.success("Alimento eliminado");
      await loadRows();
    } catch {
      toast.error("No se pudo eliminar el alimento");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Alimentos disponibles</CardTitle>
              <CardDescription>
                {typeof totalItems === "number" ? `${totalItems} alimentos` : `${rows.length} alimentos`}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-2 sm:flex-row">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Filtrar por nombre..."
                className="pl-9 h-8 text-xs"
                value={filtroNombre}
                onChange={(e) => setFiltroNombre(e.target.value)}
              />
            </div>
            <Select value={filtroCategoria} onValueChange={(v) => setFiltroCategoria(v as "todas" | CategoriaDetalle)}>
              <SelectTrigger className="w-full h-8 text-xs sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {CATEGORY_OPTIONS.map((cat) => (
                  <SelectItem key={cat} value={cat}>{categoryLabel(cat)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[620px] overflow-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Alimento</TableHead>
                  <TableHead className="text-right">Calorias</TableHead>
                  <TableHead className="text-right">Proteinas</TableHead>
                  <TableHead className="text-right">Carbohidratos</TableHead>
                  <TableHead className="text-right">Grasas</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && rows.map((a) => (
                  <TableRow key={a.id_alimento_detalle} className="border-border hover:bg-muted/30">
                    <TableCell className="font-medium text-foreground">{a.nombre}</TableCell>
                    <TableCell className="text-right text-foreground">{a.calorias}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{a.proteinas}g</TableCell>
                    <TableCell className="text-right text-muted-foreground">{a.carbohidratos}g</TableCell>
                    <TableCell className="text-right text-muted-foreground">{a.grasas}g</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${catColors[categoryToLegacy(a.categoria)] || ""}`}>
                        {categoryLabel(a.categoria)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEdit(a)}>
                          <Edit className="h-3 w-3 mr-1" /> Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => {
                            setDetailItem(a);
                            setDetailOpen(true);
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" /> Detalles
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => void handleDelete(a.id_alimento_detalle)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Cargando alimentos...</TableCell>
                  </TableRow>
                )}

                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No se encontraron alimentos</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-4">
            <p className="text-xs text-muted-foreground">
              Pagina {page}{totalPages ? ` de ${totalPages}` : ""}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 flex-1 text-xs sm:flex-none"
                disabled={page <= 1 || loading}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 flex-1 text-xs sm:flex-none"
                disabled={loading || (totalPages !== null && page >= totalPages)}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border max-w-[calc(100vw-2rem)] sm:max-w-5xl h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Registrar un nuevo alimento</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 border-b border-border pb-3">
            <Button variant={createMode === "manual" ? "default" : "outline"} size="sm" onClick={() => setCreateMode("manual")}>Carga manual</Button>
            <Button variant={createMode === "archivo" ? "default" : "outline"} size="sm" onClick={() => setCreateMode("archivo")}>Subir archivo</Button>
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            {createMode === "manual" ? (
              <DetailForm form={manualForm} onChange={(f, v) => updateFormField(f, v, false)} />
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Importar alimentos desde Excel o CSV</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Usa la primera hoja del archivo y una fila de encabezados. El sistema leerá cada fila válida y la guardará como alimento.
                    </p>
                  </div>
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="h-9 text-xs"
                    onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                  />
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>{importFile ? importFile.name : "Ningún archivo seleccionado"}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => setImportFile(null)} disabled={!importFile}>
                      Limpiar
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/10 p-4">
                  <p className="text-xs font-medium text-foreground mb-2">Columnas compatibles</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    nombre, categoria, calorias, proteinas, grasas, carbohidratos, fibra, ags, agm, agpi, colesterol, calcio, fosforo, hierro, potasio, sodio, zinc, vitamina c, vitamina a, folatos, vitamina y b12.
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            {createMode === "manual" ? (
              <Button
                onClick={async () => {
                  await handleCreate();
                  setCreateOpen(false);
                }}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" /> Guardar alimento
              </Button>
            ) : (
              <Button onClick={handleImport} disabled={importing || !importFile}>
                <Upload className="h-4 w-4 mr-2" /> Importar archivo
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-w-5xl h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar alimento</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-1">
            <DetailForm form={editForm} onChange={(f, v) => updateFormField(f, v, true)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditSave} disabled={saving}><Save className="h-4 w-4 mr-2" /> Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-card border-border max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle nutricional — {detailItem?.nombre}</DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <DetailItem label="Categoria" value={categoryLabel(detailItem.categoria)} />
              <DetailItem label="Calorias" value={formatMetricValue(detailItem.calorias, "kcal")} />
              <DetailItem label="Proteinas" value={formatMetricValue(detailItem.proteinas, "g")} />
              <DetailItem label="Carbohidratos" value={formatMetricValue(detailItem.carbohidratos, "g")} />
              <DetailItem label="Grasas" value={formatMetricValue(detailItem.grasas, "g")} />
              <DetailItem label="Fibra" value={formatMetricValue(detailItem.fibra, "g")} />
              <DetailItem label="AGS" value={formatMetricValue(detailItem.ags, "g")} />
              <DetailItem label="AGM" value={formatMetricValue(detailItem.agm, "g")} />
              <DetailItem label="AGPI" value={formatMetricValue(detailItem.agpi, "g")} />
              <DetailItem label="Colesterol" value={formatMetricValue(detailItem.colesterol, "mg")} />
              <DetailItem label="Calcio" value={formatMetricValue(detailItem.calcio, "mg")} />
              <DetailItem label="Fosforo" value={formatMetricValue(detailItem.fosforo, "mg")} />
              <DetailItem label="Hierro" value={formatMetricValue(detailItem.hierro, "mg")} />
              <DetailItem label="Potasio" value={formatMetricValue(detailItem.potasio, "mg")} />
              <DetailItem label="Sodio" value={formatMetricValue(detailItem.sodio, "mg")} />
              <DetailItem label="Zinc" value={formatMetricValue(detailItem.zinc, "mg")} />
              <DetailItem label="Vitamina C" value={formatMetricValue(detailItem.vitamina_c, "mg")} />
              <DetailItem label="Vitamina A" value={formatMetricValue(detailItem.vitamina_a, "mcg")} />
              <DetailItem label="Folatos" value={formatMetricValue(detailItem.folatos, "mcg")} />
              <DetailItem label="Vitamina B12" value={formatMetricValue(detailItem.vitamina_b12, "mcg")} />
              <DetailItem label="Fuente" value={formatPlainValue(detailItem.fuente)} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailForm({
  form,
  onChange,
}: {
  form: DetailFormState;
  onChange: (field: keyof DetailFormState, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Nombre del alimento *</label>
          <Input className="h-8 text-xs" value={form.nombre} onChange={(e) => onChange("nombre", e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Categoria *</label>
          <Select value={form.categoria} onValueChange={(v) => onChange("categoria", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((cat) => (
                <SelectItem key={cat} value={cat}>{categoryLabel(cat)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs font-medium text-primary border-b border-border/50 pb-1">Valores por 100 g</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-2">
        {numericKeys.map((key) => (
          <div key={key} className="space-y-0.5 max-w-[170px]">
            <label className="text-[10px] text-muted-foreground">{key}</label>
            <Input
              type="number"
              className="h-7 text-xs"
              value={form[key]}
              onChange={(e) => onChange(key, e.target.value)}
              min={0}
              step={0.1}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}

function formatMetricValue(value: unknown, unit: string): string {
  if (value === null || value === undefined || value === "") return "---";
  return `${value} ${unit}`;
}

function formatPlainValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "---";
  return String(value);
}
