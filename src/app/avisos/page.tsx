"use client";
import { BellOff, MailCheck } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { TRAZO } from "@/components/Iconos";
import { Requiere } from "@/components/tienda/Requiere";
import { mostrarAviso } from "@/components/tienda/Toasts";
import { guardarPreferencias, marcarAvisosLeidos, verificarCorreo } from "@/lib/tienda/almacen";
import type { EstadoTienda, TipoAviso, Usuario } from "@/lib/tienda/tipos";

const NOMBRES: Record<TipoAviso, string> = {
  cuenta: "Cuenta y seguridad",
  pedido: "Pedidos",
  pago: "Pagos",
  envio: "Envíos",
  entrega: "Entregas",
  mensaje: "Mensajes",
  cotizacion: "Cotizaciones y muestras",
  disputa: "Problemas con pedidos",
  precio: "Bajadas de precio y reposición de favoritos",
  verificacion: "Verificación de proveedores",
};

export default function Pagina() {
  return (
    <div className="wrap pagina">
      <Requiere roles={["comprador", "proveedor", "admin"]}>{(s, u) => <Avisos s={s} u={u} />}</Requiere>
    </div>
  );
}

function Avisos({ s, u }: { s: EstadoTienda; u: Usuario }) {
  const mios = s.avisos.filter((a) => a.usuarioId === u.id);
  const sinLeer = mios.filter((a) => !a.leido).length;
  useEffect(() => {
    if (sinLeer) {
      const t = window.setTimeout(marcarAvisosLeidos, 1500);
      return () => window.clearTimeout(t);
    }
  }, [sinLeer]);

  return (
    <>
      <div className="pagina-cabecera">
        <div>
          <h1>Avisos</h1>
          <p>Aquí llegan los correos de Provana. Modo demostración: no salen a tu correo real; todo queda en esta bandeja. La integración con WhatsApp está lista para conectarse.</p>
        </div>
      </div>

      {!u.correoVerificado && (
        <section id="verificar" className="tarjeta" style={{ background: "var(--amber-tint)" }}>
          <h2>Confirma tu correo</h2>
          <p>Así sabemos que {u.email} es tuyo.</p>
          <button type="button" className="btn btn-primary" onClick={() => { verificarCorreo(); mostrarAviso("Confirmamos tu correo."); }}>
            <MailCheck strokeWidth={TRAZO} width={18} aria-hidden /> Confirmar correo
          </button>
        </section>
      )}

      {mios.length === 0 ? (
        <div className="vacio-estado greca">
          <span className="icono-grande"><BellOff strokeWidth={TRAZO} aria-hidden /></span>
          <h2>Sin avisos</h2>
          <p>Te avisaremos de pedidos, pagos, envíos, mensajes y bajadas de precio.</p>
        </div>
      ) : (
        <ul className="pila" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {mios.map((a) => (
            <li key={a.id} className="tarjeta" style={{ gap: 6, borderLeft: 0, ...(a.leido ? {} : { boxShadow: "var(--shadow)", background: "var(--surface)" }) }}>
              <div className="fila-entre">
                <strong>{a.asunto}</strong>
                <span className="chico suave">{new Date(a.fecha).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{!a.leido && " · nuevo"}</span>
              </div>
              <p className="chico">{a.cuerpo}</p>
              {a.enlace && !a.enlace.includes("#verificar") && <Link className="chico" href={a.enlace}>Ver</Link>}
            </li>
          ))}
        </ul>
      )}

      <form className="tarjeta" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); guardarPreferencias(Object.fromEntries(Object.keys(NOMBRES).map((k) => [k, f.get(k) === "on"])) as Record<TipoAviso, boolean>); mostrarAviso("Guardamos tus preferencias de avisos."); }}>
        <h2>¿De qué quieres que te avisemos?</h2>
        <div className="campos-2">
          {(Object.keys(NOMBRES) as TipoAviso[]).map((k) => (
            <label key={k} className="casilla"><input type="checkbox" name={k} defaultChecked={u.preferencias[k] !== false} /> <span>{NOMBRES[k]}</span></label>
          ))}
        </div>
        <button type="submit" className="btn btn-ghost">Guardar preferencias</button>
      </form>
    </>
  );
}
