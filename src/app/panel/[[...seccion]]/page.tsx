"use client";
import { AlertTriangle, Download, FileUp, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AnilloConfianza } from "@/components/AnilloConfianza";
import { TRAZO } from "@/components/Iconos";
import { Cifra } from "@/components/movimiento/Cifra";
import { reducirImagen } from "@/components/tienda/fotos";
import { Mensajes } from "@/components/tienda/Mensajes";
import { DesglosePedido, EtiquetaEstado, NOMBRE_PAGO } from "@/components/tienda/Pedido";
import { Requiere } from "@/components/tienda/Requiere";
import { mostrarAviso } from "@/components/tienda/Toasts";
import { categorias, estados, tiposProducto } from "@/lib/catalogo";
import { pesos, unidades } from "@/lib/surtido/formato";
import {
  accionPedido,
  alternarCupon,
  cambiarEstadoProducto,
  desglose,
  estadisticas,
  guardarCupon,
  guardarProducto,
  guardarTienda,
  importarCsv,
  responderCotizacion,
  responderResena,
  subirDocumento,
  subirFactura,
  validarProducto,
  type DatosProducto,
} from "@/lib/tienda/almacen";
import { PLANTILLA_CSV } from "@/lib/tienda/csv";
import { puede } from "@/lib/tienda/pedidos";
import type { EstadoTienda, ProductoTienda, ProveedorTienda } from "@/lib/tienda/tipos";

const SECCIONES = {
  resumen: "Resumen",
  productos: "Productos",
  pedidos: "Pedidos",
  cotizaciones: "Cotizaciones",
  mensajes: "Mensajes",
  cuenta: "Estado de cuenta",
  cupones: "Cupones",
  tienda: "Mi tienda",
  verificacion: "Verificación",
} as const;
type Seccion = keyof typeof SECCIONES;

export default function Pagina() {
  const params = useParams<{ seccion?: string[] }>();
  const seccion = ((params.seccion?.[0] ?? "resumen") in SECCIONES ? params.seccion?.[0] ?? "resumen" : "resumen") as Seccion;
  return (
    <div className="wrap pagina">
      <Requiere roles={["proveedor"]}>
        {(s, u) => {
          const prov = s.proveedores.find((p) => p.id === u.proveedorId)!;
          const porAtender = s.pedidos.filter((p) => p.proveedorId === prov.id && ["confirmado", "preparando"].includes(p.estado)).length;
          const cots = s.cotizaciones.filter((c) => c.proveedorId === prov.id && c.estado === "pendiente").length;
          return (
            <>
              <div className="pagina-cabecera">
                <div>
                  <h1>{prov.nombre}</h1>
                  <p>
                    Panel del proveedor ·{" "}
                    {prov.verificacion === "verificado" ? "tienda verificada" : prov.verificacion === "en_revision" ? "en revisión: tus productos aún no aparecen en el catálogo" : "verificación rechazada"}
                  </p>
                </div>
                {prov.verificacion === "verificado" && <Link className="btn btn-ghost" href={`/proveedores/${prov.id}`}>Ver mi ficha pública</Link>}
              </div>
              <nav className="pestanas" aria-label="Secciones del panel">
                {(Object.keys(SECCIONES) as Seccion[]).map((k) => (
                  <Link key={k} href={`/panel/${k === "resumen" ? "" : k}`} aria-current={k === seccion ? "page" : undefined}>
                    {SECCIONES[k]}
                    {k === "pedidos" && porAtender > 0 && <span className="contador">{porAtender}</span>}
                    {k === "cotizaciones" && cots > 0 && <span className="contador">{cots}</span>}
                    {k === "verificacion" && prov.verificacion !== "verificado" && <span className="contador">!</span>}
                  </Link>
                ))}
              </nav>
              {seccion === "resumen" && <Resumen s={s} prov={prov} />}
              {seccion === "productos" && <Productos s={s} prov={prov} />}
              {seccion === "pedidos" && <PedidosProveedor s={s} prov={prov} />}
              {seccion === "cotizaciones" && <Cotizaciones s={s} prov={prov} />}
              {seccion === "mensajes" && <Mensajes s={s} u={u} />}
              {seccion === "cuenta" && <EstadoCuenta s={s} prov={prov} />}
              {seccion === "cupones" && <Cupones s={s} prov={prov} />}
              {seccion === "tienda" && <Tienda prov={prov} />}
              {seccion === "verificacion" && <Verificacion prov={prov} />}
            </>
          );
        }}
      </Requiere>
    </div>
  );
}

const MESES = new Intl.DateTimeFormat("es-MX", { month: "short" });

