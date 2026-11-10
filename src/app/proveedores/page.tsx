"use client";
import Link from "next/link";
import { useState } from "react";
import { SelloMexicano, SelloVerificado } from "@/components/Iconos";
import { Cargando } from "@/components/tienda/Requiere";
import { estados } from "@/lib/catalogo";
import { iniciales } from "@/lib/surtido/formato";
import { confianza, estadisticas, useTienda } from "@/lib/tienda/almacen";

export default function Proveedores() {
  const s = useTienda();
  const [estado, setEstado] = useState("");
  if (!s) return <div className="wrap pagina"><Cargando /></div>;
  const verificados = s.proveedores.filter((p) => p.verificacion === "verificado");
  const lista = verificados.filter((p) => !estado || p.estado === estado).sort((a, b) => confianza(s, b.id) - confianza(s, a.id));
  return (
    <div className="wrap pagina">
      <div className="pagina-cabecera">
        <div><h1>Proveedores</h1><p>Negocios mexicanos verificados. Elige un estado en el mapa para ver quién está ahí.</p></div>
      </div>
      <section className="tarjeta" aria-labelledby="t-mapa">
        <h2 id="t-mapa">Proveedores por estado</h2>
        <div className="mosaico-estados">
          {estados.map((e) => {
            const n = verificados.filter((p) => p.estado === e.clave).length;
            return n ? (
              <button key={e.clave} type="button" data-n={n} aria-pressed={estado === e.clave} onClick={() => setEstado(estado === e.clave ? "" : e.clave)} style={estado === e.clave ? { outline: "2px solid var(--accent)" } : undefined}>
                <span>{e.nombre}</span><span className="num">{n}</span>
              </button>
            ) : (
              <span key={e.clave} data-n="0"><span>{e.nombre}</span><span className="num">0</span></span>
            );
          })}
        </div>
      </section>
      <p id="lista" className="chico suave" aria-live="polite">
        {estado ? `${lista.length} en ${estados.find((e) => e.clave === estado)?.nombre} · ` : ""}
        {estado && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEstado("")}>Ver todos</button>}
      </p>
      <ul className="rejilla-productos">
        {lista.map((p) => {
          const est = estadisticas(s, p.id);
          return (
            <li key={p.id} className="tarjeta producto-tarjeta" style={{ padding: 20 }}>
              <div className="fila" style={{ flexWrap: "nowrap" }}>
                <span aria-hidden style={{ width: 48, height: 48, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--accent-tint-2)", color: "var(--accent-strong)", fontFamily: "var(--font-display)", fontWeight: 600, flex: "none", viewTransitionName: `prov-${p.id}` }}>{iniciales(p.nombre)}</span>
                <div>
                  <h2 style={{ fontSize: 18 }}><Link href={`/proveedores/${p.id}`} style={{ textDecoration: "none" }}>{p.nombre}</Link></h2>
                  <p className="chico suave">{p.ciudad}, {estados.find((e) => e.clave === p.estado)?.nombre}</p>
                </div>
              </div>
              <div className="fila"><SelloVerificado /><SelloMexicano /></div>
              <p className="chico">Confianza <strong className="num">{confianza(s, p.id)}</strong>/100 · {est.numResenas ? (est.sumaEstrellas / est.numResenas).toFixed(1) : "—"} ★ · envía a {p.enviaA.length} estados</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
