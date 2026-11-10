"use client";
import { Heart, LogOut, MapPin, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TRAZO } from "@/components/Iconos";
import { Requiere } from "@/components/tienda/Requiere";
import { mostrarAviso } from "@/components/tienda/Toasts";
import { estados } from "@/lib/catalogo";
import { pesos } from "@/lib/surtido/formato";
import { agregarVarias, alternarFavorito, borrarDireccion, borrarLista, salir } from "@/lib/tienda/almacen";
import type { EstadoTienda, Usuario } from "@/lib/tienda/tipos";

export default function Pagina() {
  return (
    <div className="wrap pagina">
      <Requiere roles={["comprador", "proveedor", "admin"]}>{(s, u) => <Cuenta s={s} u={u} />}</Requiere>
    </div>
  );
}

function Cuenta({ s, u }: { s: EstadoTienda; u: Usuario }) {
  const router = useRouter();
  const favs = (s.favoritos[u.id] ?? []).map((f) => ({ f, p: s.productos.find((x) => x.id === f.productoId) })).filter((x) => x.p);
  const listas = s.listas[u.id] ?? [];
  const cots = s.cotizaciones.filter((c) => c.compradorId === u.id);
  return (
    <>
      <div className="pagina-cabecera">
        <div><h1>Hola, {u.nombre.split(" ")[0]}</h1><p>{u.email} · cuenta de {u.rol}{u.correoVerificado ? " · correo confirmado" : ""}</p></div>
        <div className="fila">
          {u.rol === "comprador" && <Link className="btn btn-ghost" href="/pedidos">Mis pedidos</Link>}
          {u.rol === "proveedor" && <Link className="btn btn-ghost" href="/panel">Mi panel</Link>}
          {u.rol === "admin" && <Link className="btn btn-ghost" href="/admin">Administración</Link>}
          <button type="button" className="btn btn-ghost" onClick={() => { salir(); router.push("/"); }}><LogOut strokeWidth={TRAZO} width={18} aria-hidden /> Salir</button>
        </div>
      </div>

      <div className="rejilla-2">
        <section className="tarjeta" aria-labelledby="t-dir">
          <h2 id="t-dir">Direcciones</h2>
          {u.direcciones.length === 0 && <p className="suave">Agrega una al pagar tu primer pedido.</p>}
          <ul className="pila" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {u.direcciones.map((d) => (
              <li key={d.id} className="fila-entre">
                <span className="fila chico"><MapPin strokeWidth={TRAZO} width={18} aria-hidden /><span><strong>{d.alias}</strong><br />{d.calle}, {d.cp} {d.ciudad}, {estados.find((e) => e.clave === d.estado)?.nombre}</span></span>
                <button type="button" className="boton-icono" aria-label={`Borrar dirección ${d.alias}`} onClick={() => borrarDireccion(d.id)}><Trash2 strokeWidth={TRAZO} aria-hidden /></button>
              </li>
            ))}
          </ul>
        </section>

        <section className="tarjeta" aria-labelledby="t-fav" id="favoritos">
          <h2 id="t-fav">Favoritos</h2>
          {favs.length === 0 ? <p className="suave">Guarda productos con el corazón y te avisamos si bajan de precio o vuelven a tener existencias.</p> : (
            <ul className="pila" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {favs.map(({ p }) => (
                <li key={p!.id} className="fila-entre chico">
                  <Link href={`/producto/${p!.id}`}>{p!.nombre}</Link>
                  <span className="fila"><span className="num">{pesos(p!.precioMenudeo)}</span>
                    <button type="button" className="boton-icono" aria-pressed="true" aria-label={`Quitar ${p!.nombre} de favoritos`} onClick={() => alternarFavorito(p!.id)}><Heart strokeWidth={TRAZO} aria-hidden /></button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="tarjeta" aria-labelledby="t-listas" id="listas">
          <h2 id="t-listas">Listas recurrentes</h2>
          {listas.length === 0 ? <p className="suave">Desde el carrito puedes guardar tu surtido como lista para volver a pedirlo en un clic.</p> : (
            <ul className="pila" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {listas.map((l) => (
                <li key={l.id} className="fila-entre">
                  <span><strong>{l.nombre}</strong> <span className="chico suave">· {l.lineas.length} productos</span></span>
                  <span className="fila">
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => { const r = agregarVarias(l.lineas); mostrarAviso(`Agregamos ${r.agregadas} producto(s) de “${l.nombre}” a tu carrito.`, { href: "/carrito", texto: "Ver carrito" }); }}>Pedir otra vez</button>
                    <button type="button" className="boton-icono" aria-label={`Borrar lista ${l.nombre}`} onClick={() => borrarLista(l.id)}><Trash2 strokeWidth={TRAZO} aria-hidden /></button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="tarjeta" aria-labelledby="t-cot" id="cotizaciones">
          <h2 id="t-cot">Cotizaciones y muestras</h2>
          {cots.length === 0 ? <p className="suave">Pide cotización o muestra desde la ficha de un producto.</p> : (
            <ul className="pila" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {cots.map((c) => {
                const p = s.productos.find((x) => x.id === c.productoId);
                return (
                  <li key={c.id} className="pila chico" style={{ gap: 2 }}>
                    <div className="fila-entre"><strong>{c.tipo === "muestra" ? "Muestra" : "Cotización"} · {p?.nombre}</strong><span className="estado" data-tono={c.estado === "respondida" ? "verde" : "ambar"}>{c.estado === "respondida" ? "Respondida" : "Pendiente"}</span></div>
                    <span className="suave">{c.cantidad} · {c.mensaje}</span>
                    {c.respuesta && <span>Respuesta: {c.respuesta}{c.precioOfrecido ? ` · ${pesos(c.precioOfrecido)} c/u + IVA` : ""}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
