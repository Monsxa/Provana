"use client";
import { PackageOpen, Receipt } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { TRAZO } from "@/components/Iconos";
import { EtiquetaEstado, NOMBRE_PAGO } from "@/components/tienda/Pedido";
import { Requiere } from "@/components/tienda/Requiere";
import { mostrarAviso } from "@/components/tienda/Toasts";
import { pesos } from "@/lib/surtido/formato";
import { simularPagoRecibido } from "@/lib/tienda/almacen";
import type { EstadoTienda, Usuario } from "@/lib/tienda/tipos";

export default function Pagina() {
  return (
    <div className="wrap pagina">
      <Suspense>
        <Requiere roles={["comprador"]}>{(s, u) => <Pedidos s={s} u={u} />}</Requiere>
      </Suspense>
    </div>
  );
}

function Pedidos({ s, u }: { s: EstadoTienda; u: Usuario }) {
  const compra = useSearchParams().get("compra");
  const mios = s.pedidos.filter((p) => p.compradorId === u.id);
  const deCompra = compra ? mios.filter((p) => p.grupoCompra === compra) : [];
  const pendiente = deCompra.find((p) => p.estado === "pendiente_pago");

  return (
    <>
      <div className="pagina-cabecera"><div><h1>Mis pedidos</h1><p>Sigue cada pedido, confirma la entrega y califica al proveedor.</p></div></div>

      {deCompra.length > 0 && (
        <section className="tarjeta" aria-labelledby="t-comprobante" style={{ background: "var(--accent-tint)" }}>
          <div className="fila"><Receipt strokeWidth={TRAZO} aria-hidden /><h2 id="t-comprobante">Comprobante de compra</h2></div>
          <p className="chico">Modo demostración: no se cobró nada.</p>
          <dl className="pila chico" style={{ margin: 0 }}>
            {deCompra.map((p) => (
              <div key={p.id} className="fila-entre">
                <dt>{p.folio} · {s.proveedores.find((x) => x.id === p.proveedorId)?.nombre}</dt>
                <dd className="num">{pesos(p.total)}</dd>
              </div>
            ))}
            <div className="fila-entre" style={{ fontWeight: 700 }}><dt>Total</dt><dd className="num">{pesos(deCompra.reduce((a, p) => a + p.total, 0))}</dd></div>
            <div className="fila-entre"><dt>Referencia</dt><dd className="num">{deCompra[0].pago.referencia}</dd></div>
            {deCompra[0].pago.ultimos4 && <div className="fila-entre"><dt>Tarjeta de prueba</dt><dd className="num">•••• {deCompra[0].pago.ultimos4}</dd></div>}
          </dl>
          {pendiente ? (
            <div className="pila">
              <p>{pendiente.pago.metodo === "oxxo" ? "Paga en cualquier tienda de conveniencia con la referencia de arriba. Tienes 3 días." : "Transfiere por SPEI a la CLABE de arriba desde tu banca en línea."}</p>
              <button type="button" className="btn btn-primary" onClick={() => { simularPagoRecibido(compra!); mostrarAviso("Recibimos tu pago (simulado). Tu dinero queda retenido hasta la entrega."); }}>
                Simular que ya pagué
              </button>
            </div>
          ) : (
            <p className="ok-form">Pago confirmado. Tu dinero queda retenido hasta que confirmes la entrega.</p>
          )}
        </section>
      )}

      {mios.length === 0 ? (
        <div className="vacio-estado greca">
          <span className="icono-grande"><PackageOpen strokeWidth={TRAZO} aria-hidden /></span>
          <h2>Aún no tienes pedidos</h2>
          <p>Cuando compres, aquí verás el seguimiento de cada envío.</p>
          <Link className="btn btn-primary" href="/catalogo">Ir al catálogo</Link>
        </div>
      ) : (
        <ul className="pila" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {mios.map((p) => {
            const prov = s.proveedores.find((x) => x.id === p.proveedorId)!;
            return (
              <li key={p.id} className="tarjeta" style={{ gap: 8, position: "relative" }}>
                <div className="fila-entre">
                  <h2 style={{ fontSize: 18 }}><Link href={`/pedidos/${p.id}`} style={{ textDecoration: "none" }}>{p.folio} · {prov.nombre}</Link></h2>
                  <EtiquetaEstado estado={p.estado} />
                </div>
                <p className="chico suave">{p.lineas.map((l) => `${l.cantidad} × ${l.nombre}`).join(" · ")}</p>
                <div className="fila-entre chico"><span>{NOMBRE_PAGO[p.pago.estado]}</span><strong className="num">{pesos(p.total)}</strong></div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
