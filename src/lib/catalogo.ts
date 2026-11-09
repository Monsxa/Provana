/**
 * Carga y valida los datos de ejemplo (src/data/*.json) y los convierte
 * al formato del motor del surtido. Cuando se conecte la base de datos,
 * este archivo es el único que cambia de fuente.
 */
import { z } from "zod";
import estadosJson from "@/data/estados.json";
import tarifasJson from "@/data/tarifas.json";
import categoriasJson from "@/data/categorias.json";
import tiposJson from "@/data/tipos-producto.json";
import proveedoresJson from "@/data/proveedores.json";
import productosJson from "@/data/productos.json";
import {
  CategoriaSchema,
  EstadoSchema,
  ProductoSchema,
  ProveedorSchema,
  TarifasSchema,
  TipoProductoSchema,
} from "./esquemas";
import { calcularConfianza } from "./surtido/confianza";
import { validarEscalones } from "./surtido/precios";
import type { Catalogo } from "./surtido/tipos";

export const estados = z.array(EstadoSchema).parse(estadosJson);
export const tarifas = TarifasSchema.parse(tarifasJson);
export const categorias = z.array(CategoriaSchema).parse(categoriasJson);
export const tiposProducto = z.array(TipoProductoSchema).parse(tiposJson);
export const proveedores = z.array(ProveedorSchema).parse(proveedoresJson);
export const productos = z.array(ProductoSchema).parse(productosJson);

/** Promedio de estrellas de toda la plataforma (para el promedio bayesiano). */
export const promedioPlataforma = (() => {
  const suma = proveedores.reduce((s, p) => s + p.estadisticas.sumaEstrellas, 0);
  const n = proveedores.reduce((s, p) => s + p.estadisticas.numResenas, 0);
  return n > 0 ? suma / n : 4.5;
})();

export const confianzaPorProveedor = new Map(
  proveedores.map((p) => [p.id, calcularConfianza(p.estadisticas, promedioPlataforma)]),
);

/** Revisa referencias cruzadas que el esquema por sí solo no puede revisar. */
export function erroresDeIntegridad(): string[] {
  const errores: string[] = [];
  const claves = new Set(estados.map((e) => e.clave));
  const idsCat = new Set(categorias.map((c) => c.id));
  const idsTipo = new Set(tiposProducto.map((t) => t.id));
  const idsProv = new Set(proveedores.map((p) => p.id));
  if (estados.length !== 32) errores.push(`Se esperaban 32 estados y hay ${estados.length}.`);
  categorias.forEach((c) => {
    if (c.padreId && !idsCat.has(c.padreId)) errores.push(`Categoría ${c.id}: padre inexistente.`);
  });
  tiposProducto.forEach((t) => {
    if (!idsCat.has(t.categoriaId)) errores.push(`Tipo ${t.id}: categoría inexistente.`);
  });
  proveedores.forEach((p) => {
    if (!claves.has(p.estado)) errores.push(`Proveedor ${p.id}: estado inexistente.`);
    p.enviaA.forEach((e) => {
      if (!claves.has(e)) errores.push(`Proveedor ${p.id}: envía a estado inexistente ${e}.`);
    });
  });
  const ids = new Set<string>();
  productos.forEach((p) => {
    if (ids.has(p.id)) errores.push(`Producto ${p.id} repetido.`);
    ids.add(p.id);
    if (!idsProv.has(p.proveedorId)) errores.push(`Producto ${p.id}: proveedor inexistente.`);
    if (!idsTipo.has(p.tipoId)) errores.push(`Producto ${p.id}: tipo inexistente.`);
    validarEscalones(p.precioMenudeo, p.escalones).forEach((e) => errores.push(`Producto ${p.id}: ${e}`));
    if (p.pedidoMinimo > p.existencias) errores.push(`Producto ${p.id}: el mínimo supera las existencias.`);
  });
  return errores;
}

export function catalogoParaSurtido(): Catalogo {
  return {
    estados,
    tarifas,
    proveedores: proveedores.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      estado: p.estado,
      verificado: p.verificacion === "verificado",
      cobraIva: p.cobraIva,
      enviaA: p.enviaA,
      confianza: confianzaPorProveedor.get(p.id)!,
      diasPreparacion: p.diasPreparacion,
    })),
    ofertas: productos.map((p) => ({
      productoId: p.id,
      proveedorId: p.proveedorId,
      tipoId: p.tipoId,
      nombre: p.nombre,
      unidad: p.unidad,
      variante: p.variante,
      precioMenudeo: p.precioMenudeo,
      escalones: p.escalones,
      pedidoMinimo: p.pedidoMinimo,
      existencias: p.existencias,
      pesoKg: p.pesoKg,
      medidas: p.medidas,
      activo: p.estado === "activo",
      maxDiasTransito: p.maxDiasTransito,
    })),
  };
}

/** Variantes disponibles por tipo (para el selector de la interfaz). */
export function variantesPorTipo(): Record<string, Record<string, string[]>> {
  const res: Record<string, Record<string, Set<string>>> = {};
  for (const p of productos) {
    if (!p.variante) continue;
    res[p.tipoId] ??= {};
    for (const [k, v] of Object.entries(p.variante)) {
      (res[p.tipoId][k] ??= new Set()).add(v);
    }
  }
  return Object.fromEntries(
    Object.entries(res).map(([t, vars]) => [
      t,
      Object.fromEntries(Object.entries(vars).map(([k, s]) => [k, [...s].sort()])),
    ]),
  );
}
