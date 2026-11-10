"use client";
import { Minus, PackageX, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnilloConfianza } from "@/components/AnilloConfianza";
import { SelloMexicano, SelloVerificado, TRAZO } from "@/components/Iconos";
import { Cifra } from "@/components/movimiento/Cifra";
import { alternarComparar, useComparar } from "@/components/tienda/comparar";
import { Estrellas } from "@/components/tienda/Estrellas";
import { Ilustracion } from "@/components/tienda/Ilustracion";
import { Cargando } from "@/components/tienda/Requiere";
import { mostrarAviso } from "@/components/tienda/Toasts";
import { estados, tiposProducto } from "@/lib/catalogo";
import { pesos, unidades } from "@/lib/surtido/formato";
import { faltaParaSiguienteEscalon, precioPorCantidad } from "@/lib/surtido/precios";
import {
  agregarAlCarrito,
  desglose,
  ErrorTienda,
  estadisticas,
  proveedorVisible,
  solicitarCotizacion,
  usuarioDe,
  useTienda,
} from "@/lib/tienda/almacen";
import { fechaLlegada, opcionesEnvio } from "@/lib/tienda/envios";
import { tarifas } from "@/lib/catalogo";

const fecha = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" });

export function FichaProducto({ id }: { id: string }) {
  const s = useTienda();
  const p = s?.productos.find((x) => x.id === id);
  const [cantidad, setCantidad] = useState(0);
  const [destino, setDestino] = useState("");
  const [foto, setFoto] = useState(0);
  const [solicitud, setSolicitud] = useState<null | "cotizacion" | "muestra">(null);
  const comparando = useComparar().includes(id);

  useEffect(() => {
    if (p && cantidad === 0) setCantidad(Math.max(p.pedidoMinimo, 1));
  }, [p, cantidad]);
  useEffect(() => {
    const u = s && usuarioDe(s);
    if (u?.direcciones[0] && !destino) setDestino(u.direcciones[0].estado);
  }, [s, destino]);

  const calc = useMemo(() => {
    if (!p) return null;
    const q = Math.max(1, cantidad);
    const { precioUnitario, escalonAplicado } = precioPorCantidad(p, q);
    const siguiente = faltaParaSiguienteEscalon(p, q);
    const prev = [...p.escalones].reverse().find((e) => e.cantidadMinima <= q)?.cantidadMinima ?? 0;
    const avance = siguiente ? (q - prev) / (siguiente.cantidadMinima - prev) : 1;
    const subtotal = precioUnitario * q;
    return { q, precioUnitario, escalonAplicado, siguiente, avance, subtotal };
  }, [p, cantidad]);

  if (!s) return <Cargando />;
  if (!p || !proveedorVisible(s, p.proveedorId)) {
    return (
      <div className="vacio-estado greca">
        <span className="icono-grande"><PackageX strokeWidth={TRAZO} aria-hidden /></span>
        <h1 style={{ fontSize: 26 }}>Este producto no está disponible</h1>
        <p>Puede que el proveedor lo haya pausado o que su tienda esté en revisión.</p>
        <Link className="btn btn-primary" href="/catalogo">Ver el catálogo</Link>
      </div>
    );
  }
  const prov = s.proveedores.find((x) => x.id === p.proveedorId)!;
  const est = estadisticas(s, prov.id);
  const tipo = tiposProducto.find((t) => t.id === p.tipoId)!;
  const hermanos = s.productos.filter((x) => x.proveedorId === p.proveedorId && x.tipoId === p.tipoId && x.estado === "activo" && x.variante);
  const pausado = p.estado !== "activo";
  const u = usuarioDe(s);
  const iva = prov.cobraIva ? Math.round(calc!.subtotal * 0.16) : 0;
  const envio = destino && prov.enviaA.includes(destino)
    ? opcionesEnvio(prov.estado, destino, [{ cantidad: calc!.q, pesoKg: p.pesoKg, medidas: p.medidas }], prov.diasPreparacion, tarifas, estados).find((o) => o.id === "estandar")
    : null;
  const bajoMinimo = calc!.q < p.pedidoMinimo;
  const sinExistencia = calc!.q > p.existencias;
  const resenas = s.resenas.filter((r) => r.proveedorId === prov.id && !r.oculta).slice(0, 5);

  const agregar = () => {
    try {
      const msg = agregarAlCarrito(p.id, calc!.q);
      mostrarAviso(msg, { href: "/carrito", texto: "Ver carrito" });
    } catch (e) {
      mostrarAviso((e as Error).message);
    }
  };

  return (
    <>
      <nav aria-label="Ruta" className="chico suave">
        <Link href="/catalogo">Catálogo</Link> / {tipo.nombre}
      </nav>
      <div className="rejilla-2" style={{ alignItems: "start" }}>
        <div className="pila">
          <div style={{ borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-sm)", viewTransitionName: `foto-${p.id}` }}>
            <Ilustracion tipoId={p.tipoId} fotos={p.fotos.length ? [p.fotos[foto]] : []} nombre={p.nombre} />
          </div>
          {p.fotos.length > 1 && (
            <div className="fila">
              {p.fotos.map((f, i) => (
                <button key={i} type="button" className="boton-icono" aria-label={`Ver foto ${i + 1}`} aria-pressed={i === foto} onClick={() => setFoto(i)} style={{ width: 56, height: 56, borderRadius: 12, overflow: "hidden", padding: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pila" style={{ gap: 16 }}>
          <div className="pila" style={{ gap: 8 }}>
            <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)" }}>{p.nombre}</h1>
            <p className="fila chico">
              <Link href={`/proveedores/${prov.id}`}>{prov.nombre}</Link>
              <span className="suave">· {prov.ciudad}, {estados.find((e) => e.clave === prov.estado)?.nombre}</span>
            </p>
            <div className="fila">
              <SelloVerificado />
              <SelloMexicano />
              {p.permisoSanitario === "declarado-con-documento" && (
                <span className="sello sello-verificado"><ShieldCheck strokeWidth={TRAZO} aria-hidden /> Permiso sanitario con documento</span>
              )}
            </div>
            <div className="fila chico">
              <Estrellas valor={est.numResenas ? est.sumaEstrellas / est.numResenas : 0} />
              <span className="suave">{est.numResenas} reseñas · {est.pedidosTotales.toLocaleString("es-MX")} pedidos</span>
            </div>
          </div>

          {hermanos.length > 1 && (
            <div className="campo">
              <span className="etiqueta">{Object.keys(p.variante ?? {})[0]?.replace(/^./, (c) => c.toUpperCase())}</span>
              <div className="fila">
                {hermanos.map((h) => (
                  <Link key={h.id} href={`/producto/${h.id}`} className="btn btn-ghost btn-sm" aria-current={h.id === p.id ? "page" : undefined} style={h.id === p.id ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}>
                    {Object.values(h.variante ?? {})[0]}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <section className="tarjeta" aria-labelledby="t-precio" style={{ gap: 14 }}>
            <h2 id="t-precio" className="sr-only">Precio por cantidad</h2>
            <table className="tabla">
              <thead><tr><th scope="col">Cantidad</th><th scope="col" className="der">Precio c/u + IVA</th></tr></thead>
              <tbody>
                {[{ cantidadMinima: 1, precioUnitario: p.precioMenudeo }, ...p.escalones].map((e, i, arr) => {
                  const hasta = arr[i + 1]?.cantidadMinima;
                  const activo = (calc!.escalonAplicado ?? 1) === e.cantidadMinima || (calc!.escalonAplicado === null && i === 0);
                  return (
                    <tr key={e.cantidadMinima} style={activo ? { background: "var(--accent-tint)" } : undefined}>
                      <td>{hasta ? `${e.cantidadMinima} a ${hasta - 1}` : `${e.cantidadMinima} o más`} {p.unidad === "pieza" ? "pzas" : p.unidad}{activo && <strong> · tu precio</strong>}</td>
                      <td className="der num">{pesos(e.precioUnitario)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="fila" style={{ alignItems: "end" }}>
              <div className="campo">
                <label htmlFor="cantidad">Cantidad ({p.unidad === "pieza" ? "piezas" : p.unidad})</label>
                <div className="fila" style={{ gap: 6, flexWrap: "nowrap" }}>
                  <button type="button" className="boton-icono" aria-label="Menos" onClick={() => setCantidad((c) => Math.max(1, c - 1))}><Minus strokeWidth={TRAZO} aria-hidden /></button>
                  <input id="cantidad" inputMode="numeric" value={cantidad || ""} onChange={(e) => setCantidad(Math.min(1_000_000, Number(e.target.value.replace(/\D/g, "")) || 0))} style={{ width: 110, textAlign: "center", fontFamily: "var(--font-mono)" }} />
                  <button type="button" className="boton-icono" aria-label="Más" onClick={() => setCantidad((c) => c + 1)}><Plus strokeWidth={TRAZO} aria-hidden /></button>
                </div>
              </div>
              <div className="pila" style={{ gap: 2, marginLeft: "auto", textAlign: "right" }}>
                <span className="chico suave">Subtotal</span>
                <span className="precio-destacado" style={{ fontSize: 26 }}><Cifra valor={calc!.subtotal} formato="pesos" duracion={250} /></span>
                <span className="chico suave">{prov.cobraIva ? `+ IVA ${pesos(iva)}` : "Este proveedor no cobra IVA"}</span>
              </div>
            </div>

            {calc!.siguiente ? (
              <div className="pila" style={{ gap: 6 }} aria-live="polite">
                <p className="chico">
                  Te faltan <strong>{unidades(calc!.siguiente.faltan, p.unidad)}</strong> para pagar{" "}
                  <strong className="num">{pesos(calc!.siguiente.precioUnitario)}</strong> c/u
                </p>
                <div className="progreso-barra" aria-hidden><span style={{ transform: `scaleX(${Math.min(1, Math.max(0.02, calc!.avance))})`, background: "var(--amber)" }} /></div>
              </div>
            ) : (
              p.escalones.length > 0 && <p className="ok-form">Ya tienes el mejor precio de mayoreo.</p>
            )}
            {bajoMinimo && <p className="error-campo">El pedido mínimo es {unidades(p.pedidoMinimo, p.unidad)}.</p>}
            {sinExistencia && <p className="error-campo">Solo hay {unidades(p.existencias, p.unidad)} disponibles.</p>}

            <div className="campo">
              <label htmlFor="destino">Envío a</label>
              <select id="destino" value={destino} onChange={(e) => setDestino(e.target.value)}>
                <option value="">Elige tu estado…</option>
                {estados.map((e) => <option key={e.clave} value={e.clave}>{e.nombre}</option>)}
              </select>
              {destino && !prov.enviaA.includes(destino) && <p className="error-campo">Este proveedor no envía a ese estado.</p>}
              {envio && (
                <p className="chico">
                  Envío estándar <strong className="num">{pesos(envio.costo)}</strong> + IVA · llega el {fecha.format(fechaLlegada(new Date(), envio.diasMax))} (simulado)
                </p>
              )}
            </div>

            <div className="fila">
              <button type="button" className="btn btn-primary" onClick={agregar} disabled={pausado || bajoMinimo || sinExistencia || cantidad < 1}>
                Agregar al carrito
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => mostrarAviso(alternarComparar(p.id, p.nombre))} aria-pressed={comparando}>
                {comparando ? "Quitar del comparador" : "Comparar"}
              </button>
            </div>
            <div className="fila chico">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSolicitud("cotizacion")}>Pedir cotización</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSolicitud("muestra")}>Pedir muestra</button>
              <Link className="btn btn-ghost btn-sm" href={u ? `/mensajes?proveedor=${prov.id}` : `/entrar?volver=/mensajes?proveedor=${prov.id}`}>Mensaje al proveedor</Link>
            </div>
            {solicitud && <FormSolicitud tipo={solicitud} productoId={p.id} unidad={p.unidad} cantidadInicial={calc!.q} cerrar={() => setSolicitud(null)} />}
          </section>
        </div>
      </div>

      <div className="rejilla-2">
        <section className="tarjeta" aria-labelledby="t-detalles">
          <h2 id="t-detalles">Detalles</h2>
          <p>{p.descripcion || tipo.descripcion}</p>
          <dl className="pila chico" style={{ margin: 0 }}>
            <div className="fila-entre"><dt className="suave">Unidad</dt><dd>{p.unidad}</dd></div>
            <div className="fila-entre"><dt className="suave">Peso</dt><dd>{p.pesoKg} kg</dd></div>
            {p.medidas && <div className="fila-entre"><dt className="suave">Medidas</dt><dd>{p.medidas.largoCm} × {p.medidas.anchoCm} × {p.medidas.altoCm} cm</dd></div>}
            <div className="fila-entre"><dt className="suave">Pedido mínimo</dt><dd>{unidades(p.pedidoMinimo, p.unidad)}</dd></div>
            <div className="fila-entre"><dt className="suave">Disponibles</dt><dd>{p.existencias.toLocaleString("es-MX")}</dd></div>
            {p.permisoSanitario && <div className="fila-entre"><dt className="suave">Permiso sanitario</dt><dd>{p.permisoSanitario === "declarado" ? "Declarado por el proveedor" : "Declarado con documento"}</dd></div>}
            {p.maxDiasTransito && <div className="fila-entre"><dt className="suave">Perecedero</dt><dd>Máximo {p.maxDiasTransito} días en tránsito</dd></div>}
          </dl>
          <h3>Condiciones del proveedor</h3>
          <p className="suave">{prov.condiciones}</p>
        </section>
        <section className="tarjeta" aria-labelledby="t-confianza">
          <h2 id="t-confianza">¿Qué tan confiable es {prov.nombre}?</h2>
          <AnilloConfianza desglose={desglose(s, prov.id)} tam="lg" abierto />
        </section>
      </div>

      <section className="tarjeta" aria-labelledby="t-resenas">
        <h2 id="t-resenas">Reseñas de compras reales</h2>
        {resenas.length === 0 ? (
          <p className="suave">Las reseñas solo las escribe quien completó un pedido con este proveedor. Aún no hay reseñas en esta demostración; los datos de ejemplo traen {est.numResenas} calificaciones.</p>
        ) : (
          <ul className="pila" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {resenas.map((r) => (
              <li key={r.id} className="pila" style={{ gap: 4 }}>
                <div className="fila"><Estrellas valor={r.estrellas} /><strong>{r.compradorNombre}</strong><span className="chico suave">{new Date(r.fecha).toLocaleDateString("es-MX")}</span></div>
                <p>{r.texto}</p>
                {r.respuesta && <p className="chico suave" style={{ paddingLeft: 12, borderLeft: "1px solid var(--line-strong)" }}><strong>Respuesta de {prov.nombre}:</strong> {r.respuesta}</p>}
              </li>
            ))}
          </ul>
        )}
        <p className="chico"><Link href={`/proveedores/${prov.id}`}>Ver todas en la ficha del proveedor</Link></p>
      </section>
    </>
  );
}

function FormSolicitud({ tipo, productoId, unidad, cantidadInicial, cerrar }: { tipo: "cotizacion" | "muestra"; productoId: string; unidad: string; cantidadInicial: number; cerrar: () => void }) {
  const [error, setError] = useState("");
  return (
    <form
      className="pila"
      style={{ padding: 16, borderRadius: 12, background: "var(--surface-2)" }}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        try {
          solicitarCotizacion(productoId, tipo, Number(f.get("cantidad")), String(f.get("mensaje") ?? ""));
          mostrarAviso(tipo === "muestra" ? "Enviamos tu solicitud de muestra al proveedor." : "Enviamos tu solicitud de cotización al proveedor.", { href: "/cuenta#cotizaciones", texto: "Ver mis solicitudes" });
          cerrar();
        } catch (err) {
          setError(err instanceof ErrorTienda || err instanceof Error ? err.message : "No se pudo enviar.");
        }
      }}
    >
      <h3>{tipo === "muestra" ? "Pedir una muestra" : "Pedir cotización para compra grande"}</h3>
      <div className="campos-2">
        <div className="campo"><label htmlFor="sol-cant">Cantidad ({unidad})</label><input id="sol-cant" name="cantidad" inputMode="numeric" defaultValue={tipo === "muestra" ? 1 : cantidadInicial} /></div>
      </div>
      <div className="campo"><label htmlFor="sol-msg">Mensaje</label><textarea id="sol-msg" name="mensaje" placeholder="Fecha que lo necesitas, personalización, etc." /></div>
      {error && <p className="error-form" role="alert">{error} {error.includes("Inicia") && <Link href="/entrar">Entrar</Link>}</p>}
      <div className="fila"><button className="btn btn-primary btn-sm" type="submit">Enviar solicitud</button><button className="btn btn-ghost btn-sm" type="button" onClick={cerrar}>Cancelar</button></div>
    </form>
  );
}
