"use client";
/** Piezas de pedido compartidas por comprador, proveedor y administración. */
import { Check, CircleX, Gavel, PackageCheck, Truck } from "lucide-react";
import { TRAZO } from "@/components/Iconos";
import { pesos } from "@/lib/surtido/formato";
import { NOMBRE_ESTADO, PASOS } from "@/lib/tienda/pedidos";
import type { EstadoPedido, Pedido } from "@/lib/tienda/tipos";

const fechaHora = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function tonoEstado(e: EstadoPedido): "verde" | "ambar" | "rojo" | undefined {
  if (e === "completado") return "verde";
  if (e === "cancelado" || e === "reembolsado" || e === "en_disputa") return "rojo";
  if (e === "pendiente_pago") return "ambar";
  return undefined;
}

export function EtiquetaEstado({ estado }: { estado: EstadoPedido }) {
  return <span className="estado" data-tono={tonoEstado(estado)}>{NOMBRE_ESTADO[estado]}</span>;
}

export const NOMBRE_PAGO: Record<Pedido["pago"]["estado"], string> = {
  pendiente: "Pago pendiente",
  retenido: "Pago retenido por Provana",
  detenido: "Pago detenido por disputa",
  liberado: "Pago liberado al proveedor",
  reembolsado: "Reembolsado",
  reembolso_parcial: "Reembolso parcial",
};

/** Línea de tiempo que se dibuja al avanzar de estado, con palomita que se traza sola. */
export function LineaTiempo({ pedido }: { pedido: Pedido }) {
  const fuera = ["cancelado", "en_disputa", "reembolsado"].includes(pedido.estado);
  const pasos: EstadoPedido[] = fuera ? [...PASOS.filter((p) => pedido.eventos.some((e) => e.estado === p)), pedido.estado] : PASOS;
  return (
    <ol className="linea-tiempo" aria-label="Seguimiento del pedido">
      {pasos.map((paso, i) => {
        const ev = [...pedido.eventos].reverse().find((e) => e.estado === paso);
        const hecho = !!ev;
        const Icono = paso === "cancelado" || paso === "reembolsado" ? CircleX : paso === "en_disputa" ? Gavel : paso === "enviado" ? Truck : paso === "completado" ? PackageCheck : null;
        return (
          <li key={paso} data-hecho={hecho || undefined} style={{ "--i": i } as React.CSSProperties} aria-current={paso === pedido.estado ? "step" : undefined}>
            <span className="punto" aria-hidden>
              {hecho ? (
                Icono && paso !== "enviado" ? <Icono strokeWidth={TRAZO} /> : (
                  <svg viewBox="0 0 24 24" fill="none" className="palomita"><path d="M5 12.5 10 17.5 19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )
              ) : (
                <Check strokeWidth={TRAZO} style={{ opacity: 0.35 }} />
              )}
            </span>
            <div className="pila" style={{ gap: 2 }}>
              <strong>{NOMBRE_ESTADO[paso]}</strong>
              {ev ? <span className="chico suave">{fechaHora.format(new Date(ev.fecha))}{ev.nota ? ` · ${ev.nota}` : ""}</span> : <span className="chico suave">Pendiente</span>}
              {paso === "enviado" && pedido.envio.guia && <span className="chico">Guía <strong className="num">{pedido.envio.guia}</strong> · {pedido.envio.paqueteria}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function DesglosePedido({ p, proveedor = false }: { p: Pedido; proveedor?: boolean }) {
  return (
    <dl className="pila chico" style={{ margin: 0 }}>
      {p.lineas.map((l) => (
        <div key={l.productoId} className="fila-entre">
          <dt>{l.cantidad} × {l.nombre} <span className="suave">({pesos(l.precioUnitario)} c/u)</span></dt>
          <dd className="num">{pesos(l.subtotal)}</dd>
        </div>
      ))}
      {p.descuento > 0 && <div className="fila-entre"><dt className="suave">Cupón {p.cupon}</dt><dd className="num">−{pesos(p.descuento)}</dd></div>}
      <div className="fila-entre"><dt className="suave">IVA de productos</dt><dd className="num">{pesos(p.ivaProductos)}</dd></div>
      <div className="fila-entre"><dt className="suave">Envío {p.envio.servicio} + IVA</dt><dd className="num">{pesos(p.envio.costo + p.envio.iva)}</dd></div>
      <div className="fila-entre" style={{ fontWeight: 700 }}><dt>Total</dt><dd className="num">{pesos(p.total)}</dd></div>
      {proveedor && (
        <>
          <div className="fila-entre"><dt className="suave">Comisión Provana ({Math.round(p.comisionTasa * 100)} % de productos)</dt><dd className="num">−{pesos(p.comision)}</dd></div>
          <div className="fila-entre" style={{ fontWeight: 700, color: "var(--accent)" }}><dt>Recibes al liberarse</dt><dd className="num">{pesos(p.montoProveedor)}</dd></div>
        </>
      )}
    </dl>
  );
}
