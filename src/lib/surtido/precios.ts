import type { Ajuste, Centavos, Escalon, Oferta } from "./tipos";

/**
 * Valida los escalones de mayoreo de un producto.
 * Regla: cada escalón pide más cantidad y cuesta menos que el anterior,
 * y el primero ya es más barato que el menudeo.
 * Devuelve la lista de errores (vacía si todo está bien).
 */
export function validarEscalones(precioMenudeo: Centavos, escalones: Escalon[]): string[] {
  const errores: string[] = [];
  if (!Number.isInteger(precioMenudeo) || precioMenudeo <= 0) {
    errores.push("El precio de menudeo debe ser mayor a cero.");
  }
  let cantidadAnterior = 1;
  let precioAnterior = precioMenudeo;
  escalones.forEach((e, i) => {
    const n = i + 1;
    if (!Number.isInteger(e.cantidadMinima) || e.cantidadMinima <= cantidadAnterior) {
      errores.push(`El escalón ${n} debe pedir más de ${cantidadAnterior} piezas.`);
    }
    if (!Number.isInteger(e.precioUnitario) || e.precioUnitario <= 0) {
      errores.push(`El escalón ${n} debe tener un precio mayor a cero.`);
    } else if (e.precioUnitario >= precioAnterior) {
      errores.push(`El escalón ${n} debe ser más barato que el anterior.`);
    }
    cantidadAnterior = e.cantidadMinima;
    precioAnterior = e.precioUnitario;
  });
  return errores;
}

/** Precio unitario para una cantidad: el escalón más alto alcanzado, o el menudeo. */
export function precioPorCantidad(
  oferta: Pick<Oferta, "precioMenudeo" | "escalones">,
  cantidad: number,
): { precioUnitario: Centavos; escalonAplicado: number | null } {
  let precioUnitario = oferta.precioMenudeo;
  let escalonAplicado: number | null = null;
  for (const e of [...oferta.escalones].sort((a, b) => a.cantidadMinima - b.cantidadMinima)) {
    if (cantidad >= e.cantidadMinima) {
      precioUnitario = e.precioUnitario;
      escalonAplicado = e.cantidadMinima;
    }
  }
  return { precioUnitario, escalonAplicado };
}

/** Cuántas piezas faltan para el siguiente escalón (null si ya está en el último). */
export function faltaParaSiguienteEscalon(
  oferta: Pick<Oferta, "escalones">,
  cantidad: number,
): { faltan: number; precioUnitario: Centavos; cantidadMinima: number } | null {
  const siguiente = [...oferta.escalones]
    .sort((a, b) => a.cantidadMinima - b.cantidadMinima)
    .find((e) => e.cantidadMinima > cantidad);
  if (!siguiente) return null;
  return {
    faltan: siguiente.cantidadMinima - cantidad,
    precioUnitario: siguiente.precioUnitario,
    cantidadMinima: siguiente.cantidadMinima,
  };
}

export interface CantidadElegida {
  cantidad: number;
  precioUnitario: Centavos;
  escalonAplicado: number | null;
  subtotal: Centavos;
  ajuste: Ajuste;
  ahorroPorExtra: Centavos;
}

/**
 * Decide cuántas piezas comprar de una oferta para cubrir `pedida`.
 * 1. Si es menos que el pedido mínimo, sube al mínimo (ajuste "minimo").
 * 2. Si `permitirExtra`, prueba los escalones superiores: si comprar más
 *    piezas da un subtotal menor, lo elige (ajuste "extra").
 * Devuelve null si no hay existencias suficientes.
 */
export function elegirCantidad(
  oferta: Pick<Oferta, "precioMenudeo" | "escalones" | "pedidoMinimo" | "existencias">,
  pedida: number,
  permitirExtra: boolean,
): CantidadElegida | null {
  const base = Math.max(pedida, oferta.pedidoMinimo);
  if (base > oferta.existencias) return null;
  const p = precioPorCantidad(oferta, base);
  let mejor: CantidadElegida = {
    cantidad: base,
    precioUnitario: p.precioUnitario,
    escalonAplicado: p.escalonAplicado,
    subtotal: p.precioUnitario * base,
    ajuste: base > pedida ? "minimo" : null,
    ahorroPorExtra: 0,
  };
  if (permitirExtra) {
    const subtotalBase = mejor.subtotal;
    for (const e of oferta.escalones) {
      if (e.cantidadMinima <= base || e.cantidadMinima > oferta.existencias) continue;
      const subtotal = e.precioUnitario * e.cantidadMinima;
      if (subtotal < mejor.subtotal) {
        mejor = {
          cantidad: e.cantidadMinima,
          precioUnitario: e.precioUnitario,
          escalonAplicado: e.cantidadMinima,
          subtotal,
          ajuste: "extra",
          ahorroPorExtra: subtotalBase - subtotal,
        };
      }
    }
  }
  return mejor;
}

/** IVA de un monto, redondeado al centavo. */
export function calcularIva(monto: Centavos, tasa: number): Centavos {
  return Math.round(monto * tasa);
}
