"use client";
import { Clock, FileText, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TRAZO } from "@/components/Iconos";
import { EtiquetaEstado } from "@/components/tienda/Pedido";
import { Requiere } from "@/components/tienda/Requiere";
import { mostrarAviso } from "@/components/tienda/Toasts";
import { estados } from "@/lib/catalogo";
import { pesos } from "@/lib/surtido/formato";
import { adelantarReloj, guardarAjustes, moderarResena, reiniciarDemo, resolverDisputa, verificarProveedor } from "@/lib/tienda/almacen";
import type { EstadoTienda } from "@/lib/tienda/tipos";

const PESTANAS = ["Resumen", "Verificaciones", "Disputas", "Reseñas", "Pedidos", "Ajustes"] as const;
type Pestana = (typeof PESTANAS)[number];

export default function Pagina() {
  const [p, setP] = useState<Pestana>("Resumen");
  return (
    <div className="wrap pagina">
      <Requiere roles={["admin"]}>
        {(s) => {
          const pend = s.proveedores.filter((x) => x.verificacion === "en_revision").length;
          const disp = s.disputas.filter((d) => d.estado === "abierta").length;
          const rep = s.resenas.filter((r) => r.reportada).length;
          const cont: Partial<Record<Pestana, number>> = { Verificaciones: pend, Disputas: disp, Reseñas: rep };
          return (
            <>
              <div className="pagina-cabecera"><div><h1>Administración</h1><p>Modo demostración: el reloj, los pagos y los envíos son simulados.</p></div></div>
              <div className="pestanas" role="tablist" aria-label="Secciones">
                {PESTANAS.map((x) => (
                  <button key={x} type="button" role="tab" aria-selected={x === p} onClick={() => setP(x)}>
                    {x}{cont[x] ? <span className="contador">{cont[x]}</span> : null}
                  </button>
                ))}
              </div>
              <div role="tabpanel" aria-label={p} className="pila" style={{ gap: 16 }}>
                {p === "Resumen" && <Metricas s={s} />}
                {p === "Verificaciones" && <Verificaciones s={s} />}
                {p === "Disputas" && <Disputas s={s} />}
                {p === "Reseñas" && <Resenas s={s} />}
                {p === "Pedidos" && <Pedidos s={s} />}
                {p === "Ajustes" && <Ajustes s={s} />}
              </div>
            </>
          );
        }}
      </Requiere>
    </div>
  );
}

function Metricas({ s }: { s: EstadoTienda }) {
  const pagados = s.pedidos.filter((p) => p.pago.estado !== "pendiente" && p.estado !== "cancelado");
  const datos: [string, string][] = [
    ["Ventas de la demo (con IVA y envío)", pesos(pagados.reduce((a, p) => a + p.total, 0))],
    ["Comisiones cobradas (liberadas)", pesos(pagados.filter((p) => p.pago.estado === "liberado").reduce((a, p) => a + p.comision, 0))],
    ["Dinero retenido", pesos(pagados.filter((p) => ["retenido", "detenido"].includes(p.pago.estado)).reduce((a, p) => a + p.total, 0))],
    ["Pedidos", String(s.pedidos.length)],
    ["Proveedores verificados", String(s.proveedores.filter((p) => p.verificacion === "verificado").length)],
    ["Proveedores en revisión", String(s.proveedores.filter((p) => p.verificacion === "en_revision").length)],
    ["Disputas abiertas", String(s.disputas.filter((d) => d.estado === "abierta").length)],
    ["Compradores registrados", String(s.usuarios.filter((u) => u.rol === "comprador").length)],
  ];
  return (
    <div className="rejilla-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
      {datos.map(([n, v]) => <div key={n} className="tarjeta"><span className="chico suave">{n}</span><strong className="precio-destacado" style={{ fontSize: 22 }}>{v}</strong></div>)}
    </div>
  );
}

function Verificaciones({ s }: { s: EstadoTienda }) {
  const lista = s.proveedores.filter((p) => p.verificacion !== "verificado");
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  if (!lista.length) return <div className="vacio-estado"><h2>Nada por revisar</h2><p>Todos los proveedores están verificados.</p></div>;
  return (
    <>
      {lista.map((p) => (
        <section key={p.id} className="tarjeta" aria-labelledby={`v-${p.id}`}>
          <div className="fila-entre"><h2 id={`v-${p.id}`}>{p.nombre}</h2><span className="estado" data-tono={p.verificacion === "rechazado" ? "rojo" : "ambar"}>{p.verificacion === "rechazado" ? "Rechazado" : "En revisión"}</span></div>
          <p className="chico">RFC {p.rfc ?? "—"} · {p.ciudad}, {estados.find((e) => e.clave === p.estado)?.nombre} · {p.descripcion}</p>
          <ul className="pila chico" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {(["rfc", "identificacion", "domicilio", "taller"] as const).map((t) => {
              const d = p.documentos.find((x) => x.tipo === t);
              return <li key={t} className="fila"><FileText strokeWidth={TRAZO} width={16} aria-hidden /> {t === "rfc" ? "RFC" : t === "identificacion" ? "Identificación" : t === "domicilio" ? "Comprobante de domicilio" : "Fotos del taller"}: {d ? <strong>{d.nombreArchivo}</strong> : <span style={{ color: "var(--danger)" }}>falta</span>}</li>;
            })}
          </ul>
          {p.motivoRechazo && <p className="chico suave">Motivo anterior: {p.motivoRechazo}</p>}
          <div className="campo"><label htmlFor={`mot-${p.id}`}>Motivo si lo rechazas</label><input id={`mot-${p.id}`} value={motivos[p.id] ?? ""} onChange={(e) => setMotivos({ ...motivos, [p.id]: e.target.value })} placeholder="El comprobante de domicilio está vencido" /></div>
          <div className="fila">
            <button type="button" className="btn btn-primary" onClick={() => { verificarProveedor(p.id, true); mostrarAviso(`Verificamos a ${p.nombre}. Sus productos ya aparecen.`); }}>Aprobar</button>
            <button type="button" className="btn btn-ghost" onClick={() => { try { verificarProveedor(p.id, false, motivos[p.id] ?? ""); mostrarAviso(`Rechazamos a ${p.nombre} y le avisamos el motivo.`); } catch (e) { mostrarAviso((e as Error).message); } }}>Rechazar</button>
          </div>
        </section>
      ))}
    </>
  );
}

