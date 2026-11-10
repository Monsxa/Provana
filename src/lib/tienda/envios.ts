/**
 * Opciones de envío simuladas por proveedor, a partir de la tabla de tarifas.
 * Estándar = tarifa base; Exprés = 1.6× y un día menos; Sucursal = 15 % menos y un día más.
 * Marcas: más barata (menor costo), más rápida (menor día máximo), recomendada (mejor costo × días).
 */
import { cotizarEnvio, kgCobrables, pesoVolumetricoKg } from "@/lib/surtido/envio";
import type { EstadoMx, Medidas, TablaTarifas } from "@/lib/surtido/tipos";

export interface OpcionEnvio {
  id: "estandar" | "expres" | "sucursal";
  nombre: string;
  costo: number;
  diasMin: number;
  diasMax: number;
  etiquetas: ("Más barata" | "Más rápida" | "Recomendada")[];
}

export function opcionesEnvio(
  origen: string,
  destino: string,
  items: { cantidad: number; pesoKg: number; medidas: Medidas | null }[],
  diasPreparacion: number,
  tarifas: TablaTarifas,
  estados: EstadoMx[],
): OpcionEnvio[] {
  const real = items.reduce((s, i) => s + i.cantidad * i.pesoKg, 0);
  const vol = items.reduce((s, i) => s + i.cantidad * pesoVolumetricoKg(i.medidas, tarifas.divisorVolumetrico), 0);
  const kg = kgCobrables(real, vol);
  const base = cotizarEnvio(origen, destino, kg, tarifas, estados);
  const p = diasPreparacion;
  const ops: OpcionEnvio[] = [
    { id: "estandar", nombre: "Estándar", costo: base.costo, diasMin: base.diasMin + p, diasMax: base.diasMax + p, etiquetas: [] },
    {
      id: "expres",
      nombre: "Exprés",
      costo: Math.round(base.costo * 1.6),
      diasMin: Math.max(1, base.diasMin - 1) + p,
      diasMax: Math.max(1, base.diasMax - 1) + p,
      etiquetas: [],
    },
    {
      id: "sucursal",
      nombre: "Recoger en sucursal",
      costo: Math.round(base.costo * 0.85),
      diasMin: base.diasMin + 1 + p,
      diasMax: base.diasMax + 1 + p,
      etiquetas: [],
    },
  ];
  const barata = ops.reduce((a, b) => (b.costo < a.costo ? b : a));
  const rapida = ops.reduce((a, b) => (b.diasMax < a.diasMax ? b : a));
  const recomendada = ops.reduce((a, b) => (b.costo * b.diasMax < a.costo * a.diasMax ? b : a));
  barata.etiquetas.push("Más barata");
  rapida.etiquetas.push("Más rápida");
  recomendada.etiquetas.push("Recomendada");
  return ops;
}

/** Fecha estimada de llegada en días hábiles (sin sábado ni domingo). */
export function fechaLlegada(desde: Date, diasHabiles: number): Date {
  const d = new Date(desde);
  let n = 0;
  while (n < diasHabiles) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) n++;
  }
  return d;
}
