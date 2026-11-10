/**
 * Confianza de un proveedor (0–100), calculada con datos reales:
 *
 *   confianza = 100 × (0.50·Q + 0.30·K + 0.10·D + 0.10·R)
 *
 * Q · calificación  = (bayes − 1) / 4,  bayes = (10·m + Σ estrellas) / (10 + n)
 * K · cumplimiento  = (completados + 10·0.90) / (pedidosCerrados + 10)
 * D · disputas      = max(0, 1 − 10 × disputasPerdidas / pedidosCerrados)
 * R · respuesta     = min(1, max(0, (48 − h) / 46)), h = mediana de horas; sin datos 0.5
 */
export interface EstadisticasProveedor {
  sumaEstrellas: number;
  numResenas: number;
  pedidosCerrados: number;
  pedidosCompletados: number;
  disputasPerdidas: number;
  /** Mediana de horas para la primera respuesta; null si no hay datos. */
  horasRespuesta: number | null;
}

export const PESO_RESENAS_BAYES = 10;

export function calificacionBayesiana(
  sumaEstrellas: number,
  numResenas: number,
  promedioPlataforma: number,
): number {
  return (PESO_RESENAS_BAYES * promedioPlataforma + sumaEstrellas) / (PESO_RESENAS_BAYES + numResenas);
}

export function componentesConfianza(e: EstadisticasProveedor, promedioPlataforma: number) {
  const bayes = calificacionBayesiana(e.sumaEstrellas, e.numResenas, promedioPlataforma);
  const Q = Math.min(1, Math.max(0, (bayes - 1) / 4));
  const K = (e.pedidosCompletados + 10 * 0.9) / (e.pedidosCerrados + 10);
  const D = e.pedidosCerrados > 0 ? Math.max(0, 1 - (10 * e.disputasPerdidas) / e.pedidosCerrados) : 1;
  const R =
    e.horasRespuesta === null ? 0.5 : Math.min(1, Math.max(0, (48 - e.horasRespuesta) / 46));
  return { bayes, Q, K, D, R };
}

/** Confianza 0–100, redondeada a entero. */
export function calcularConfianza(e: EstadisticasProveedor, promedioPlataforma: number): number {
  const { Q, K, D, R } = componentesConfianza(e, promedioPlataforma);
  return Math.round(100 * (0.5 * Q + 0.3 * K + 0.1 * D + 0.1 * R));
}
