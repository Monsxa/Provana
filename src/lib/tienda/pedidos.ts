/**
 * Flujo de estados del pedido y liquidación (algoritmo documentado en docs/especificaciones.md).
 *
 *   pendiente_pago → confirmado → preparando → enviado → entregado → completado
 *   pendiente_pago | confirmado → cancelado          (cancelación gratis antes de "preparando")
 *   enviado | entregado → en_disputa → completado | reembolsado
 *
 * Pago: pendiente → retenido (al confirmar) → liberado (al completar) | detenido (disputa) | reembolsado.
 */
import type { Actor } from "./permisos";
import type { EstadoPago, EstadoPedido, Pedido } from "./tipos";

export type Accion =
  | "acreditar_pago"
  | "preparar"
  | "enviar"
  | "marcar_entregado"
  | "confirmar_entrega"
  | "cancelar"
  | "abrir_disputa"
  | "resolver_a_favor_proveedor"
  | "resolver_reembolso"
  | "liberar_automatico";

interface Regla {
  desde: EstadoPedido[];
  hacia: EstadoPedido;
  quien: Actor[];
  pago?: EstadoPago;
}

export const REGLAS: Record<Accion, Regla> = {
  acreditar_pago: { desde: ["pendiente_pago"], hacia: "confirmado", quien: ["sistema"], pago: "retenido" },
  preparar: { desde: ["confirmado"], hacia: "preparando", quien: ["proveedor"] },
  enviar: { desde: ["preparando"], hacia: "enviado", quien: ["proveedor"] },
  marcar_entregado: { desde: ["enviado"], hacia: "entregado", quien: ["sistema", "proveedor"] },
  confirmar_entrega: { desde: ["entregado", "enviado"], hacia: "completado", quien: ["comprador"], pago: "liberado" },
  cancelar: { desde: ["pendiente_pago", "confirmado"], hacia: "cancelado", quien: ["comprador", "proveedor", "admin"], pago: "reembolsado" },
  abrir_disputa: { desde: ["enviado", "entregado"], hacia: "en_disputa", quien: ["comprador"], pago: "detenido" },
  resolver_a_favor_proveedor: { desde: ["en_disputa"], hacia: "completado", quien: ["admin"], pago: "liberado" },
  resolver_reembolso: { desde: ["en_disputa"], hacia: "reembolsado", quien: ["admin"] },
  liberar_automatico: { desde: ["entregado"], hacia: "completado", quien: ["sistema"], pago: "liberado" },
};

export const NOMBRE_ESTADO: Record<EstadoPedido, string> = {
  pendiente_pago: "Pago pendiente",
  confirmado: "Confirmado",
  preparando: "Preparando",
  enviado: "Enviado",
  entregado: "Entregado",
  completado: "Completado",
  cancelado: "Cancelado",
  en_disputa: "En disputa",
  reembolsado: "Reembolsado",
};

/** Pasos de la línea de tiempo normal. */
export const PASOS: EstadoPedido[] = ["confirmado", "preparando", "enviado", "entregado", "completado"];

export function puede(pedido: Pick<Pedido, "estado">, accion: Accion, actor: Actor): boolean {
  const r = REGLAS[accion];
  return r.desde.includes(pedido.estado) && r.quien.includes(actor);
}

export class TransicionInvalida extends Error {}

/** Aplica una acción y devuelve el pedido nuevo (no muta el original). */
export function aplicar(
  pedido: Pedido,
  accion: Accion,
  actor: Actor,
  fecha: string,
  nota = "",
  extra: { guia?: string; paqueteria?: string; reembolso?: number } = {},
): Pedido {
  if (!puede(pedido, accion, actor)) {
    throw new TransicionInvalida(
      `No se puede "${accion}" un pedido en estado "${NOMBRE_ESTADO[pedido.estado]}" como ${actor}.`,
    );
  }
  const r = REGLAS[accion];
  const pago = { ...pedido.pago };
  if (r.pago) pago.estado = r.pago;
  if (r.pago === "liberado") pago.liberadoEn = fecha;
  if (accion === "cancelar") pago.estado = pedido.pago.estado === "pendiente" ? "pendiente" : "reembolsado";
  if (accion === "resolver_reembolso") {
    const monto = extra.reembolso ?? pedido.total;
    if (monto <= 0 || monto > pedido.total) throw new TransicionInvalida("El reembolso debe estar entre $0.01 y el total.");
    pago.reembolsado = monto;
    pago.estado = monto === pedido.total ? "reembolsado" : "reembolso_parcial";
  }
  const envio = { ...pedido.envio };
  if (accion === "enviar") {
    envio.guia = extra.guia ?? envio.guia;
    envio.paqueteria = extra.paqueteria ?? envio.paqueteria;
  }
  return {
    ...pedido,
    estado: r.hacia,
    pago,
    envio,
    eventos: [...pedido.eventos, { estado: r.hacia, fecha, nota }],
  };
}

/**
 * Liquidación: la comisión se cobra solo sobre productos (después de descuentos).
 * El proveedor recibe productos − descuento + IVA de productos − comisión.
 * El envío lo cobra Provana para pagar la guía.
 */
export function liquidar(productos: number, descuento: number, ivaProductos: number, tasa: number) {
  const base = productos - descuento;
  const comision = Math.round(base * tasa);
  return { comision, montoProveedor: base + ivaProductos - comision };
}

/** Si un pedido entregado lleva `dias` o más sin confirmación, se libera solo. */
export function debeLiberarse(pedido: Pedido, ahora: Date, dias: number): boolean {
  if (pedido.estado !== "entregado") return false;
  const entregado = [...pedido.eventos].reverse().find((e) => e.estado === "entregado");
  if (!entregado) return false;
  return ahora.getTime() - new Date(entregado.fecha).getTime() >= dias * 86_400_000;
}

/** Guía simulada: 12 dígitos estables a partir del folio. */
export function guiaSimulada(folio: string): string {
  let h = 0;
  for (const c of folio) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `PRV${String(h).padStart(10, "0").slice(0, 10)}MX`;
}