function Resumen({ s, prov }: { s: EstadoTienda; prov: ProveedorTienda }) {
  const mios = s.pedidos.filter((p) => p.proveedorId === prov.id && !["cancelado", "pendiente_pago"].includes(p.estado));
  const hoy = new Date();
  const meses = Array.from({ length: 6 }, (_, i) => new Date(hoy.getFullYear(), hoy.getMonth() - 5 + i, 1));
  const porMes = meses.map((m) => mios.filter((p) => { const d = new Date(p.creado); return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth(); }).reduce((a, p) => a + p.productos - p.descuento, 0));
  const maxMes = Math.max(1, ...porMes);
  const esteMes = porMes[5];
  const pasado = porMes[4];
  const est = estadisticas(s, prov.id);
  const activos = s.productos.filter((p) => p.proveedorId === prov.id && p.estado === "activo");
  const pocos = s.productos.filter((p) => p.proveedorId === prov.id && p.existencias < Math.max(20, p.pedidoMinimo * 3));
  const atender = mios.filter((p) => ["confirmado", "preparando"].includes(p.estado));
  const explicacion =
    esteMes === 0 && pasado === 0
      ? "Todavía no hay ventas registradas en la demostración. Cuando entren pedidos verás aquí cómo cambian mes con mes."
      : pasado === 0
        ? `Este mes llevas ${pesos(esteMes)} en ventas sin IVA. El mes pasado no hubo ventas, así que es tu mejor mes en este periodo.`
        : `Este mes llevas ${pesos(esteMes)}, ${esteMes >= pasado ? `${Math.round(((esteMes - pasado) / pasado) * 100)} % más` : `${Math.round(((pasado - esteMes) / pasado) * 100)} % menos`} que el mes pasado (${pesos(pasado)}).`;
  return (
    <>
      <div className="rejilla-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div className="tarjeta"><span className="chico suave">Ventas del mes</span><strong className="precio-destacado" style={{ fontSize: 26 }}><Cifra valor={esteMes} formato="pesos" desdeCero /></strong></div>
        <div className="tarjeta"><span className="chico suave">Pedidos por atender</span><strong className="precio-destacado" style={{ fontSize: 26 }}>{atender.length}</strong>{atender.length > 0 && <Link className="chico" href="/panel/pedidos">Atender</Link>}</div>
        <div className="tarjeta"><span className="chico suave">Productos activos</span><strong className="precio-destacado" style={{ fontSize: 26 }}>{activos.length}</strong></div>
        <div className="tarjeta"><span className="chico suave">Calificación</span><strong className="precio-destacado" style={{ fontSize: 26 }}>{est.numResenas ? <><Cifra valor={est.sumaEstrellas / est.numResenas} formato="decimal1" desdeCero /> ★</> : "—"}</strong><span className="chico suave">{est.numResenas} reseñas</span></div>
      </div>
      {pocos.length > 0 && (
        <section className="tarjeta" style={{ background: "var(--amber-tint)" }} aria-labelledby="t-inv">
          <h2 id="t-inv" className="fila"><AlertTriangle strokeWidth={TRAZO} width={20} aria-hidden /> Poco inventario</h2>
          <ul className="pila chico" style={{ margin: 0, paddingLeft: 18 }}>
            {pocos.map((p) => <li key={p.id}>{p.nombre}: quedan {unidades(p.existencias, p.unidad)}</li>)}
          </ul>
        </section>
      )}
      <div className="rejilla-2">
        <section className="tarjeta" aria-labelledby="t-graf">
          <h2 id="t-graf">Ventas de los últimos 6 meses</h2>
          <div className="grafica" role="img" aria-label={`Ventas por mes: ${meses.map((m, i) => `${MESES.format(m)} ${pesos(porMes[i])}`).join(", ")}`}>
            {meses.map((m, i) => (
              <div key={i}>
                <span className="barra" style={{ height: `${Math.max(3, (porMes[i] / maxMes) * 100)}%`, "--i": i, opacity: porMes[i] ? 1 : 0.25 } as React.CSSProperties} />
                <span>{MESES.format(m)}</span>
              </div>
            ))}
          </div>
          <p className="chico">{explicacion}</p>
        </section>
        <section className="tarjeta" aria-labelledby="t-conf">
          <h2 id="t-conf">Tu confianza</h2>
          <AnilloConfianza desglose={desglose(s, prov.id)} tam="lg" abierto />
          <p className="chico suave">Sube al completar pedidos, recibir buenas reseñas y responder rápido. Con más confianza apareces primero en el surtido.</p>
        </section>
      </div>
      <Resenas s={s} prov={prov} />
    </>
  );
}

