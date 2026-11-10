/**
 * Tipos del motor del Surtido inteligente.
 * Todo el dinero va en centavos enteros (MXN). Los precios de productos y
 * tarifas se capturan SIN IVA; el IVA se calcula aparte.
 */

export type Centavos = number;
export type Prioridad = "ahorro" | "equilibrado" | "confianza";
export type Zona = "local" | "regional" | "nacional";

export interface Escalon {
  /** Cantidad desde la que aplica este precio. */
  cantidadMinima: number;
  /** Precio unitario sin IVA. */
  precioUnitario: Centavos;
}

export interface Medidas {
  largoCm: number;
  anchoCm: number;
  altoCm: number;
}

export interface Oferta {
  productoId: string;
  proveedorId: string;
  tipoId: string;
  nombre: string;
  /** Unidad de venta en singular: "pieza", "kg", "caja"… */
  unidad?: string;
  variante?: Record<string, string> | null;
  /** Precio unitario de menudeo sin IVA. */
  precioMenudeo: Centavos;
  escalones: Escalon[];
  pedidoMinimo: number;
  existencias: number;
  pesoKg: number;
  medidas?: Medidas | null;
  activo: boolean;
  /** Si es perecedero, días máximos que aguanta en tránsito. */
  maxDiasTransito?: number | null;
}

export interface ProveedorSurtido {
  id: string;
  nombre: string;
  /** Clave del estado de origen (p. ej. "JAL"). */
  estado: string;
  verificado: boolean;
  cobraIva: boolean;
  /** Claves de los estados a los que envía. */
  enviaA: string[];
  /** Confianza 0–100 (ver confianza.ts). */
  confianza: number;
  diasPreparacion: number;
}

export interface TarifaZona {
  base: Centavos;
  porKg: Centavos;
  diasMin: number;
  diasMax: number;
}

export interface TablaTarifas {
  zonas: Record<Zona, TarifaZona>;
  /** Estados de destino con recargo de zona extendida. */
  zonaExtendida: { estados: string[]; recargo: Centavos; diasExtra: number };
  /** Divisor volumétrico (cm³ por kg), normalmente 5000. */
  divisorVolumetrico: number;
}

export interface EstadoMx {
  clave: string;
  nombre: string;
  region: string;
}

export interface Catalogo {
  proveedores: ProveedorSurtido[];
  ofertas: Oferta[];
  estados: EstadoMx[];
  tarifas: TablaTarifas;
}

export interface Renglon {
  tipoId: string;
  cantidad: number;
  variante?: Record<string, string> | null;
  /** Obliga a usar este proveedor en el renglón (cuando el usuario cambia la elección). */
  proveedorFijo?: string | null;
}

export interface ConfigSurtido {
  prioridad: Prioridad;
  pesosRiesgo: Record<Prioridad, number>;
  confianzaMinima: number;
  permitirExtra: boolean;
  compararConIva: boolean;
  tasaIva: number;
  /** Solo para pruebas: obliga un método de búsqueda. */
  forzarMetodo?: Metodo;
}

export type Metodo = "exhaustivo" | "subconjuntos" | "heuristico";

export const CONFIG_INICIAL: ConfigSurtido = {
  prioridad: "equilibrado",
  pesosRiesgo: { ahorro: 0, equilibrado: 0.1, confianza: 0.25 },
  confianzaMinima: 60,
  permitirExtra: false,
  compararConIva: true,
  tasaIva: 0.16,
};

export type Ajuste = "minimo" | "extra" | null;

export interface LineaElegida {
  renglon: number;
  tipoId: string;
  productoId: string;
  nombre: string;
  unidad: string;
  variante: Record<string, string> | null;
  cantidadPedida: number;
  cantidad: number;
  ajuste: Ajuste;
  precioUnitario: Centavos;
  /** Cantidad mínima del escalón aplicado; null = precio de menudeo. */
  escalonAplicado: number | null;
  subtotal: Centavos;
  /** Ahorro de pedir las piezas extra frente a la cantidad pedida (solo si ajuste = "extra"). */
  ahorroPorExtra: Centavos;
}

export interface GrupoProveedor {
  proveedorId: string;
  proveedorNombre: string;
  estadoOrigen: string;
  confianza: number;
  cobraIva: boolean;
  lineas: LineaElegida[];
  productos: Centavos;
  ivaProductos: Centavos;
  envio: {
    zona: Zona;
    zonaExtendida: boolean;
    kgCobrables: number;
    costo: Centavos;
    iva: Centavos;
    diasMin: number;
    diasMax: number;
  };
  /** productos + envío, sin IVA. */
  totalSinIva: Centavos;
  /** Lo que se paga a este proveedor, con IVA. */
  total: Centavos;
  /** Costo de riesgo usado para decidir (nunca se cobra). */
  riesgo: Centavos;
}

export interface Totales {
  productos: Centavos;
  envio: Centavos;
  iva: Centavos;
  sinIva: Centavos;
  total: Centavos;
  /** Base de comparación (con o sin IVA según la configuración). */
  base: Centavos;
  /** base + riesgo: lo que minimiza el algoritmo. */
  efectivo: Centavos;
}

export interface Explicacion {
  renglon: number;
  proveedorId: string;
  texto: string;
  /** Diferencia de la mejor alternativa frente a lo elegido (positiva = la alternativa cuesta más). */
  alternativa: { proveedorId: string; proveedorNombre: string; diferencia: Centavos } | null;
  avisos: string[];
}

export interface AlternativaRenglon {
  proveedorId: string;
  proveedorNombre: string;
  confianza: number;
  precioUnitario: Centavos;
  cantidad: number;
  /** Total de toda la lista si este renglón se comprara con este proveedor. */
  totalSiSeElige: Centavos;
  elegido: boolean;
}

export interface RenglonSinProveedor {
  renglon: number;
  tipoId: string;
  cantidad: number;
  motivo: string;
}

export interface Referencia {
  tipo: "un-proveedor" | "menos-proveedores";
  proveedores: string[];
  total: Centavos;
  base: Centavos;
}

export interface ResultadoSurtido {
  estadoDestino: string;
  config: Omit<ConfigSurtido, "forzarMetodo">;
  metodo: Metodo;
  grupos: GrupoProveedor[];
  totales: Totales;
  referencia: Referencia | null;
  ahorro: { centavos: Centavos; porcentaje: number } | null;
  explicaciones: Explicacion[];
  alternativas: Record<number, AlternativaRenglon[]>;
  sinProveedor: RenglonSinProveedor[];
}
