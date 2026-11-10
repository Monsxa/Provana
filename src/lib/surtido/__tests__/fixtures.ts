/**
 * Datos del ejemplo trabajado de docs/surtido-inteligente.md.
 * Precios en centavos y SIN IVA. Todos los proveedores cobran IVA.
 */
import { CONFIG_INICIAL, type Catalogo, type ConfigSurtido, type Oferta, type ProveedorSurtido } from "../tipos";

export const ESTADOS = [
  { clave: "JAL", nombre: "Jalisco", region: "Occidente" },
  { clave: "COL", nombre: "Colima", region: "Occidente" },
  { clave: "YUC", nombre: "Yucatán", region: "Sureste" },
  { clave: "VER", nombre: "Veracruz", region: "Golfo" },
  { clave: "BCS", nombre: "Baja California Sur", region: "Noroeste" },
];

export const TARIFAS: Catalogo["tarifas"] = {
  zonas: {
    local: { base: 7900, porKg: 600, diasMin: 1, diasMax: 2 },
    regional: { base: 11900, porKg: 800, diasMin: 2, diasMax: 3 },
    nacional: { base: 15900, porKg: 1000, diasMin: 3, diasMax: 5 },
  },
  zonaExtendida: { estados: ["BCS"], recargo: 9000, diasExtra: 2 },
  divisorVolumetrico: 5000,
};

const TODOS = ESTADOS.map((e) => e.clave);

export function proveedor(p: Partial<ProveedorSurtido> & { id: string; estado: string }): ProveedorSurtido {
  return {
    nombre: p.id,
    verificado: true,
    cobraIva: true,
    enviaA: TODOS,
    confianza: 90,
    diasPreparacion: 1,
    ...p,
  };
}

export function oferta(o: Partial<Oferta> & { productoId: string; proveedorId: string; tipoId: string }): Oferta {
  return {
    nombre: o.productoId,
    unidad: "pieza",
    precioMenudeo: 10000,
    escalones: [],
    pedidoMinimo: 1,
    existencias: 100000,
    pesoKg: 1,
    activo: true,
    ...o,
  };
}

export const A = proveedor({ id: "A", nombre: "Aromas del Valle", estado: "JAL", confianza: 95 });
export const B = proveedor({ id: "B", nombre: "Empaques Sureste", estado: "YUC", confianza: 88 });
export const C = proveedor({ id: "C", nombre: "Finca Los Cerros", estado: "VER", confianza: 92 });
export const D = proveedor({ id: "D", nombre: "Café Rápido", estado: "JAL", confianza: 70 });

export const OFERTAS: Oferta[] = [
  oferta({ productoId: "A-velas", proveedorId: "A", tipoId: "vela", precioMenudeo: 8900, escalones: [{ cantidadMinima: 12, precioUnitario: 7600 }, { cantidadMinima: 48, precioUnitario: 6200 }], pedidoMinimo: 6, pesoKg: 0.25 }),
  oferta({ productoId: "A-bolsas", proveedorId: "A", tipoId: "bolsa", precioMenudeo: 300, escalones: [{ cantidadMinima: 500, precioUnitario: 220 }], pedidoMinimo: 100, pesoKg: 0.02 }),
  oferta({ productoId: "A-cafe", proveedorId: "A", tipoId: "cafe", unidad: "kg", precioMenudeo: 19000, escalones: [{ cantidadMinima: 10, precioUnitario: 17500 }], pedidoMinimo: 5, pesoKg: 1 }),
  oferta({ productoId: "B-velas", proveedorId: "B", tipoId: "vela", precioMenudeo: 8000, escalones: [{ cantidadMinima: 24, precioUnitario: 7000 }], pedidoMinimo: 24, pesoKg: 0.25 }),
  oferta({ productoId: "B-bolsas", proveedorId: "B", tipoId: "bolsa", precioMenudeo: 240, escalones: [{ cantidadMinima: 500, precioUnitario: 180 }, { cantidadMinima: 2000, precioUnitario: 135 }], pedidoMinimo: 200, pesoKg: 0.02 }),
  oferta({ productoId: "C-cafe", proveedorId: "C", tipoId: "cafe", unidad: "kg", precioMenudeo: 18500, escalones: [{ cantidadMinima: 10, precioUnitario: 16500 }, { cantidadMinima: 50, precioUnitario: 14800 }], pedidoMinimo: 5, pesoKg: 1 }),
  oferta({ productoId: "D-cafe", proveedorId: "D", tipoId: "cafe", unidad: "kg", precioMenudeo: 17000, escalones: [{ cantidadMinima: 10, precioUnitario: 15800 }], pedidoMinimo: 5, pesoKg: 1 }),
];

export function catalogoEjemplo(cambios?: {
  proveedores?: ProveedorSurtido[];
  ofertas?: Oferta[];
}): Catalogo {
  return {
    proveedores: cambios?.proveedores ?? [A, B, C, D],
    ofertas: cambios?.ofertas ?? OFERTAS,
    estados: ESTADOS,
    tarifas: TARIFAS,
  };
}

export const LISTA = [
  { tipoId: "vela", cantidad: 40 },
  { tipoId: "bolsa", cantidad: 500 },
  { tipoId: "cafe", cantidad: 10 },
];

export function config(c: Partial<ConfigSurtido> = {}): ConfigSurtido {
  return { ...CONFIG_INICIAL, prioridad: "ahorro", ...c };
}