function Disputas({ s }: { s: EstadoTienda }) {
  const [montos, setMontos] = useState<Record<string, string>>({});
  const [notas, setNotas] = useState<Record<string, string>>({});
  if (!s.disputas.length) return <div className="vacio-estado"><h2>Sin disputas</h2><p>Cuando un comprador reporte un problema, aparecerá aquí con el pago detenido.</p></div>;
  return (
    <>
      {s.disputas.map((d) => {
        const p = s.pedidos.find((x) => x.id === d.pedidoId)!;
        const prov = s.proveedores.find((x) => x.id === p.proveedorId)!;
        const resolver = (r: "a_favor_proveedor" | "reembolso_total" | "reembolso_parcial") => {
          try {
            const m = Math.round(Number((montos[d.id] ?? "0").replace(/[$,]/g, "")) * 100);
            resolverDisputa(d.id, r, m, notas[d.id] ?? "");
            mostrarAviso(`Resolvimos la disputa de ${p.folio}.`);
          } catch (e) {
            mostrarAviso((e as Error).message);
          }
        };
        return (
          <section key={d.id} className="tarjeta" aria-labelledby={`d-${d.id}`}>
            <div className="fila-entre"><h2 id={`d-${d.id}`}><Link href={`/pedidos/${p.id}`}>{p.folio}</Link> · {prov.nombre}</h2><EtiquetaEstado estado={p.estado} /></div>
            <p className="chico">Total {pesos(p.total)} · motivo: “{d.motivo}”</p>
            <ol className="pila chico" style={{ margin: 0, paddingLeft: 18 }}>{d.historial.map((h, i) => <li key={i}><strong>{h.autor}:</strong> {h.texto}</li>)}</ol>
            {d.estado === "abierta" && (
              <>
                <div className="campos-2">
                  <div className="campo"><label htmlFor={`n-${d.id}`}>Nota para ambas partes</label><input id={`n-${d.id}`} value={notas[d.id] ?? ""} onChange={(e) => setNotas({ ...notas, [d.id]: e.target.value })} /></div>
                  <div className="campo"><label htmlFor={`m-${d.id}`}>Monto del reembolso parcial ($)</label><input id={`m-${d.id}`} inputMode="decimal" value={montos[d.id] ?? ""} onChange={(e) => setMontos({ ...montos, [d.id]: e.target.value })} /></div>
                </div>
                <div className="fila">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => resolver("a_favor_proveedor")}>A favor del proveedor (liberar pago)</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => resolver("reembolso_parcial")}>Reembolso parcial</button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => resolver("reembolso_total")}>Reembolso total</button>
                </div>
              </>
            )}
          </section>
        );
      })}
    </>
  );
}

function Resenas({ s }: { s: EstadoTienda }) {
  const rep = s.resenas.filter((r) => r.reportada || r.oculta);
  if (!rep.length) return <div className="vacio-estado"><h2>Sin reseñas reportadas</h2></div>;
  return (
    <>
      {rep.map((r) => (
        <section key={r.id} className="tarjeta">
          <p><strong>{r.estrellas} ★ · {r.compradorNombre}</strong> sobre {s.proveedores.find((p) => p.id === r.proveedorId)?.nombre}</p>
          <p>{r.texto}</p>
          {r.reportada && <p className="chico">Reporte: {r.reportada}</p>}
          {r.oculta && <p className="chico suave">Oculta</p>}
          <div className="fila">
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => moderarResena(r.id, true)}>Ocultar</button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => moderarResena(r.id, false)}>Mantener visible</button>
          </div>
        </section>
      ))}
    </>
  );
}

