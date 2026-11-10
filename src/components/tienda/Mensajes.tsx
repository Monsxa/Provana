"use client";
/** Chat comprador ↔ proveedor dentro de Provana. */
import { MessagesSquare, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TRAZO } from "@/components/Iconos";
import { enviarMensaje, hiloDe } from "@/lib/tienda/almacen";
import type { EstadoTienda, Usuario } from "@/lib/tienda/tipos";

const hora = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function Mensajes({ s, u, inicial }: { s: EstadoTienda; u: Usuario; inicial?: string | null }) {
  const soyProveedor = u.rol === "proveedor";
  const hilos = [...new Set(s.mensajes.map((m) => m.hilo))].filter((h) => (soyProveedor ? h.endsWith(`:${u.proveedorId}`) : h.startsWith(`${u.id}:`)));
  const hiloInicial = inicial && !soyProveedor ? hiloDe(u.id, inicial) : hilos[0] ?? null;
  const [activo, setActivo] = useState<string | null>(hiloInicial);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const fin = useRef<HTMLDivElement>(null);
  const lista = activo && !hilos.includes(activo) ? [activo, ...hilos] : hilos;
  const nombre = (h: string) => {
    const [c, p] = h.split(":");
    return soyProveedor ? s.usuarios.find((x) => x.id === c)?.nombre ?? "Comprador" : s.proveedores.find((x) => x.id === p)?.nombre ?? "Proveedor";
  };
  const mensajes = s.mensajes.filter((m) => m.hilo === activo);
  useEffect(() => fin.current?.scrollIntoView({ block: "nearest" }), [mensajes.length]);

  if (lista.length === 0) {
    return (
      <div className="vacio-estado greca">
        <span className="icono-grande"><MessagesSquare strokeWidth={TRAZO} aria-hidden /></span>
        <h2>Sin conversaciones</h2>
        <p>{soyProveedor ? "Aquí verás las preguntas de tus compradores." : "Escríbele a un proveedor desde la ficha de un producto o desde tu pedido."}</p>
      </div>
    );
  }
  return (
    <div className="rejilla-lateral" style={{ gridTemplateColumns: "minmax(0, 260px) 1fr" }}>
      <nav className="tarjeta" aria-label="Conversaciones" style={{ gap: 4 }}>
        {lista.map((h) => (
          <button key={h} type="button" className="btn btn-ghost btn-sm" aria-current={h === activo ? "page" : undefined} style={{ justifyContent: "flex-start", ...(h === activo ? { borderColor: "var(--accent)", color: "var(--accent)" } : {}) }} onClick={() => setActivo(h)}>
            {nombre(h)}
          </button>
        ))}
      </nav>
      {activo && (
        <section className="tarjeta" aria-label={`Conversación con ${nombre(activo)}`}>
          <h2>{nombre(activo)}</h2>
          <div className="chat" aria-live="polite">
            {mensajes.length === 0 && <p className="suave chico">Escribe tu primera pregunta: existencias, tiempos o personalización.</p>}
            {mensajes.map((m) => (
              <p key={m.id} className="burbuja" data-mia={m.autorId === u.id || undefined}>
                {m.texto}
                <time dateTime={m.fecha}>{hora.format(new Date(m.fecha))}</time>
              </p>
            ))}
            <div ref={fin} />
          </div>
          <form className="fila" style={{ flexWrap: "nowrap" }} onSubmit={(e) => { e.preventDefault(); try { enviarMensaje(activo, texto); setTexto(""); setError(""); } catch (err) { setError((err as Error).message); } }}>
            <div className="campo" style={{ flex: 1 }}>
              <label htmlFor="msg" className="sr-only">Mensaje</label>
              <input id="msg" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe un mensaje" autoComplete="off" />
            </div>
            <button className="btn btn-primary" type="submit" aria-label="Enviar mensaje"><Send strokeWidth={TRAZO} width={18} aria-hidden /></button>
          </form>
          {error && <p className="error-campo">{error}</p>}
        </section>
      )}
    </div>
  );
}
