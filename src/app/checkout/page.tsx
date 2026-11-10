"use client";
import { CreditCard, Landmark, ShieldCheck, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { TRAZO } from "@/components/Iconos";
import { Requiere } from "@/components/tienda/Requiere";
import { estados } from "@/lib/catalogo";
import { pesos } from "@/lib/surtido/formato";
import { agruparCarrito, aplicarCupon, comprar, guardarDireccion, opcionesEnvioGrupo } from "@/lib/tienda/almacen";
import { cpAEstado, rfcValido } from "@/lib/tienda/cp";
import type { OpcionEnvio } from "@/lib/tienda/envios";
import { fechaLlegada } from "@/lib/tienda/envios";
import type { Direccion, EstadoTienda, MetodoPago, Usuario } from "@/lib/tienda/tipos";

const PASOS = ["Dirección", "Envío", "Pago"];
const fecha = new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short" });

export default function Pagina() {
  return (
    <div className="wrap pagina" style={{ maxWidth: 980 }}>
      <Requiere roles={["comprador"]}>{(s, u) => <Checkout s={s} u={u} />}</Requiere>
    </div>
  );
}

function Checkout({ s, u }: { s: EstadoTienda; u: Usuario }) {
  const router = useRouter();
  const [paso, setPaso] = useState(0);
  const [dirId, setDirId] = useState(u.direcciones[0]?.id ?? "nueva");
  const [nueva, setNueva] = useState<Omit<Direccion, "id">>({ alias: "", nombre: u.nombre, calle: "", colonia: "", cp: "", ciudad: "", estado: "", telefono: "" });
  const [envios, setEnvios] = useState<Record<string, OpcionEnvio["id"]>>({});
  const [cupones, setCupones] = useState<Record<string, string>>({});
  const [metodo, setMetodo] = useState<MetodoPago>("tarjeta");
  const [tarjeta, setTarjeta] = useState({ numero: "", vencimiento: "", cvv: "", titular: "" });
  const [factura, setFactura] = useState({ solicitada: false, rfc: "", razonSocial: "", usoCfdi: "G03" });
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const grupos = useMemo(() => agruparCarrito(s), [s]);
  const direccion = dirId === "nueva" ? null : u.direcciones.find((d) => d.id === dirId) ?? null;
  const destino = direccion?.estado ?? nueva.estado;

  if (grupos.length === 0) {
    return (
      <div className="vacio-estado">
        <h1 style={{ fontSize: 26 }}>No hay nada que pagar</h1>
        <p>Tu carrito está vacío.</p>
        <Link className="btn btn-primary" href="/catalogo">Ir al catálogo</Link>
      </div>
    );
  }

  const resumen = grupos.map((g) => {
    const ops = destino ? opcionesEnvioGrupo(g, destino) : [];
    const op = ops.find((o) => o.id === (envios[g.proveedor.id] ?? "estandar"));
    const cup = aplicarCupon(s, g.proveedor.id, cupones[g.proveedor.id] ?? "", g.productos);
    const base = g.productos - cup.descuento;
    const ivaP = g.proveedor.cobraIva ? Math.round(base * 0.16) : 0;
    const envio = op?.costo ?? 0;
    const ivaE = Math.round(envio * 0.16);
    return { g, ops, op, cup, base, iva: ivaP + ivaE, envio, total: base + ivaP + envio + ivaE, noEnvia: !!destino && !g.proveedor.enviaA.includes(destino) };
  });
  const total = resumen.reduce((a, r) => a + r.total, 0);

  const siguiente = () => {
    setError("");
    try {
      if (paso === 0) {
        if (dirId === "nueva") {
          const id = guardarDireccion({ ...nueva, alias: nueva.alias || "Envío" });
          setDirId(id);
        }
        if (resumen.some((r) => r.noEnvia)) throw new Error(`${resumen.find((r) => r.noEnvia)!.g.proveedor.nombre} no envía a ese estado. Quítalo del carrito o cambia la dirección.`);
      }
      setPaso((p) => p + 1);
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const pagar = () => {
    setError("");
    if (factura.solicitada && !rfcValido(factura.rfc)) return setError("El RFC no tiene un formato válido.");
    const dir = u.direcciones.find((d) => d.id === dirId) ?? s.usuarios.find((x) => x.id === u.id)!.direcciones.find((d) => d.id === dirId);
    if (!dir) return setError("Elige una dirección.");
    setOcupado(true);
    try {
      const r = comprar({ direccion: dir, envios, cupones, metodo, tarjeta: metodo === "tarjeta" ? tarjeta : undefined, factura });
      router.push(`/pedidos?compra=${r.grupoCompra}`);
    } catch (e) {
      setError((e as Error).message);
      setOcupado(false);
    }
  };

  return (
    <>
      <div className="pagina-cabecera"><div><h1>Pagar</h1></div></div>
      <p className="aviso-demo" style={{ borderRadius: 12 }} role="note">
        <strong>Modo demostración: no uses tarjetas reales.</strong> No se cobra nada; usa la tarjeta de prueba 4242 4242 4242 4242.
      </p>
      <div className="progreso" aria-label={`Paso ${paso + 1} de ${PASOS.length}: ${PASOS[paso]}`}>
        <div className="progreso-barra" aria-hidden><span style={{ transform: `scaleX(${(paso + 1) / PASOS.length})` }} /></div>
        <ol>{PASOS.map((p, i) => <li key={p} aria-current={i === paso ? "step" : undefined}>{i + 1}. {p}</li>)}</ol>
      </div>

      <div className="rejilla-lateral">
        <div className="tarjeta">
          {paso === 0 && (
            <fieldset className="pila" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend><h2>¿A dónde lo enviamos?</h2></legend>
              <div className="opciones">
                {u.direcciones.map((d) => (
                  <label key={d.id} className="opcion">
                    <input type="radio" name="dir" checked={dirId === d.id} onChange={() => setDirId(d.id)} />
                    <span className="opcion-texto"><strong>{d.alias}</strong><span className="chico suave">{d.calle}, {d.colonia}, {d.cp} {d.ciudad}, {estados.find((e) => e.clave === d.estado)?.nombre}</span></span>
                  </label>
                ))}
                <label className="opcion">
                  <input type="radio" name="dir" checked={dirId === "nueva"} onChange={() => setDirId("nueva")} />
                  <span className="opcion-texto"><strong>Nueva dirección</strong></span>
                </label>
              </div>
              {dirId === "nueva" && (
                <div className="campos-2">
                  <div className="campo"><label htmlFor="n-nombre">Recibe</label><input id="n-nombre" value={nueva.nombre} autoComplete="name" onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} /></div>
                  <div className="campo"><label htmlFor="n-tel">Teléfono (10 dígitos)</label><input id="n-tel" inputMode="tel" autoComplete="tel-national" value={nueva.telefono} onChange={(e) => setNueva({ ...nueva, telefono: e.target.value })} /></div>
                  <div className="campo">
                    <label htmlFor="n-cp">Código postal</label>
                    <input id="n-cp" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={nueva.cp} onChange={(e) => {
                      const cp = e.target.value.replace(/\D/g, "").slice(0, 5);
                      const r = cpAEstado(cp);
                      setNueva((n) => ({ ...n, cp, ...(r ? { estado: r.estado, ciudad: n.ciudad || r.ciudad } : {}) }));
                    }} />
                    {nueva.cp.length === 5 && <p className="ayuda">{cpAEstado(nueva.cp) ? `Detectamos ${estados.find((e) => e.clave === cpAEstado(nueva.cp)!.estado)?.nombre}.` : "No reconocemos ese código postal."}</p>}
                  </div>
                  <div className="campo">
                    <label htmlFor="n-estado">Estado</label>
                    <select id="n-estado" value={nueva.estado} onChange={(e) => setNueva({ ...nueva, estado: e.target.value })}>
                      <option value="">Elige…</option>
                      {estados.map((e) => <option key={e.clave} value={e.clave}>{e.nombre}</option>)}
                    </select>
                  </div>
                  <div className="campo"><label htmlFor="n-ciudad">Ciudad o municipio</label><input id="n-ciudad" autoComplete="address-level2" value={nueva.ciudad} onChange={(e) => setNueva({ ...nueva, ciudad: e.target.value })} /></div>
                  <div className="campo"><label htmlFor="n-colonia">Colonia</label><input id="n-colonia" value={nueva.colonia} onChange={(e) => setNueva({ ...nueva, colonia: e.target.value })} /></div>
                  <div className="campo" style={{ gridColumn: "1 / -1" }}><label htmlFor="n-calle">Calle y número</label><input id="n-calle" autoComplete="address-line1" value={nueva.calle} onChange={(e) => setNueva({ ...nueva, calle: e.target.value })} /></div>
                  <div className="campo"><label htmlFor="n-alias">Nombre de la dirección</label><input id="n-alias" placeholder="Mi tienda" value={nueva.alias} onChange={(e) => setNueva({ ...nueva, alias: e.target.value })} /></div>
                </div>
              )}
            </fieldset>
          )}

          {paso === 1 && (
            <div className="pila" style={{ gap: 24 }}>
              <h2>Elige el envío de cada proveedor</h2>
              {resumen.map((r) => (
                <fieldset key={r.g.proveedor.id} className="pila" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend style={{ fontWeight: 600, marginBottom: 8 }}>{r.g.proveedor.nombre} · desde {r.g.proveedor.ciudad}</legend>
                  <div className="opciones">
                    {r.ops.map((o) => (
                      <label key={o.id} className="opcion">
                        <input type="radio" name={`envio-${r.g.proveedor.id}`} checked={(envios[r.g.proveedor.id] ?? "estandar") === o.id} onChange={() => setEnvios({ ...envios, [r.g.proveedor.id]: o.id })} />
                        <span className="opcion-texto">
                          <strong>{o.nombre}</strong>
                          <span className="chico suave">Llega {fecha.format(fechaLlegada(new Date(), o.diasMin))} – {fecha.format(fechaLlegada(new Date(), o.diasMax))}</span>
                          <span className="fila" style={{ gap: 4 }}>{o.etiquetas.map((t) => <span key={t} className="estado" data-tono={t === "Recomendada" ? "verde" : "ambar"}>{t}</span>)}</span>
                        </span>
                        <span className="precio-destacado">{pesos(o.costo)}</span>
                      </label>
                    ))}
                  </div>
                  <div className="campo" style={{ maxWidth: 280 }}>
                    <label htmlFor={`cup-${r.g.proveedor.id}`}>Cupón de {r.g.proveedor.nombre}</label>
                    <input id={`cup-${r.g.proveedor.id}`} value={cupones[r.g.proveedor.id] ?? ""} onChange={(e) => setCupones({ ...cupones, [r.g.proveedor.id]: e.target.value.toUpperCase() })} placeholder="Opcional" />
                    {r.cup.error && cupones[r.g.proveedor.id] && <p className="error-campo">{r.cup.error}</p>}
                    {r.cup.descuento > 0 && <p className="ok-form">Descuento de {pesos(r.cup.descuento)}</p>}
                  </div>
                </fieldset>
              ))}
              <p className="ayuda">Envíos simulados con la tabla de tarifas de Provana. Precios sin IVA.</p>
            </div>
          )}

          {paso === 2 && (
            <div className="pila" style={{ gap: 20 }}>
              <fieldset className="pila" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend><h2>¿Cómo quieres pagar?</h2></legend>
                <div className="opciones">
                  {([
                    ["tarjeta", "Tarjeta de prueba", "Se aprueba al momento", CreditCard],
                    ["oxxo", "Pago en tienda de conveniencia", "Te damos una referencia; tienes 3 días", Store],
                    ["spei", "Transferencia SPEI", "Te damos una CLABE de demostración", Landmark],
                  ] as const).map(([id, nombre, ayuda, I]) => (
                    <label key={id} className="opcion">
                      <input type="radio" name="metodo" checked={metodo === id} onChange={() => setMetodo(id)} />
                      <I strokeWidth={TRAZO} width={22} height={22} aria-hidden />
                      <span className="opcion-texto"><strong>{nombre}</strong><span className="chico suave">{ayuda}</span></span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {metodo === "tarjeta" && (
                <div className="campos-2">
                  <div className="campo" style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="t-num">Número de tarjeta de prueba</label>
                    <input id="t-num" inputMode="numeric" autoComplete="off" placeholder="4242 4242 4242 4242" value={tarjeta.numero} onChange={(e) => setTarjeta({ ...tarjeta, numero: e.target.value.replace(/[^\d ]/g, "").slice(0, 23) })} />
                    <p className="ayuda">Aprobada: 4242 4242 4242 4242 · Rechazada: 4000 0000 0000 0002. No guardamos el número.</p>
                  </div>
                  <div className="campo"><label htmlFor="t-venc">Vencimiento (MM/AA)</label><input id="t-venc" autoComplete="off" placeholder="12/30" value={tarjeta.vencimiento} onChange={(e) => setTarjeta({ ...tarjeta, vencimiento: e.target.value.slice(0, 5) })} /></div>
                  <div className="campo"><label htmlFor="t-cvv">Código de seguridad</label><input id="t-cvv" inputMode="numeric" autoComplete="off" placeholder="123" value={tarjeta.cvv} onChange={(e) => setTarjeta({ ...tarjeta, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })} /></div>
                  <div className="campo" style={{ gridColumn: "1 / -1" }}><label htmlFor="t-tit">Nombre en la tarjeta</label><input id="t-tit" autoComplete="off" value={tarjeta.titular} onChange={(e) => setTarjeta({ ...tarjeta, titular: e.target.value })} /></div>
                </div>
              )}
              <label className="casilla"><input type="checkbox" checked={factura.solicitada} onChange={(e) => setFactura({ ...factura, solicitada: e.target.checked })} /><span>Necesito factura (CFDI)</span></label>
              {factura.solicitada && (
                <div className="campos-2">
                  <div className="campo"><label htmlFor="f-rfc">RFC</label><input id="f-rfc" value={factura.rfc} onChange={(e) => setFactura({ ...factura, rfc: e.target.value.toUpperCase() })} /></div>
                  <div className="campo"><label htmlFor="f-razon">Razón social</label><input id="f-razon" value={factura.razonSocial} onChange={(e) => setFactura({ ...factura, razonSocial: e.target.value })} /></div>
                  <div className="campo">
                    <label htmlFor="f-uso">Uso del CFDI</label>
                    <select id="f-uso" value={factura.usoCfdi} onChange={(e) => setFactura({ ...factura, usoCfdi: e.target.value })}>
                      <option value="G01">G01 · Adquisición de mercancías</option>
                      <option value="G03">G03 · Gastos en general</option>
                      <option value="S01">S01 · Sin efectos fiscales</option>
                    </select>
                  </div>
                </div>
              )}
              <p className="fila chico suave"><ShieldCheck strokeWidth={TRAZO} width={18} height={18} aria-hidden /> Tu pago queda retenido hasta que confirmes la entrega. Si algo sale mal, se detiene.</p>
            </div>
          )}

          {error && <p className="error-form" role="alert">{error}</p>}
          <div className="fila-entre">
            {paso > 0 ? <button type="button" className="btn btn-ghost" onClick={() => setPaso((p) => p - 1)}>Atrás</button> : <Link href="/carrito" className="btn btn-ghost">Volver al carrito</Link>}
            {paso < 2 ? (
              <button type="button" className="btn btn-primary" onClick={siguiente} disabled={paso === 0 && dirId === "nueva" && !nueva.cp}>Continuar</button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={pagar} disabled={ocupado}>{ocupado ? "Procesando…" : `Pagar ${pesos(total)}`}</button>
            )}
          </div>
        </div>

        <aside className="tarjeta" aria-labelledby="t-res">
          <h2 id="t-res">Tu compra</h2>
          {resumen.map((r) => (
            <div key={r.g.proveedor.id} className="pila chico" style={{ gap: 4 }}>
              <strong>{r.g.proveedor.nombre}</strong>
              <div className="fila-entre"><span className="suave">Productos</span><span className="num">{pesos(r.g.productos)}</span></div>
              {r.cup.descuento > 0 && <div className="fila-entre"><span className="suave">Cupón</span><span className="num">−{pesos(r.cup.descuento)}</span></div>}
              <div className="fila-entre"><span className="suave">Envío {r.op ? `(${r.op.nombre})` : ""}</span><span className="num">{destino ? pesos(r.envio) : "—"}</span></div>
              <div className="fila-entre"><span className="suave">IVA</span><span className="num">{pesos(r.iva)}</span></div>
              {r.noEnvia && <p className="error-campo">No envía a ese estado.</p>}
            </div>
          ))}
          <hr className="separador" />
          <div className="fila-entre"><strong>Total</strong><strong className="precio-destacado" style={{ fontSize: 22 }}>{pesos(total)}</strong></div>
          <p className="ayuda">{grupos.length} pedidos y {grupos.length} envíos independientes.</p>
        </aside>
      </div>
    </>
  );
}
