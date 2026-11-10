"use client";
import { FileText, MessageCircle, RotateCcw, Star } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { TRAZO } from "@/components/Iconos";
import { reducirImagen } from "@/components/tienda/fotos";
import { DesglosePedido, EtiquetaEstado, LineaTiempo, NOMBRE_PAGO } from "@/components/tienda/Pedido";
import { Requiere } from "@/components/tienda/Requiere";
import { mostrarAviso } from "@/components/tienda/Toasts";
import { estados } from "@/lib/catalogo";
import { accionPedido, agregarVarias, puedeResenar, resenar } from "@/lib/tienda/almacen";
import { puede } from "@/lib/tienda/pedidos";
import { actorEn, puedeVerPedido } from "@/lib/tienda/permisos";
import type { EstadoTienda, Usuario } from "@/lib/tienda/tipos";

export default function Pagina() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="wrap pagina">
      <Requiere roles={["comprador", "proveedor", "admin"]}>{(s, u) => <DetallePedido s={s} u={u} id={id} />}</Requiere>
    </div>
  );
}

function DetallePedido({ s, u, id }: { s: EstadoTienda; u: Usuario; id: string }) {
  const router = useRouter();
  const p = s.pedidos.find((x) => x.id === id);
  const [motivo, setMotivo] = useState("");
  const [problema, setProblema] = useState(false);
  const [error, setError] = useState("");
  if (!p || !puedeVerPedido(u, p)) {
    return <div className="vacio-estado"><h1 style={{ fontSize: 26 }}>No encontramos ese pedido</h1><Link className="btn btn-primary" href="/pedidos">Mis pedidos</Link></div>;
  }
  const actor = actorEn(u, p)!;
  const prov = s.proveedores.find((x) => x.id === p.proveedorId)!;
  const disputa = s.disputas.find((d) => d.pedidoId === p.id);
  const resena = s.resenas.find((r) => r.pedidoId === p.id);

  const hacer = (accion: Parameters<typeof accionPedido>[1], nota = "", ok = "") => {
    setError("");
    try {
      accionPedido(p.id, accion, nota);
      if (ok) mostrarAviso(ok);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <>
      <div className="pagina-cabecera">
        <div>
          <p className="chico"><Link href={actor === "proveedor" ? "/panel/pedidos" : actor === "admin" ? "/admin" : "/pedidos"}>← Pedidos</Link></p>
          <h1>{p.folio}</h1>
          <p>{prov.nombre} · {new Date(p.creado).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <EtiquetaEstado estado={p.estado} />
      </div>

      <div className="rejilla-lateral">
        <div className="pila" style={{ gap: 16 }}>
          <section className="tarjeta" aria-labelledby="t-seg">
            <h2 id="t-seg">Seguimiento</h2>
            <LineaTiempo pedido={p} />
            {error && <p className="error-form" role="alert">{error}</p>}
            {actor === "comprador" && (
              <div className="fila">
                {puede(p, "confirmar_entrega", "comprador") && (
                  <button type="button" className="btn btn-primary" onClick={() => hacer("confirmar_entrega", "El comprador confirmó que recibió todo bien.", `Confirmaste la entrega. Liberamos el pago a ${prov.nombre}.`)}>
                    Confirmar que recibí todo bien
                  </button>
                )}
                {puede(p, "abrir_disputa", "comprador") && !problema && (
                  <button type="button" className="btn btn-ghost" onClick={() => setProblema(true)}>Tuve un problema con mi pedido</button>
                )}
                {puede(p, "cancelar", "comprador") && (
                  <button type="button" className="btn btn-ghost" onClick={() => hacer("cancelar", "Cancelado por el comprador.", "Cancelamos tu pedido.")}>Cancelar pedido</button>
                )}
              </div>
            )}
            {actor === "comprador" && !puede(p, "cancelar", "comprador") && ["preparando", "enviado"].includes(p.estado) && (
              <p className="ayuda">Ya no se puede cancelar: el proveedor empezó a preparar tu pedido. Si algo llega mal, usa “Tuve un problema”.</p>
            )}
            {problema && (
              <form className="pila" style={{ padding: 16, borderRadius: 12, background: "var(--surface-2)" }} onSubmit={(e) => { e.preventDefault(); if (motivo.trim().length < 10) return setError("Cuéntanos qué pasó (al menos 10 caracteres)."); hacer("abrir_disputa", motivo.trim(), "Abrimos tu reporte y detuvimos el pago al proveedor."); setProblema(false); }}>
                <div className="campo"><label htmlFor="motivo">¿Qué pasó?</label><textarea id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Llegaron piezas rotas, faltó producto, no es lo que pedí…" /></div>
                <p className="ayuda">Detendremos el pago al proveedor y administración revisará el caso.</p>
                <div className="fila"><button className="btn btn-primary btn-sm" type="submit">Enviar reporte</button><button className="btn btn-ghost btn-sm" type="button" onClick={() => setProblema(false)}>Cancelar</button></div>
              </form>
            )}
          </section>

          {disputa && (
            <section className="tarjeta" aria-labelledby="t-disp">
              <h2 id="t-disp">Reporte del problema</h2>
              <ol className="pila" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {disputa.historial.map((h, i) => (
                  <li key={i} className="chico"><strong>{h.autor}</strong> · {new Date(h.fecha).toLocaleString("es-MX")}<br />{h.texto}</li>
                ))}
              </ol>
            </section>
          )}

          {actor === "comprador" && puedeResenar(s, p.id) && <FormResena pedidoId={p.id} proveedor={prov.nombre} />}
          {resena && (
            <section className="tarjeta" aria-labelledby="t-res">
              <h2 id="t-res">Tu reseña</h2>
              <p className="fila"><Star strokeWidth={TRAZO} fill="var(--amber)" color="var(--amber)" width={18} aria-hidden /> {resena.estrellas} de 5</p>
              <p>{resena.texto}</p>
              {resena.respuesta && <p className="chico suave"><strong>Respuesta de {prov.nombre}:</strong> {resena.respuesta}</p>}
            </section>
          )}
        </div>

        <aside className="pila" style={{ gap: 16 }}>
          <section className="tarjeta" aria-labelledby="t-det">
            <h2 id="t-det">Detalle</h2>
            <DesglosePedido p={p} proveedor={actor !== "comprador"} />
            <p className="chico"><strong>{NOMBRE_PAGO[p.pago.estado]}</strong>{p.pago.reembolsado ? ` · ${(p.pago.reembolsado / 100).toLocaleString("es-MX", { style: "currency", currency: "MXN" })}` : ""}</p>
          </section>
          <section className="tarjeta" aria-labelledby="t-env">
            <h2 id="t-env">Envío</h2>
            <p className="chico">{p.direccion.nombre}<br />{p.direccion.calle}, {p.direccion.colonia}<br />{p.direccion.cp} {p.direccion.ciudad}, {estados.find((e) => e.clave === p.direccion.estado)?.nombre}</p>
            <p className="chico suave">{p.envio.servicio} · {p.envio.diasMin}–{p.envio.diasMax} días hábiles (simulado)</p>
          </section>
          {p.factura.solicitada && (
            <section className="tarjeta" aria-labelledby="t-fac">
              <h2 id="t-fac">Factura</h2>
              <p className="chico">RFC {p.factura.rfc} · {p.factura.razonSocial} · {p.factura.usoCfdi}</p>
              {p.factura.xml ? (
                <p className="fila chico"><FileText strokeWidth={TRAZO} width={18} aria-hidden /> {p.factura.xml} · {p.factura.pdf} <span className="suave">(archivos de demostración)</span></p>
              ) : (
                <p className="chico suave">El proveedor todavía no sube tu factura.</p>
              )}
            </section>
          )}
          {actor === "comprador" && (
            <div className="fila">
              <Link className="btn btn-ghost btn-sm" href={`/mensajes?proveedor=${prov.id}`}><MessageCircle strokeWidth={TRAZO} width={16} aria-hidden /> Escribir a {prov.nombre}</Link>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
                const r = agregarVarias(p.lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })));
                mostrarAviso(r.agregadas ? `Agregamos ${r.agregadas} producto(s) a tu carrito.${r.omitidas.length ? ` ${r.omitidas[0]}` : ""}` : r.omitidas[0] ?? "No se pudo.", { href: "/carrito", texto: "Ver carrito" });
                if (r.agregadas) router.prefetch("/carrito");
              }}>
                <RotateCcw strokeWidth={TRAZO} width={16} aria-hidden /> Volver a pedir
              </button>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function FormResena({ pedidoId, proveedor }: { pedidoId: string; proveedor: string }) {
  const [estrellas, setEstrellas] = useState(0);
  const [texto, setTexto] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [error, setError] = useState("");
  return (
    <form className="tarjeta" aria-labelledby="t-nueva" onSubmit={(e) => { e.preventDefault(); try { resenar(pedidoId, estrellas, texto, fotos); mostrarAviso(`Gracias. Tu reseña ya aparece en la ficha de ${proveedor}.`); } catch (err) { setError((err as Error).message); } }}>
      <h2 id="t-nueva">¿Cómo te fue con {proveedor}?</h2>
      <fieldset className="fila" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="sr-only">Calificación</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="estrella-opcion">
            <input type="radio" name="estrellas" value={n} className="sr-only" checked={estrellas === n} onChange={() => setEstrellas(n)} />
            <Star strokeWidth={TRAZO} width={30} height={30} color="var(--amber)" fill={n <= estrellas ? "var(--amber)" : "none"} aria-hidden />
            <span className="sr-only">{n} {n === 1 ? "estrella" : "estrellas"}</span>
          </label>
        ))}
      </fieldset>
      <div className="campo"><label htmlFor="texto">Tu experiencia</label><textarea id="texto" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="¿Llegó a tiempo? ¿Coincidió con la descripción?" /></div>
      <div className="campo">
        <label htmlFor="fotos">Fotos (opcional, hasta 3)</label>
        <input id="fotos" type="file" accept="image/*" multiple onChange={async (e) => { try { const fs = await Promise.all(Array.from(e.target.files ?? []).slice(0, 3).map((f) => reducirImagen(f, 480))); setFotos(fs); } catch (err) { setError((err as Error).message); } }} />
        {fotos.length > 0 && <p className="ayuda">{fotos.length} foto(s) lista(s).</p>}
      </div>
      {error && <p className="error-form" role="alert">{error}</p>}
      <button className="btn btn-primary" type="submit">Publicar reseña</button>
    </form>
  );
}
