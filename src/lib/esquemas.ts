/**
 * Esquemas de datos (Zod). Validan los JSON de src/data y las entradas de la API.
 * `npm run esquemas` los exporta como JSON Schema a la carpeta /esquemas.
 */
import { z } from "zod";

const centavos = z.number().int().nonnegative().describe("Monto en centavos de peso (MXN), sin IVA");
const clave = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Usa minúsculas, números y guiones");
const claveEstado = z.string().regex(/^[A-Z]{2,5}$/);

export const EstadoSchema = z.object({
  clave: claveEstado,
  nombre: z.string().min(1),
  region: z.string().min(1),
});

export const TarifaZonaSchema = z.object({
  base: centavos,
  porKg: centavos,
  diasMin: z.number().int().positive(),
  diasMax: z.number().int().positive(),
});

export const TarifasSchema = z.object({
  zonas: z.object({ local: TarifaZonaSchema, regional: TarifaZonaSchema, nacional: TarifaZonaSchema }),
  zonaExtendida: z.object({
    estados: z.array(claveEstado),
    recargo: centavos,
    diasExtra: z.number().int().nonnegative(),
  }),
  divisorVolumetrico: z.number().positive(),
});

export const CategoriaSchema = z.object({
  id: clave,
  nombre: z.string().min(1),
  padreId: clave.nullable(),
  requierePermiso: z.boolean().describe("Alimentos, cosméticos y cuidado personal"),
});

export const TipoProductoSchema = z.object({
  id: clave,
  nombre: z.string().min(1),
  categoriaId: clave,
  unidad: z.enum(["pieza", "kg", "caja", "rollo", "paquete", "litro", "metro"]),
  descripcion: z.string(),
});

export const EstadisticasSchema = z.object({
  sumaEstrellas: z.number().nonnegative(),
  numResenas: z.number().int().nonnegative(),
  pedidosCerrados: z.number().int().nonnegative(),
  pedidosCompletados: z.number().int().nonnegative(),
  disputasPerdidas: z.number().int().nonnegative(),
  horasRespuesta: z.number().nonnegative().nullable(),
});

export const ProveedorSchema = z.object({
  id: clave,
  nombre: z.string().min(1),
  estado: claveEstado,
  ciudad: z.string().min(1),
  verificacion: z.enum(["en_revision", "verificado", "rechazado"]),
  cobraIva: z.boolean(),
  diasPreparacion: z.number().int().nonnegative(),
  enviaA: z.array(claveEstado).min(1),
  desde: z.iso.date(),
  descripcion: z.string(),
  estadisticas: EstadisticasSchema,
  datosDeEjemplo: z.boolean(),
});

export const EscalonSchema = z.object({
  cantidadMinima: z.number().int().positive(),
  precioUnitario: centavos,
});

export const ProductoSchema = z.object({
  id: clave,
  proveedorId: clave,
  tipoId: clave,
  nombre: z.string().min(1),
  descripcion: z.string(),
  unidad: TipoProductoSchema.shape.unidad,
  variante: z.record(z.string(), z.string()).nullable(),
  precioMenudeo: centavos,
  escalones: z.array(EscalonSchema),
  pedidoMinimo: z.number().int().positive(),
  existencias: z.number().int().nonnegative(),
  pesoKg: z.number().positive(),
  medidas: z
    .object({ largoCm: z.number().positive(), anchoCm: z.number().positive(), altoCm: z.number().positive() })
    .nullable(),
  estado: z.enum(["activo", "pausado"]),
  maxDiasTransito: z.number().int().positive().nullable(),
  permisoSanitario: z.enum(["declarado", "declarado-con-documento"]).nullable(),
  datosDeEjemplo: z.boolean(),
});

/* ---------------- API: POST /api/surtido ---------------- */

export const SolicitudSurtidoSchema = z.object({
  estadoDestino: claveEstado,
  prioridad: z.enum(["ahorro", "equilibrado", "confianza"]).default("equilibrado"),
  permitirExtra: z.boolean().default(false),
  renglones: z
    .array(
      z.object({
        tipoId: clave,
        cantidad: z.number().int().min(1).max(1_000_000),
        variante: z.record(z.string(), z.string().max(60)).nullable().optional(),
        proveedorFijo: clave.nullable().optional(),
      }),
    )
    .min(1, "Agrega al menos un producto")
    .max(30, "Máximo 30 renglones por surtido"),
});

export type SolicitudSurtido = z.infer<typeof SolicitudSurtidoSchema>;
export type Producto = z.infer<typeof ProductoSchema>;
export type Proveedor = z.infer<typeof ProveedorSchema>;
export type TipoProducto = z.infer<typeof TipoProductoSchema>;
export type Categoria = z.infer<typeof CategoriaSchema>;

export const ESQUEMAS = {
  estado: EstadoSchema,
  tarifas: TarifasSchema,
  categoria: CategoriaSchema,
  "tipo-producto": TipoProductoSchema,
  proveedor: ProveedorSchema,
  producto: ProductoSchema,
  "solicitud-surtido": SolicitudSurtidoSchema,
};