function Pedidos({ s }: { s: EstadoTienda }) {
  return (
    <div className="tarjeta tabla-envoltura" role="region" aria-label="Todos los pedidos" tabIndex={0}>
      <table className="tabla" style={{ minWidth: 620 }}>
        <thead><tr><th scope="col">Folio</th><th scope="col">Proveedor</th><th scope="col">Estado</th><th scope="col" className="der">Total</th><th scope="col" className="der">Comisión</th></tr></thead>
        <tbody>
          {s.pedidos.map((p) => (
            <tr key={p.id}><td><Link href={`/pedidos/${p.id}`}>{p.folio}</Link></td><td>{s.proveedores.find((x) => x.id === p.proveedorId)?.nombre}</td><td><EtiquetaEstado estado={p.estado} /></td><td className="der num">{pesos(p.total)}</td><td className="der num">{pesos(p.comision)}</td></tr>
          ))}
          {!s.pedidos.length && <tr><td colSpan={5} className="suave">Sin pedidos todavía.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Ajustes({ s }: { s: EstadoTienda }) {
  const a = s.ajustes;
  return (
    <div className="rejilla-2">
      <form className="tarjeta" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const n = (k: string) => Number(f.get(k)); try { guardarAjustes({ comision: n("comision") / 100, diasLiberacion: n("dias"), confianzaMinima: n("confianza"), pesosRiesgo: { ahorro: n("pa") / 100, equilibrado: n("pe") / 100, confianza: n("pc") / 100 }, planDestacado: { activo: f.get("destacado") === "on", precioMensual: Math.round(n("precioDest") * 100) } }); mostrarAviso("Guardamos los ajustes. Aplican a pedidos nuevos."); } catch (err) { mostrarAviso((err as Error).message); } }}>
        <h2>Reglas del dinero (simulado)</h2>
        <div className="campos-2">
          <div className="campo"><label htmlFor="a-com">Comisión por venta (% de productos)</label><input id="a-com" name="comision" type="number" step="0.5" min={0} max={30} defaultValue={a.comision * 100} /></div>
          <div className="campo"><label htmlFor="a-dias">Liberar pago a los (días tras la entrega)</label><input id="a-dias" name="dias" type="number" min={1} max={30} defaultValue={a.diasLiberacion} /></div>
        </div>
        <h2>Surtido inteligente</h2>
        <div className="campos-2">
          <div className="campo"><label htmlFor="a-conf">Confianza mínima (0–100)</label><input id="a-conf" name="confianza" type="number" min={0} max={100} defaultValue={a.confianzaMinima} /></div>
          <div className="campo"><label htmlFor="a-pa">Peso del riesgo · Ahorro (%)</label><input id="a-pa" name="pa" type="number" min={0} max={100} defaultValue={a.pesosRiesgo.ahorro * 100} /></div>
          <div className="campo"><label htmlFor="a-pe">Peso del riesgo · Equilibrado (%)</label><input id="a-pe" name="pe" type="number" min={0} max={100} defaultValue={a.pesosRiesgo.equilibrado * 100} /></div>
          <div className="campo"><label htmlFor="a-pc">Peso del riesgo · Confianza (%)</label><input id="a-pc" name="pc" type="number" min={0} max={100} defaultValue={a.pesosRiesgo.confianza * 100} /></div>
        </div>
        <h2>Plan de proveedores destacados</h2>
        <label className="casilla"><input type="checkbox" name="destacado" defaultChecked={a.planDestacado.activo} /> <span>Ofrecer plan destacado (espacio reservado, sin cobro en la demo)</span></label>
        <div className="campo"><label htmlFor="a-pd">Precio mensual ($)</label><input id="a-pd" name="precioDest" type="number" min={0} step="1" defaultValue={a.planDestacado.precioMensual / 100} /></div>
        <button className="btn btn-primary" type="submit">Guardar ajustes</button>
      </form>
      <section className="tarjeta" aria-labelledby="t-demo">
        <h2 id="t-demo">Herramientas de la demostración</h2>
        <p className="chico">Reloj adelantado {s.diasAdelantados} día(s). Adelántalo para probar la liberación automática de pagos a los {a.diasLiberacion} días.</p>
        <div className="fila">
          <button type="button" className="btn btn-ghost" onClick={() => { const n = adelantarReloj(1); mostrarAviso(`Adelantamos el reloj 1 día. ${n} pago(s) liberado(s).`); }}><Clock strokeWidth={TRAZO} width={18} aria-hidden /> +1 día</button>
          <button type="button" className="btn btn-ghost" onClick={() => { const n = adelantarReloj(a.diasLiberacion); mostrarAviso(`Adelantamos el reloj ${a.diasLiberacion} días. ${n} pago(s) liberado(s).`); }}><Clock strokeWidth={TRAZO} width={18} aria-hidden /> +{a.diasLiberacion} días</button>
        </div>
        <hr className="separador" />
        <p className="chico">Borra todos los cambios de este navegador y vuelve a los datos de ejemplo.</p>
        <button type="button" className="btn btn-ghost" onClick={async () => { if (confirm("¿Reiniciar la demostración? Se borran pedidos, cuentas nuevas y cambios.")) { await reiniciarDemo(); mostrarAviso("Reiniciamos la demostración."); } }}><RotateCcw strokeWidth={TRAZO} width={18} aria-hidden /> Reiniciar demostración</button>
      </section>
    </div>
  );
}
