import type { Centavos, EstadoMx, Medidas, TablaTarifas, Zona } from "./tipos";

/**
 * Zona de envío entre dos estados:
 * - local: mismo estado
 * - regional: misma región
 * - nacional: cualquier otro caso
 */
export function zonaEnvio(origen: string, destino: string, estados: EstadoMx[]): Zona {
  if (origen === destino) return "local";
  const ro = estados.find((e) => e.clave === origen)?.region;
  const rd = estados.find((e) => e.clave === destino)?.region;
  if (ro && rd && ro === rd) return "regional";
  return "nacional";
}

/** Peso volumétrico de una pieza en kg. */
export function pesoVolumetricoKg(medidas: Medidas | null | undefined, divisor: number): number {
  if (!medidas) return 0;
  return (medidas.largoCm * medidas.anchoCm * medidas.altoCm) / divisor;
}

/**
 * Kilos cobrables de un paquete: el mayor entre peso real y volumétrico,
 * redondeado hacia arriba al kilo, mínimo 1 kg.
 */
export function kgCobrables(pesoRealKg: number, pesoVolKg: number): number {
  // Se resta un epsilon para que 10.000000001 (error de punto flotante) cuente como 10.
  return Math.max(1, Math.ceil(Math.max(pesoRealKg, pesoVolKg) - 1e-9));
}

export interface CotizacionEnvio {
  zona: Zona;
  zonaExtendida: boolean;
  kgCobrables: number;
  costo: Centavos;
  diasMin: number;
  diasMax: number;
}

/** Costo de envío sin IVA: base de la zona + costo por kg + recargo de zona extendida. */
export function cotizarEnvio(
  origen: string,
  destino: string,
  kg: number,
  tarifas: TablaTarifas,
  estados: EstadoMx[],
): CotizacionEnvio {
  const zona = zonaEnvio(origen, destino, estados);
  const t = tarifas.zonas[zona];
  const extendida = tarifas.zonaExtendida.estados.includes(destino);
  return {
    zona,
    zonaExtendida: extendida,
    kgCobrables: kg,
    costo: t.base + t.porKg * kg + (extendida ? tarifas.zonaExtendida.recargo : 0),
    diasMin: t.diasMin + (extendida ? tarifas.zonaExtendida.diasExtra : 0),
    diasMax: t.diasMax + (extendida ? tarifas.zonaExtendida.diasExtra : 0),
  };
}
