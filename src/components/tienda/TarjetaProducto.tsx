"use client";
import { Heart, Scale } from "lucide-react";
import Link from "next/link";
import { TRAZO } from "@/components/Iconos";
import { pesos, unidades } from "@/lib/surtido/formato";
import { alternarFavorito, confianza, estadisticas, ErrorTienda, usuarioDe } from "@/lib/tienda/almacen";
import type { EstadoTienda, ProductoTienda } from "@/lib/tienda/tipos";
import { alternarComparar, useComparar } from "./comparar";
import { Estrellas } from "./Estrellas";
import { Ilustracion } from "./Ilustracion";
import { mostrarAviso } from "./Toasts";

export function TarjetaProducto({ p, s, indice = 0 }: { p: ProductoTienda; s: EstadoTienda; indice?: number }) {
  const prov = s.proveedores.find((x) => x.id === p.proveedorId)!;
  const est = estadisticas(s, prov.id);
  const u = usuarioDe(s);
  const favorito = !!u && (s.favoritos[u.id] ?? []).some((f) => f.productoId === p.id);
  const comparando = useComparar().includes(p.id);
  const mejor = p.escalones.at(-1);
  return (
    <li className="producto-tarjeta" style={{ "--i": indice } as React.CSSProperties}>
      <Ilustracion tipoId={p.tipoId} fotos={p.fotos} nombre={p.nombre} />
      <div className="producto-tarjeta-cuerpo">
        <h3>
          <Link href={`/producto/${p.id}`}>{p.nombre}</Link>
        </h3>
        <p className="chico suave">
          {prov.nombre} · confianza <span className="num">{confianza(s, prov.id)}</span>
        </p>
        <div className="fila chico">
          <Estrellas valor={est.numResenas ? est.sumaEstrellas / est.numResenas : 0} tam={14} />
          <span className="suave">({est.numResenas})</span>
        </div>
        <p>
          <span className="precio-destacado">{pesos(p.precioMenudeo)}</span> <span className="chico suave">+ IVA / {p.unidad}</span>
        </p>
        {mejor && (
          <p className="chico">
            <span className="estado" data-tono="ambar">
              {pesos(mejor.precioUnitario)} desde {mejor.cantidadMinima}
            </span>
          </p>
        )}
        <p className="chico suave">Mínimo {unidades(p.pedidoMinimo, p.unidad)}</p>
        <div className="fila sobre">
          <button
            type="button"
            className="boton-icono"
            aria-pressed={favorito}
            aria-label={favorito ? `Quitar ${p.nombre} de favoritos` : `Guardar ${p.nombre} en favoritos`}
            onClick={() => {
              try {
                const ahora = alternarFavorito(p.id);
                mostrarAviso(ahora ? `Guardamos ${p.nombre} en tus favoritos. Te avisamos si baja de precio.` : `Quitamos ${p.nombre} de tus favoritos.`);
              } catch (e) {
                mostrarAviso(e instanceof ErrorTienda || e instanceof Error ? e.message : "Entra para guardar favoritos.", { href: "/entrar", texto: "Entrar" });
              }
            }}
          >
            <Heart strokeWidth={TRAZO} aria-hidden />
          </button>
          <button
            type="button"
            className="boton-icono"
            aria-pressed={comparando}
            aria-label={comparando ? `Quitar ${p.nombre} del comparador` : `Comparar ${p.nombre}`}
            onClick={() => mostrarAviso(alternarComparar(p.id, p.nombre))}
          >
            <Scale strokeWidth={TRAZO} aria-hidden />
          </button>
        </div>
      </div>
    </li>
  );
}
