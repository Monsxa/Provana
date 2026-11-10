"use client";
/** Partes vivas de la ficha del proveedor: reseñas reales de la demo, reportar y escribirle. */
import { Flag, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TRAZO } from "@/components/Iconos";
import { Estrellas } from "@/components/tienda/Estrellas";
import { mostrarAviso } from "@/components/tienda/Toasts";
import { reportarResena, usuarioDe, useTienda } from "@/lib/tienda/almacen";

export function EnVivo({ proveedorId, nombre }: { proveedorId: string; nombre: string }) {
  const s = useTienda();
  const [reportando, setReportando] = useState<string | null>(null);
  if (!s) return null;
  const u = usuarioDe(s);
  const resenas = s.resenas.filter((r) => r.proveedorId === proveedorId && !r.oculta);
  return (
    <section className="tarjeta" aria-labelledby="t-resenas-vivo">
      <div className="fila-entre">
        <h2 id="t-resenas-vivo">Reseñas de compras en Provana</h2>
        <Link className="btn btn-ghost btn-sm" href={u ? `/mensajes?proveedor=${proveedorId}` : `/entrar?volver=/mensajes?proveedor=${proveedorId}`}>
          <MessageCircle strokeWidth={TRAZO} width={16} aria-hidden /> Escribir a {nombre}
        </Link>
      </div>
      {resenas.length === 0 ? (
        <p className="suave">Solo puede reseñar quien completó un pedido con este proveedor. Aún no hay reseñas en esta demostración.</p>
      ) : (
        <ul className="pila" style={{ listStyle: "none", padding: 0, margin: 0, gap: 16 }}>
          {resenas.map((r) => (
            <li key={r.id} className="pila" style={{ gap: 4 }}>
              <div className="fila"><Estrellas valor={r.estrellas} /><strong>{r.compradorNombre}</strong><span className="chico suave">Compra verificada · {new Date(r.fecha).toLocaleDateString("es-MX")}</span></div>
              <p>{r.texto}</p>
              {r.fotos.length > 0 && (
                <div className="fila">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.fotos.map((f, i) => <img key={i} src={f} alt={`Foto ${i + 1} de la reseña de ${r.compradorNombre}`} style={{ width: 88, height: 88, objectFit: "cover", borderRadius: 10 }} />)}
                </div>
              )}
              {r.respuesta && <p className="chico suave" style={{ paddingLeft: 12, borderLeft: "1px solid var(--line-strong)" }}><strong>Respuesta de {nombre}:</strong> {r.respuesta}</p>}
              {u && !r.reportada && (
                reportando === r.id ? (
                  <form className="fila" onSubmit={(e) => { e.preventDefault(); const m = String(new FormData(e.currentTarget).get("motivo")); try { reportarResena(r.id, m); mostrarAviso("Gracias. Administración revisará la reseña."); setReportando(null); } catch (err) { mostrarAviso((err as Error).message); } }}>
                    <div className="campo" style={{ flex: 1 }}><label htmlFor={`m-${r.id}`} className="sr-only">Motivo</label><input id={`m-${r.id}`} name="motivo" placeholder="¿Por qué la reportas?" /></div>
                    <button className="btn btn-ghost btn-sm" type="submit">Enviar</button>
                  </form>
                ) : (
                  <button type="button" className="btn btn-ghost btn-sm" style={{ justifySelf: "start" }} onClick={() => setReportando(r.id)}><Flag strokeWidth={TRAZO} width={14} aria-hidden /> Reportar reseña</button>
                )
              )}
              {r.reportada && <p className="chico suave">Reportada · en revisión</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
