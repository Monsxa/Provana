"use client";
import { ListPlus, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TRAZO } from "@/components/Iconos";
import { Ilustracion } from "@/components/tienda/Ilustracion";
import { Cargando } from "@/components/tienda/Requiere";
import { mostrarAviso } from "@/components/tienda/Toasts";
import { pesos, unidades } from "@/lib/surtido/formato";
import { faltaParaSiguienteEscalon } from "@/lib/surtido/precios";
import { agruparCarrito, cambiarCantidad, carritoDe, guardarLista, quitarDelCarrito, usuarioDe, useTienda } from "@/lib/tienda/almacen";

export default function Carrito() {
  const s = useTienda();
  const [nombreLista, setNombreLista] = useState("");
  if (!s) return <div className="wrap pagina"><Cargando /></div>;
  const grupos = agruparCarrito(s);
  const u = usuarioDe(s);
  const productos = grupos.reduce((a, g) => a + g.productos, 0);
  const iva = grupos.reduce((a, g) => a + g.ivaProductos, 0);
  const problemas = grupos.flatMap((g) => g.problemas);

  if (grupos.length === 0) {
    return (
      <div className="wrap pagina">
        <div className="vacio-estado greca">
          <span className="icono-grande"><ShoppingCart strokeWidth={TRAZO} aria-hidden /></span>
          <h1 style={{ fontSize: 26 }}>Tu carrito está vacío</h1>
          <p>Busca en el catálogo o deja que Provana te arme el surtido más conveniente.</p>
          <div className="fila" style={{ justifyContent: "center" }}>
            <Link className="btn btn-primary" href="/surtido">Armar mi surtido</Link>
            <Link className="btn btn-ghost" href="/catalogo">Ver catálogo</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap pagina">
      <div className="pagina-cabecera">
        <div>
          <h1>Carrito</h1>
          <p>Cada proveedor genera su propio pedido y su propio envío.</p>
        </div>
      </div>
      <div className="rejilla-lateral">
        <ol className="pila" style={{ listStyle: "none", padding: 0, margin: 0, gap: 16 }}>
          {grupos.map((g) => (
            <li key={g.proveedor.id} className="tarjeta">
              <div className="fila-entre">
                <h2><Link href={`/proveedores/${g.proveedor.id}`} style={{ textDecoration: "none" }}>{g.proveedor.nombre}</Link></h2>
                <span className="chico suave">Envía desde {g.proveedor.ciudad}</span>
              </div>
              <ul className="pila" style={{ listStyle: "none", padding: 0, margin: 0, gap: 16 }}>
                {g.lineas.map((l) => {
                  const sig = faltaParaSiguienteEscalon(l.producto, l.cantidad);
                  return (
                    <li key={l.producto.id} className="fila" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
                      <div style={{ width: 72, flex: "none", borderRadius: 12, overflow: "hidden" }}>
                        <Ilustracion tipoId={l.producto.tipoId} fotos={l.producto.fotos} nombre={l.producto.nombre} />
                      </div>
                      <div className="pila" style={{ flex: 1, gap: 6 }}>
                        <div className="fila-entre">
                          <Link href={`/producto/${l.producto.id}`} style={{ fontWeight: 600 }}>{l.producto.nombre}</Link>
                          <span className="precio-destacado">{pesos(l.subtotal)}</span>
                        </div>
                        <p className="chico suave">{pesos(l.precioUnitario)} c/u + IVA</p>
                        <div className="fila" style={{ gap: 6 }}>
                          <button type="button" className="boton-icono" aria-label={`Una ${l.producto.unidad} menos de ${l.producto.nombre}`} onClick={() => cambiarCantidad(l.producto.id, l.cantidad - 1)}><Minus strokeWidth={TRAZO} aria-hidden /></button>
                          <label className="sr-only" htmlFor={`c-${l.producto.id}`}>Cantidad de {l.producto.nombre}</label>
                          <input id={`c-${l.producto.id}`} inputMode="numeric" value={l.cantidad} onChange={(e) => cambiarCantidad(l.producto.id, Number(e.target.value.replace(/\D/g, "")) || 1)} style={{ width: 80, minHeight: 44, textAlign: "center", borderRadius: 8, border: "1.5px solid var(--line-strong)", background: "var(--bg)", fontFamily: "var(--font-mono)" }} />
                          <button type="button" className="boton-icono" aria-label={`Una ${l.producto.unidad} más de ${l.producto.nombre}`} onClick={() => cambiarCantidad(l.producto.id, l.cantidad + 1)}><Plus strokeWidth={TRAZO} aria-hidden /></button>
                          <button type="button" className="boton-icono" aria-label={`Quitar ${l.producto.nombre}`} onClick={() => { quitarDelCarrito(l.producto.id); mostrarAviso(`Quitamos ${l.producto.nombre} de tu carrito.`); }}><Trash2 strokeWidth={TRAZO} aria-hidden /></button>
                        </div>
                        {l.problema && <p className="error-campo">{l.problema}</p>}
                        {!l.problema && sig && <p className="chico" style={{ color: "var(--amber-ink)" }}>Con {unidades(sig.faltan, l.producto.unidad)} más pagas {pesos(sig.precioUnitario)} c/u.</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="fila-entre chico">
                <span className="suave">Subtotal de {g.proveedor.nombre}</span>
                <span className="precio-destacado">{pesos(g.productos)}</span>
              </div>
            </li>
          ))}
        </ol>

        <aside className="tarjeta" aria-labelledby="t-resumen" style={{ position: "sticky", top: 88 }}>
          <h2 id="t-resumen">Resumen</h2>
          <dl className="pila chico" style={{ margin: 0 }}>
            <div className="fila-entre"><dt>Productos</dt><dd className="num">{pesos(productos)}</dd></div>
            <div className="fila-entre"><dt>IVA de productos</dt><dd className="num">{pesos(iva)}</dd></div>
            <div className="fila-entre suave"><dt>Envíos ({grupos.length})</dt><dd>Se calculan al pagar</dd></div>
          </dl>
          <hr className="separador" />
          <div className="fila-entre"><strong>Subtotal</strong><strong className="precio-destacado">{pesos(productos + iva)}</strong></div>
          {problemas.length > 0 && <p className="error-form">{problemas[0]}</p>}
          <Link
            href={u ? "/checkout" : "/entrar?volver=/checkout"}
            className="btn btn-primary"
            aria-disabled={problemas.length > 0}
            onClick={(e) => problemas.length > 0 && e.preventDefault()}
            style={problemas.length ? { opacity: 0.55, pointerEvents: "none" } : undefined}
          >
            {u ? "Continuar al pago" : "Entrar para pagar"}
          </Link>
          {u?.rol === "comprador" && (
            <form className="pila" style={{ gap: 8 }} onSubmit={(e) => { e.preventDefault(); try { guardarLista(nombreLista, carritoDe(s)); mostrarAviso(`Guardamos la lista “${nombreLista}”.`, { href: "/cuenta#listas", texto: "Ver listas" }); setNombreLista(""); } catch (err) { mostrarAviso((err as Error).message); } }}>
              <div className="campo"><label htmlFor="lista">Guardar como lista recurrente</label><input id="lista" value={nombreLista} onChange={(e) => setNombreLista(e.target.value)} placeholder="Surtido mensual" /></div>
              <button type="submit" className="btn btn-ghost btn-sm"><ListPlus strokeWidth={TRAZO} width={16} height={16} aria-hidden /> Guardar lista</button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
