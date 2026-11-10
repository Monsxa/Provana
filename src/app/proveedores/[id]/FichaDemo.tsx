"use client";
/** Ficha pública de un proveedor creado en la demostración (no está en los datos de ejemplo del servidor). */
import { MapPin } from "lucide-react";
import Link from "next/link";
import { AnilloConfianza } from "@/components/AnilloConfianza";
import { SelloMexicano, SelloVerificado, TRAZO } from "@/components/Iconos";
import { Cargando } from "@/components/tienda/Requiere";
import { TarjetaProducto } from "@/components/tienda/TarjetaProducto";
import { estados } from "@/lib/catalogo";
import { iniciales } from "@/lib/surtido/formato";
import { desglose, proveedorVisible, useTienda } from "@/lib/tienda/almacen";
import { EnVivo } from "./EnVivo";

export function FichaDemo({ id }: { id: string }) {
  const s = useTienda();
  if (!s) return <Cargando />;
  const p = proveedorVisible(s, id);
  if (!p) {
    return (
      <div className="vacio-estado">
        <h1 style={{ fontSize: 26 }}>Este proveedor no está disponible</h1>
        <p>Puede que todavía esté en revisión.</p>
        <Link className="btn btn-primary" href="/proveedores">Ver proveedores</Link>
      </div>
    );
  }
  const productos = s.productos.filter((x) => x.proveedorId === p.id && x.estado === "activo");
  return (
    <>
      <div className="fila" style={{ gap: 24 }}>
        <span aria-hidden style={{ width: 88, height: 88, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--accent-tint-2)", color: "var(--accent-strong)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 32, viewTransitionName: `prov-${p.id}` }}>{iniciales(p.nombre)}</span>
        <div className="pila" style={{ gap: 8 }}>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)" }}>{p.nombre}</h1>
          <p className="fila suave"><MapPin strokeWidth={TRAZO} width={17} aria-hidden /> {p.ciudad}, {estados.find((e) => e.clave === p.estado)?.nombre}</p>
          <div className="fila"><SelloVerificado /><SelloMexicano /></div>
        </div>
      </div>
      {p.descripcion && <p className="suave" style={{ fontSize: 18 }}>{p.descripcion}</p>}
      <section className="tarjeta" aria-labelledby="t-conf">
        <h2 id="t-conf">Confianza</h2>
        <AnilloConfianza desglose={desglose(s, p.id)} tam="lg" abierto />
      </section>
      <EnVivo proveedorId={p.id} nombre={p.nombre} />
      <section className="pila" aria-labelledby="t-prods">
        <h2 id="t-prods">Productos ({productos.length})</h2>
        <ul className="rejilla-productos">{productos.map((x, i) => <TarjetaProducto key={x.id} p={x} s={s} indice={i} />)}</ul>
      </section>
    </>
  );
}