function Resenas({ s, prov }: { s: EstadoTienda; prov: ProveedorTienda }) {
  const rs = s.resenas.filter((r) => r.proveedorId === prov.id);
  if (!rs.length) return null;
  return (
    <section className="tarjeta" aria-labelledby="t-res">
      <h2 id="t-res">Reseñas recientes</h2>
      <ul className="pila" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {rs.map((r) => (
          <li key={r.id} className="pila" style={{ gap: 4 }}>
            <strong>{r.estrellas} ★ · {r.compradorNombre}</strong>
            <p className="chico">{r.texto}</p>
            {r.respuesta ? <p className="chico suave">Tu respuesta: {r.respuesta}</p> : (
              <form className="fila" onSubmit={(e) => { e.preventDefault(); try { responderResena(r.id, String(new FormData(e.currentTarget).get("resp"))); mostrarAviso("Publicamos tu respuesta."); } catch (err) { mostrarAviso((err as Error).message); } }}>
                <div className="campo" style={{ flex: 1 }}><label htmlFor={`r-${r.id}`} className="sr-only">Responder</label><input id={`r-${r.id}`} name="resp" placeholder="Agradece o aclara…" /></div>
                <button className="btn btn-ghost btn-sm" type="submit">Responder</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

const pesosAC = (v: string) => Math.round(Number(v.replace(/[$,\s]/g, "")) * 100);

function Productos({ s, prov }: { s: EstadoTienda; prov: ProveedorTienda }) {
  const [editando, setEditando] = useState<ProductoTienda | "nuevo" | null>(null);
  const [csv, setCsv] = useState<{ importadas: number; errores: { fila: number; mensajes: string[] }[] } | null>(null);
  const mios = s.productos.filter((p) => p.proveedorId === prov.id);
  if (editando) return <FormProducto inicial={editando === "nuevo" ? null : editando} cerrar={() => setEditando(null)} />;
  return (
    <>
      <div className="fila">
        <button type="button" className="btn btn-primary" onClick={() => setEditando("nuevo")}><Plus strokeWidth={TRAZO} width={18} aria-hidden /> Nuevo producto</button>
        <a className="btn btn-ghost" download="plantilla-productos-provana.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent("﻿" + PLANTILLA_CSV)}`}><Download strokeWidth={TRAZO} width={18} aria-hidden /> Plantilla CSV</a>
        <label className="btn btn-ghost" style={{ cursor: "pointer" }}>
          <FileUp strokeWidth={TRAZO} width={18} aria-hidden /> Carga masiva (CSV)
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const r = importarCsv(await f.text()); setCsv(r); mostrarAviso(`Importamos ${r.importadas} producto(s).${r.errores.length ? ` ${r.errores.length} fila(s) con errores.` : ""}`); e.target.value = ""; }} />
        </label>
      </div>
      <p className="ayuda">¿Usas Excel? Guarda tu archivo como “CSV UTF-8”. Los tipos válidos son: {tiposProducto.map((t) => t.id).join(", ")}.</p>
      {csv && csv.errores.length > 0 && (
        <section className="tarjeta" aria-labelledby="t-csv" style={{ background: "var(--danger-tint)" }}>
          <h2 id="t-csv">Filas con errores</h2>
          <ul className="pila chico" style={{ margin: 0, paddingLeft: 18 }}>{csv.errores.map((e) => <li key={e.fila}><strong>Fila {e.fila}:</strong> {e.mensajes.join(" ")}</li>)}</ul>
        </section>
      )}
      <div className="tarjeta tabla-envoltura" role="region" aria-label="Mis productos" tabIndex={0}>
        <table className="tabla" style={{ minWidth: 640 }}>
          <thead><tr><th scope="col">Producto</th><th scope="col">Precio</th><th scope="col">Existencias</th><th scope="col">Estado</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            {mios.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/producto/${p.id}`}>{p.nombre}</Link><br /><span className="chico suave">{tiposProducto.find((t) => t.id === p.tipoId)?.nombre}</span></td>
                <td className="num">{pesos(p.precioMenudeo)}{p.escalones.length > 0 && <><br /><span className="chico suave">{p.escalones.length} escalón(es)</span></>}</td>
                <td className="num" style={p.existencias < Math.max(20, p.pedidoMinimo * 3) ? { color: "var(--amber-ink)", fontWeight: 600 } : undefined}>{p.existencias.toLocaleString("es-MX")}</td>
                <td><span className="estado" data-tono={p.estado === "activo" ? "verde" : "ambar"}>{p.estado === "activo" ? "Activo" : "Pausado"}</span></td>
                <td>
                  <div className="fila" style={{ flexWrap: "nowrap", gap: 4 }}>
                    <button type="button" className="boton-icono" aria-label={`Editar ${p.nombre}`} onClick={() => setEditando(p)}><Pencil strokeWidth={TRAZO} aria-hidden /></button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => cambiarEstadoProducto(p.id, p.estado === "activo" ? "pausar" : "activar")}>{p.estado === "activo" ? "Pausar" : "Activar"}</button>
                    <button type="button" className="boton-icono" aria-label={`Borrar ${p.nombre}`} onClick={() => { if (confirm(`¿Borrar ${p.nombre}? No se puede deshacer.`)) { cambiarEstadoProducto(p.id, "borrar"); mostrarAviso(`Borramos ${p.nombre}.`); } }}><Trash2 strokeWidth={TRAZO} aria-hidden /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FormProducto({ inicial, cerrar }: { inicial: ProductoTienda | null; cerrar: () => void }) {
  const [d, setD] = useState<DatosProducto>(
    inicial
      ? { id: inicial.id, nombre: inicial.nombre, tipoId: inicial.tipoId, descripcion: inicial.descripcion, unidad: inicial.unidad, variante: inicial.variante, precioMenudeo: inicial.precioMenudeo, escalones: inicial.escalones, pedidoMinimo: inicial.pedidoMinimo, existencias: inicial.existencias, pesoKg: inicial.pesoKg, medidas: inicial.medidas, maxDiasTransito: inicial.maxDiasTransito, permisoSanitario: inicial.permisoSanitario, fotos: inicial.fotos }
      : { nombre: "", tipoId: "", descripcion: "", unidad: "pieza", variante: null, precioMenudeo: 0, escalones: [], pedidoMinimo: 1, existencias: 0, pesoKg: 0.5, medidas: null, maxDiasTransito: null, permisoSanitario: null, fotos: [] },
  );
  const [error, setError] = useState("");
  const errores = d.nombre || d.tipoId ? validarProducto(d) : [];
  const tipo = tiposProducto.find((t) => t.id === d.tipoId);
  const requierePermiso = categorias.find((c) => c.id === tipo?.categoriaId)?.requierePermiso;
  const set = (c: Partial<DatosProducto>) => setD((x) => ({ ...x, ...c }));
  return (
    <form className="tarjeta" onSubmit={(e) => { e.preventDefault(); try { const id = guardarProducto(d); mostrarAviso(inicial ? `Guardamos los cambios de ${d.nombre}.` : `Publicamos ${d.nombre}.`, { href: `/producto/${id}`, texto: "Ver" }); cerrar(); } catch (err) { setError((err as Error).message); } }}>
      <h2>{inicial ? `Editar ${inicial.nombre}` : "Nuevo producto"}</h2>
      <div className="campos-2">
        <div className="campo"><label htmlFor="p-nombre">Nombre</label><input id="p-nombre" value={d.nombre} onChange={(e) => set({ nombre: e.target.value })} /></div>
        <div className="campo">
          <label htmlFor="p-tipo">Tipo de producto</label>
          <select id="p-tipo" value={d.tipoId} onChange={(e) => { const t = tiposProducto.find((x) => x.id === e.target.value); set({ tipoId: e.target.value, unidad: (t?.unidad ?? "pieza") as DatosProducto["unidad"] }); }}>
            <option value="">Elige…</option>
            {tiposProducto.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
          <p className="ayuda">Así te comparamos en el surtido. ¿No está tu tipo? Pídelo a administración.</p>
        </div>
        <div className="campo" style={{ gridColumn: "1 / -1" }}><label htmlFor="p-desc">Descripción</label><textarea id="p-desc" value={d.descripcion} onChange={(e) => set({ descripcion: e.target.value })} /></div>
        <div className="campo"><label htmlFor="p-precio">Precio de menudeo sin IVA ($ por {d.unidad})</label><input id="p-precio" inputMode="decimal" defaultValue={d.precioMenudeo ? (d.precioMenudeo / 100).toFixed(2) : ""} onChange={(e) => set({ precioMenudeo: pesosAC(e.target.value) || 0 })} /></div>
        <div className="campo"><label htmlFor="p-var">Variante (opcional)</label><input id="p-var" placeholder="aroma=lavanda" defaultValue={d.variante ? Object.entries(d.variante).map(([k, v]) => `${k}=${v}`)[0] : ""} onChange={(e) => { const [k, v] = e.target.value.split("="); set({ variante: k?.trim() && v?.trim() ? { [k.trim()]: v.trim() } : null }); }} /></div>
      </div>

      <fieldset className="pila" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={{ fontWeight: 600 }}>Precios de mayoreo</legend>
        {d.escalones.map((esc, i) => (
          <div key={i} className="fila" style={{ alignItems: "end" }}>
            <div className="campo"><label htmlFor={`e-q-${i}`}>Desde (cantidad)</label><input id={`e-q-${i}`} inputMode="numeric" value={esc.cantidadMinima || ""} onChange={(e) => set({ escalones: d.escalones.map((x, j) => (j === i ? { ...x, cantidadMinima: Number(e.target.value.replace(/\D/g, "")) } : x)) })} /></div>
            <div className="campo"><label htmlFor={`e-p-${i}`}>Precio c/u ($)</label><input id={`e-p-${i}`} inputMode="decimal" defaultValue={esc.precioUnitario ? (esc.precioUnitario / 100).toFixed(2) : ""} onChange={(e) => set({ escalones: d.escalones.map((x, j) => (j === i ? { ...x, precioUnitario: pesosAC(e.target.value) || 0 } : x)) })} /></div>
            <button type="button" className="boton-icono" aria-label={`Quitar escalón ${i + 1}`} onClick={() => set({ escalones: d.escalones.filter((_, j) => j !== i) })}><Trash2 strokeWidth={TRAZO} aria-hidden /></button>
          </div>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" style={{ justifySelf: "start" }} onClick={() => set({ escalones: [...d.escalones, { cantidadMinima: 0, precioUnitario: 0 }] })}><Plus strokeWidth={TRAZO} width={16} aria-hidden /> Agregar escalón</button>
        <p className="ayuda">Cada escalón debe pedir más cantidad y costar menos que el anterior.</p>
      </fieldset>

      <div className="campos-2">
        <div className="campo"><label htmlFor="p-min">Pedido mínimo</label><input id="p-min" inputMode="numeric" value={d.pedidoMinimo || ""} onChange={(e) => set({ pedidoMinimo: Number(e.target.value.replace(/\D/g, "")) })} /></div>
        <div className="campo"><label htmlFor="p-exist">Existencias</label><input id="p-exist" inputMode="numeric" value={d.existencias} onChange={(e) => set({ existencias: Number(e.target.value.replace(/\D/g, "")) })} /></div>
        <div className="campo"><label htmlFor="p-peso">Peso por {d.unidad} (kg)</label><input id="p-peso" inputMode="decimal" defaultValue={d.pesoKg} onChange={(e) => set({ pesoKg: Number(e.target.value) })} /></div>
        <div className="campo"><label htmlFor="p-med">Medidas (largo×ancho×alto cm)</label><input id="p-med" placeholder="20×12×8" defaultValue={d.medidas ? `${d.medidas.largoCm}×${d.medidas.anchoCm}×${d.medidas.altoCm}` : ""} onChange={(e) => { const [l, a, h] = e.target.value.split(/[x×*]/).map(Number); set({ medidas: l > 0 && a > 0 && h > 0 ? { largoCm: l, anchoCm: a, altoCm: h } : null }); }} /></div>
        <div className="campo"><label htmlFor="p-perec">Perecedero: días máximos en tránsito</label><input id="p-perec" inputMode="numeric" placeholder="Vacío si no aplica" defaultValue={d.maxDiasTransito ?? ""} onChange={(e) => set({ maxDiasTransito: Number(e.target.value) || null })} /></div>
        {requierePermiso && (
          <div className="campo">
            <label htmlFor="p-perm">Permiso o etiquetado sanitario</label>
            <select id="p-perm" value={d.permisoSanitario ?? ""} onChange={(e) => set({ permisoSanitario: (e.target.value || null) as DatosProducto["permisoSanitario"] })}>
              <option value="">Elige…</option>
              <option value="declarado">Declaro que lo tengo</option>
              <option value="declarado-con-documento">Lo tengo y subí el documento (insignia extra)</option>
            </select>
          </div>
        )}
      </div>
      <div className="campo">
        <label htmlFor="p-fotos">Fotos (hasta 4)</label>
        <input id="p-fotos" type="file" accept="image/*" multiple onChange={async (e) => { try { set({ fotos: await Promise.all(Array.from(e.target.files ?? []).slice(0, 4).map((f) => reducirImagen(f))) }); } catch (err) { setError((err as Error).message); } }} />
        {d.fotos.length > 0 && <p className="ayuda">{d.fotos.length} foto(s).</p>}
      </div>
      {errores.length > 0 && <ul className="error-form" style={{ margin: 0, paddingLeft: 28 }}>{errores.map((m) => <li key={m}>{m}</li>)}</ul>}
      {error && <p className="error-form" role="alert">{error}</p>}
      <div className="fila"><button type="submit" className="btn btn-primary" disabled={errores.length > 0}>{inicial ? "Guardar cambios" : "Publicar producto"}</button><button type="button" className="btn btn-ghost" onClick={cerrar}>Cancelar</button></div>
    </form>
  );
}

function PedidosProveedor({ s, prov }: { s: EstadoTienda; prov: ProveedorTienda }) {
  const mios = s.pedidos.filter((p) => p.proveedorId === prov.id);
  const [error, setError] = useState("");
  const hacer = (id: string, a: Parameters<typeof accionPedido>[1], msg: string) => { try { accionPedido(id, a); mostrarAviso(msg); setError(""); } catch (e) { setError((e as Error).message); } };
  if (!mios.length) return <div className="vacio-estado greca"><h2>Aún no tienes pedidos</h2><p>Cuando un comprador te compre, aquí lo preparas y lo envías.</p></div>;
  return (
    <ul className="pila" style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {error && <li className="error-form" role="alert">{error}</li>}
      {mios.map((p) => {
        const comprador = s.usuarios.find((u) => u.id === p.compradorId);
        return (
          <li key={p.id} className="tarjeta">
            <div className="fila-entre">
              <h2 style={{ fontSize: 18 }}><Link href={`/pedidos/${p.id}`}>{p.folio}</Link> · {comprador?.nombre}</h2>
              <EtiquetaEstado estado={p.estado} />
            </div>
            <DesglosePedido p={p} proveedor />
            <p className="chico"><strong>{NOMBRE_PAGO[p.pago.estado]}</strong> · Envío a {p.direccion.ciudad}, {estados.find((e) => e.clave === p.direccion.estado)?.nombre}{p.envio.guia ? ` · guía ${p.envio.guia}` : ""}</p>
            <div className="fila">
              {puede(p, "preparar", "proveedor") && <button className="btn btn-primary btn-sm" type="button" onClick={() => hacer(p.id, "preparar", `Marcamos ${p.folio} como “preparando”. Le avisamos al comprador.`)}>Empezar a preparar</button>}
              {puede(p, "enviar", "proveedor") && <button className="btn btn-primary btn-sm" type="button" onClick={() => hacer(p.id, "enviar", `Generamos la guía de ${p.folio} (simulada).`)}>Generar guía y enviar</button>}
              {puede(p, "marcar_entregado", "proveedor") && <button className="btn btn-ghost btn-sm" type="button" onClick={() => hacer(p.id, "marcar_entregado", `La paquetería entregó ${p.folio} (simulado).`)}>Simular entrega de la paquetería</button>}
              {puede(p, "cancelar", "proveedor") && <button className="btn btn-ghost btn-sm" type="button" onClick={() => hacer(p.id, "cancelar", `Cancelamos ${p.folio} y devolvimos el pago.`)}>Cancelar</button>}
            </div>
            {p.factura.solicitada && !p.factura.xml && (
              <form className="fila" style={{ alignItems: "end" }} onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const x = f.get("xml") as File; const pdf = f.get("pdf") as File; try { subirFactura(p.id, x?.name ?? "", pdf?.name ?? ""); mostrarAviso(`Subimos la factura de ${p.folio}.`); } catch (err) { setError((err as Error).message); } }}>
                <p className="chico" style={{ width: "100%" }}>El comprador pidió factura: RFC {p.factura.rfc}, {p.factura.razonSocial}, uso {p.factura.usoCfdi}.</p>
                <div className="campo"><label htmlFor={`xml-${p.id}`}>XML</label><input id={`xml-${p.id}`} name="xml" type="file" accept=".xml" /></div>
                <div className="campo"><label htmlFor={`pdf-${p.id}`}>PDF</label><input id={`pdf-${p.id}`} name="pdf" type="file" accept=".pdf" /></div>
                <button className="btn btn-ghost btn-sm" type="submit">Subir factura</button>
              </form>
            )}
            {p.factura.xml && <p className="chico suave">Factura subida: {p.factura.xml} · {p.factura.pdf}</p>}
          </li>
        );
      })}
    </ul>
  );
}

function Cotizaciones({ s, prov }: { s: EstadoTienda; prov: ProveedorTienda }) {
  const cots = s.cotizaciones.filter((c) => c.proveedorId === prov.id);
  if (!cots.length) return <div className="vacio-estado greca"><h2>Sin solicitudes</h2><p>Aquí llegan las cotizaciones y muestras que te pidan.</p></div>;
  return (
    <ul className="pila" style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {cots.map((c) => {
        const p = s.productos.find((x) => x.id === c.productoId);
        return (
          <li key={c.id} className="tarjeta">
            <div className="fila-entre"><h2 style={{ fontSize: 18 }}>{c.tipo === "muestra" ? "Muestra" : "Cotización"} · {p?.nombre}</h2><span className="estado" data-tono={c.estado === "respondida" ? "verde" : "ambar"}>{c.estado === "respondida" ? "Respondida" : "Pendiente"}</span></div>
            <p className="chico">{s.usuarios.find((u) => u.id === c.compradorId)?.nombre} · {p ? unidades(c.cantidad, p.unidad) : c.cantidad} · {c.mensaje}</p>
            {c.estado === "pendiente" ? (
              <form className="campos-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); try { responderCotizacion(c.id, String(f.get("resp")), f.get("precio") ? pesosAC(String(f.get("precio"))) : undefined); mostrarAviso("Enviamos tu respuesta."); } catch (err) { mostrarAviso((err as Error).message); } }}>
                <div className="campo"><label htmlFor={`cr-${c.id}`}>Respuesta</label><input id={`cr-${c.id}`} name="resp" /></div>
                <div className="campo"><label htmlFor={`cp-${c.id}`}>Precio ofrecido c/u ($, opcional)</label><input id={`cp-${c.id}`} name="precio" inputMode="decimal" /></div>
                <button className="btn btn-primary btn-sm" type="submit">Responder</button>
              </form>
            ) : (
              <p className="chico suave">Respondiste: {c.respuesta}{c.precioOfrecido ? ` · ${pesos(c.precioOfrecido)}` : ""}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function EstadoCuenta({ s, prov }: { s: EstadoTienda; prov: ProveedorTienda }) {
  const mios = s.pedidos.filter((p) => p.proveedorId === prov.id && p.estado !== "cancelado" && p.pago.estado !== "pendiente");
  const suma = (f: (p: (typeof mios)[0]) => boolean, k: (p: (typeof mios)[0]) => number) => mios.filter(f).reduce((a, p) => a + k(p), 0);
  const ventas = suma(() => true, (p) => p.productos - p.descuento);
  const comisiones = suma((p) => p.pago.estado === "liberado", (p) => p.comision);
  const liberado = suma((p) => p.pago.estado === "liberado", (p) => p.montoProveedor);
  const pendiente = suma((p) => p.pago.estado === "retenido", (p) => p.montoProveedor);
  const detenido = suma((p) => p.pago.estado === "detenido", (p) => p.montoProveedor);
  return (
    <>
      <div className="rejilla-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        {[["Ventas (sin IVA)", ventas], ["Comisiones cobradas", comisiones], ["Pagos liberados", liberado], ["Pendiente de liberar", pendiente], ["Detenido por disputa", detenido]].map(([n, v]) => (
          <div key={n as string} className="tarjeta"><span className="chico suave">{n}</span><strong className="precio-destacado" style={{ fontSize: 22 }}>{pesos(v as number)}</strong></div>
        ))}
      </div>
      <p className="ayuda">Comisión actual de Provana: {Math.round(s.ajustes.comision * 100)} % sobre productos. El pago se libera cuando el comprador confirma la entrega o a los {s.ajustes.diasLiberacion} días de entregado. Modo demostración: no hay depósitos reales.</p>
      <div className="tarjeta tabla-envoltura" role="region" aria-label="Movimientos" tabIndex={0}>
        <table className="tabla" style={{ minWidth: 560 }}>
          <thead><tr><th scope="col">Pedido</th><th scope="col">Estado del pago</th><th scope="col" className="der">Venta</th><th scope="col" className="der">Comisión</th><th scope="col" className="der">Recibes</th></tr></thead>
          <tbody>
            {mios.map((p) => (
              <tr key={p.id}><td><Link href={`/pedidos/${p.id}`}>{p.folio}</Link></td><td>{NOMBRE_PAGO[p.pago.estado]}</td><td className="der num">{pesos(p.productos - p.descuento)}</td><td className="der num">−{pesos(p.comision)}</td><td className="der num">{pesos(p.montoProveedor)}</td></tr>
            ))}
            {!mios.length && <tr><td colSpan={5} className="suave">Sin movimientos todavía.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Cupones({ s, prov }: { s: EstadoTienda; prov: ProveedorTienda }) {
  const mios = s.cupones.filter((c) => c.proveedorId === prov.id);
  return (
    <div className="rejilla-2">
      <form className="tarjeta" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); try { guardarCupon(String(f.get("codigo")), Number(f.get("pct")), pesosAC(String(f.get("minimo") || "0"))); mostrarAviso("Guardamos tu cupón."); e.currentTarget.reset(); } catch (err) { mostrarAviso((err as Error).message); } }}>
        <h2>Nuevo cupón</h2>
        <div className="campo"><label htmlFor="c-cod">Código</label><input id="c-cod" name="codigo" placeholder="VERANO15" /></div>
        <div className="campos-2">
          <div className="campo"><label htmlFor="c-pct">Descuento (%)</label><input id="c-pct" name="pct" inputMode="numeric" defaultValue={10} /></div>
          <div className="campo"><label htmlFor="c-min">Compra mínima ($)</label><input id="c-min" name="minimo" inputMode="decimal" defaultValue={0} /></div>
        </div>
        <button className="btn btn-primary" type="submit">Guardar cupón</button>
      </form>
      <section className="tarjeta" aria-labelledby="t-cups">
        <h2 id="t-cups">Mis cupones</h2>
        {!mios.length && <p className="suave">Sin cupones.</p>}
        <ul className="pila" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {mios.map((c) => (
            <li key={c.codigo} className="fila-entre"><span><strong className="num">{c.codigo}</strong> · {c.porcentaje} %{c.minimo ? ` desde ${pesos(c.minimo)}` : ""}</span><button type="button" className="btn btn-ghost btn-sm" onClick={() => alternarCupon(c.codigo)}>{c.activo ? "Desactivar" : "Activar"}</button></li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Tienda({ prov }: { prov: ProveedorTienda }) {
  const [enviaA, setEnviaA] = useState(prov.enviaA);
  return (
    <form className="tarjeta" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); try { guardarTienda({ descripcion: String(f.get("descripcion")), condiciones: String(f.get("condiciones")), ciudad: String(f.get("ciudad")), diasPreparacion: Number(f.get("dias")), cobraIva: f.get("iva") === "on", enviaA }); mostrarAviso("Guardamos los datos de tu tienda."); } catch (err) { mostrarAviso((err as Error).message); } }}>
      <h2>Datos de la tienda</h2>
      <div className="campos-2">
        <div className="campo"><label htmlFor="t-ciudad">Ciudad</label><input id="t-ciudad" name="ciudad" defaultValue={prov.ciudad} /></div>
        <div className="campo"><label htmlFor="t-dias">Días de preparación</label><input id="t-dias" name="dias" type="number" min={0} max={15} defaultValue={prov.diasPreparacion} /></div>
      </div>
      <div className="campo"><label htmlFor="t-desc">Descripción</label><textarea id="t-desc" name="descripcion" defaultValue={prov.descripcion} /></div>
      <div className="campo"><label htmlFor="t-cond">Condiciones de compra</label><textarea id="t-cond" name="condiciones" defaultValue={prov.condiciones} /></div>
      <label className="casilla"><input type="checkbox" name="iva" defaultChecked={prov.cobraIva} /> <span>Cobro IVA (16 %)</span></label>
      <details>
        <summary style={{ cursor: "pointer", minHeight: 32 }}>Envío a {enviaA.length} estados · cambiar</summary>
        <div className="campos-2" style={{ marginTop: 8 }}>
          {estados.map((e) => <label key={e.clave} className="casilla"><input type="checkbox" checked={enviaA.includes(e.clave)} onChange={(ev) => setEnviaA((a) => (ev.target.checked ? [...a, e.clave] : a.filter((x) => x !== e.clave)))} /> <span>{e.nombre}</span></label>)}
        </div>
      </details>
      <p className="ayuda">Estado de origen: {estados.find((e) => e.clave === prov.estado)?.nombre}. Para cambiarlo, escribe a administración.</p>
      <button className="btn btn-primary" type="submit">Guardar</button>
    </form>
  );
}

const DOCS = [
  ["rfc", "Constancia de situación fiscal (RFC)"],
  ["identificacion", "Identificación oficial"],
  ["domicilio", "Comprobante de domicilio en México"],
  ["taller", "Fotos del taller o bodega"],
  ["permiso", "Permiso sanitario (si vendes alimentos o cosméticos)"],
] as const;

function Verificacion({ prov }: { prov: ProveedorTienda }) {
  return (
    <section className="tarjeta" aria-labelledby="t-ver">
      <h2 id="t-ver">Verificación de tu negocio</h2>
      <p>
        Estado: <span className="estado" data-tono={prov.verificacion === "verificado" ? "verde" : prov.verificacion === "rechazado" ? "rojo" : "ambar"}>{prov.verificacion === "verificado" ? "Verificado" : prov.verificacion === "rechazado" ? "Rechazado" : "En revisión"}</span>
      </p>
      {prov.motivoRechazo && <p className="error-form">Motivo: {prov.motivoRechazo}. Sube los documentos corregidos y volverá a revisión.</p>}
      <p className="ayuda">Los documentos son privados: solo los ve administración. Modo demostración: guardamos solo el nombre del archivo.</p>
      <ul className="pila" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {DOCS.map(([tipo, nombre]) => {
          const d = prov.documentos.find((x) => x.tipo === tipo);
          return (
            <li key={tipo} className="fila-entre">
              <span><strong>{nombre}</strong><br /><span className="chico suave">{d ? `${d.nombreArchivo} · subido` : "Sin subir"}</span></span>
              <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>
                {d ? "Reemplazar" : "Subir"}
                <input type="file" accept=".pdf,image/*" className="sr-only" aria-label={`Subir ${nombre}`} onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; try { subirDocumento(tipo, f.name); mostrarAviso(`Subimos ${f.name}.`); } catch (err) { mostrarAviso((err as Error).message); } }} />
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

