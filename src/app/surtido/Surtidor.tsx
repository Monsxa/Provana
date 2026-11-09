"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Alerta, Bandera, Camion, Escudo, Mas, Quitar } from "@/components/Iconos";
import { pesos, unidades } from "@/lib/surtido/formato";
import type { GrupoProveedor, Prioridad, ResultadoSurtido } from "@/lib/surtido/tipos";
import s from "./surtido.module.css";

export interface OpcionesSurtidor {
  estados: { clave: string; nombre: string }[];
  grupos: { categoria: string; tipos: { id: string; nombre: string; unidad: string }[] }[];
  variantes: Record<string, Record<string, string[]>>;
}

interface Fila {
  clave: number;
  tipoId: string;
  cantidad: string;
  variante: Record<string, string>;
  proveedorFijo: string | null;
}

const PRIORIDADES: { id: Prioridad; nombre: string; ayuda: string }[] = [
  { id: "ahorro", nombre: "Ahorro", ayuda: "Solo cuenta el precio." },
  { id: "equilibrado", nombre: "Equilibrado", ayuda: "Paga un poco más si el proveedor es mucho más confiable." },
  { id: "confianza", nombre: "Confianza", ayuda: "Prefiere proveedores con mejor historial." },
];

const EJEMPLO = {
  estado: "JAL",
  filas: [
    { tipoId: "vela-soya-200g", cantidad: "40" },
    { tipoId: "bolsa-kraft-mediana", cantidad: "500" },
    { tipoId: "cafe-altura-1kg", cantidad: "10" },
  ],
};

let siguienteClave = 1;
const filaVacia = (parcial: Partial<Fila> = {}): Fila => ({
  clave: siguienteClave++,
  tipoId: "",
  cantidad: "",
  variante: {},
  proveedorFijo: null,
  ...parcial,
});

export function Surtidor({ opciones }: { opciones: OpcionesSurtidor }) {
  const [estado, setEstado] = useState("");
  const [prioridad, setPrioridad] = useState<Prioridad>("equilibrado");
  const [permitirExtra, setPermitirExtra] = useState(false);
  const [filas, setFilas] = useState<Fila[]>(() => [filaVacia()]);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<ResultadoSurtido | null>(null);
  const [filasCalculadas, setFilasCalculadas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const resultadosRef = useRef<HTMLElement>(null);
  const idEstado = useId();

  const tipos = useMemo(() => new Map(opciones.grupos.flatMap((g) => g.tipos).map((t) => [t.id, t])), [opciones]);
  const nombreEstado = (clave: string) => opciones.estados.find((e) => e.clave === clave)?.nombre ?? clave;

  const validar = useCallback(
    (lista: Fila[], est: string) => {
      const e: Record<string, string> = {};
      if (!est) e.estado = "Elige el estado al que te envían.";
      const completas = lista.filter((f) => f.tipoId || f.cantidad);
      if (completas.length === 0) e.lista = "Agrega al menos un producto con su cantidad.";
      for (const f of completas) {
        if (!f.tipoId) e[`tipo-${f.clave}`] = "Elige qué producto necesitas.";
        const n = Number(f.cantidad);
        if (!f.cantidad) e[`cantidad-${f.clave}`] = "Escribe cuántos necesitas.";
        else if (!Number.isInteger(n) || n < 1) e[`cantidad-${f.clave}`] = "Usa un número entero mayor a cero.";
        else if (n > 1_000_000) e[`cantidad-${f.clave}`] = "El máximo es 1,000,000.";
      }
      return e;
    },
    [],
  );

  const calcular = useCallback(
    async (lista: Fila[], est: string, prio: Prioridad, extra: boolean, desplazar: boolean) => {
      const e = validar(lista, est);
      setErrores(e);
      if (Object.keys(e).length > 0) return;
      const completas = lista.filter((f) => f.tipoId && f.cantidad);
      setCargando(true);
      setErrorServidor(null);
      try {
        const res = await fetch("/api/surtido", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            estadoDestino: est,
            prioridad: prio,
            permitirExtra: extra,
            renglones: completas.map((f) => ({
              tipoId: f.tipoId,
              cantidad: Number(f.cantidad),
              variante: Object.keys(f.variante).length ? f.variante : null,
              proveedorFijo: f.proveedorFijo,
            })),
          }),
        });
        const datos = await res.json();
        if (!res.ok) {
          setErrorServidor(datos.error ?? "No pudimos calcular tu surtido.");
          return;
        }
        setResultado(datos as ResultadoSurtido);
        setFilasCalculadas(completas);
        if (desplazar && window.matchMedia("(max-width: 960px)").matches) {
          requestAnimationFrame(() => resultadosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
        }
      } catch {
        setErrorServidor("No hay conexión con Provana. Revisa tu internet e inténtalo de nuevo.");
      } finally {
        setCargando(false);
      }
    },
    [validar],
  );

  // Si ya hay resultado, recalcular al cambiar prioridad o piezas extra.
  const hayResultado = resultado !== null;
  const primeraVez = useRef(true);
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    if (hayResultado) void calcular(filas, estado, prioridad, permitirExtra, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prioridad, permitirExtra]);

  const actualizarFila = (clave: number, cambios: Partial<Fila>) =>
    setFilas((fs) => fs.map((f) => (f.clave === clave ? { ...f, ...cambios } : f)));

  const cambiarProveedor = (renglon: number, proveedorId: string) => {
    const fila = filasCalculadas[renglon];
    if (!fila) return;
    const nuevas = filas.map((f) => (f.clave === fila.clave ? { ...f, proveedorFijo: proveedorId } : f));
    setFilas(nuevas);
    void calcular(nuevas, estado, prioridad, permitirExtra, false);
  };

  const soltarFijos = () => {
    const nuevas = filas.map((f) => ({ ...f, proveedorFijo: null }));
    setFilas(nuevas);
    void calcular(nuevas, estado, prioridad, permitirExtra, false);
  };

  const cargarEjemplo = () => {
    const nuevas = EJEMPLO.filas.map((f) => filaVacia(f));
    setEstado(EJEMPLO.estado);
    setFilas(nuevas);
    void calcular(nuevas, EJEMPLO.estado, prioridad, permitirExtra, true);
  };

  const hayFijos = filas.some((f) => f.proveedorFijo);

  return (
    <div className={s.distribucion}>
      <form
        className={s.formulario}
        noValidate
        onSubmit={(ev) => {
          ev.preventDefault();
          void calcular(filas, estado, prioridad, permitirExtra, true);
        }}
        aria-describedby="ayuda-formulario"
      >
        <p id="ayuda-formulario" className="sr-only">
          Agrega productos con su cantidad, elige tu estado y calcula.
        </p>

        <fieldset className={s.bloque}>
          <legend className={s.leyenda}>Lo que necesitas</legend>
          <ul className={s.filas}>
            {filas.map((f, i) => {
              const tipo = tipos.get(f.tipoId);
              const vars = opciones.variantes[f.tipoId] ?? {};
              const errTipo = errores[`tipo-${f.clave}`];
              const errCant = errores[`cantidad-${f.clave}`];
              return (
                <li key={f.clave} className={s.fila}>
                  <div className={s.campo}>
                    <label htmlFor={`tipo-${f.clave}`}>{filas.length > 1 ? `Producto ${i + 1}` : "Producto"}</label>
                    <select
                      id={`tipo-${f.clave}`}
                      value={f.tipoId}
                      aria-invalid={!!errTipo}
                      aria-describedby={errTipo ? `err-tipo-${f.clave}` : undefined}
                      onChange={(e) => actualizarFila(f.clave, { tipoId: e.target.value, variante: {}, proveedorFijo: null })}
                    >
                      <option value="">Elige un producto…</option>
                      {opciones.grupos.map((g) => (
                        <optgroup key={g.categoria} label={g.categoria}>
                          {g.tipos.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.nombre}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    {errTipo && (
                      <p className={s.error} id={`err-tipo-${f.clave}`}>
                        {errTipo}
                      </p>
                    )}
                  </div>

                  <div className={s.filaInferior}>
                    <div className={`${s.campo} ${s.campoCantidad}`}>
                      <label htmlFor={`cantidad-${f.clave}`}>Cantidad</label>
                      <div className={s.conUnidad}>
                        <input
                          id={`cantidad-${f.clave}`}
                          inputMode="numeric"
                          autoComplete="off"
                          value={f.cantidad}
                          placeholder="0"
                          aria-invalid={!!errCant}
                          aria-describedby={errCant ? `err-cant-${f.clave}` : undefined}
                          onChange={(e) =>
                            actualizarFila(f.clave, { cantidad: e.target.value.replace(/[^\d]/g, "").slice(0, 7) })
                          }
                        />
                        <span className={s.unidad}>{tipo ? (tipo.unidad === "pieza" ? "pzas" : tipo.unidad) : ""}</span>
                      </div>
                      {errCant && (
                        <p className={s.error} id={`err-cant-${f.clave}`}>
                          {errCant}
                        </p>
                      )}
                    </div>

                    {Object.entries(vars).map(([nombre, valores]) => (
                      <div key={nombre} className={s.campo}>
                        <label htmlFor={`var-${f.clave}-${nombre}`}>{nombre[0].toUpperCase() + nombre.slice(1)}</label>
                        <select
                          id={`var-${f.clave}-${nombre}`}
                          value={f.variante[nombre] ?? ""}
                          onChange={(e) => {
                            const v = { ...f.variante };
                            if (e.target.value) v[nombre] = e.target.value;
                            else delete v[nombre];
                            actualizarFila(f.clave, { variante: v, proveedorFijo: null });
                          }}
                        >
                          <option value="">Cualquiera</option>
                          {valores.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}

                    {filas.length > 1 && (
                      <button
                        type="button"
                        className={s.quitar}
                        aria-label={`Quitar producto ${i + 1}`}
                        onClick={() => setFilas((fs) => fs.filter((x) => x.clave !== f.clave))}
                      >
                        <Quitar />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {errores.lista && <p className={s.error}>{errores.lista}</p>}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setFilas((fs) => [...fs, filaVacia()])}
            disabled={filas.length >= 30}
          >
            <Mas className={s.icono} /> Agregar producto
          </button>
        </fieldset>

        <fieldset className={s.bloque}>
          <legend className={s.leyenda}>A dónde te lo envían</legend>
          <div className={s.campo}>
            <label htmlFor={idEstado}>Estado</label>
            <select
              id={idEstado}
              value={estado}
              aria-invalid={!!errores.estado}
              aria-describedby={errores.estado ? "err-estado" : undefined}
              onChange={(e) => setEstado(e.target.value)}
            >
              <option value="">Elige tu estado…</option>
              {opciones.estados.map((e) => (
                <option key={e.clave} value={e.clave}>
                  {e.nombre}
                </option>
              ))}
            </select>
            {errores.estado && (
              <p className={s.error} id="err-estado">
                {errores.estado}
              </p>
            )}
          </div>
        </fieldset>

        <fieldset className={s.bloque}>
          <legend className={s.leyenda}>Qué pesa más para ti</legend>
          <div className={s.segmentos} role="radiogroup" aria-label="Prioridad">
            {PRIORIDADES.map((p) => (
              <label key={p.id} className={s.segmento} data-activo={prioridad === p.id || undefined}>
                <input
                  type="radio"
                  name="prioridad"
                  value={p.id}
                  checked={prioridad === p.id}
                  onChange={() => setPrioridad(p.id)}
                />
                {p.nombre}
              </label>
            ))}
          </div>
          <p className={s.ayuda}>{PRIORIDADES.find((p) => p.id === prioridad)!.ayuda}</p>
          <label className={s.casilla}>
            <input type="checkbox" checked={permitirExtra} onChange={(e) => setPermitirExtra(e.target.checked)} />
            <span>
              Sugerir piezas extra si así sale más barato
              <small>Por ejemplo, 48 velas a precio de mayoreo pueden costar menos que 40.</small>
            </span>
          </label>
        </fieldset>

        <div className={s.acciones}>
          <button type="submit" className="btn btn-primary" disabled={cargando}>
            {cargando ? "Calculando…" : "Armar mi surtido"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={cargarEjemplo} disabled={cargando}>
            Probar con un ejemplo
          </button>
        </div>
      </form>

      <section
        ref={resultadosRef}
        className={s.resultados}
        aria-label="Resultado del surtido"
        aria-busy={cargando}
        data-cargando={cargando || undefined}
      >
        {errorServidor && (
          <div className={s.avisoError} role="alert">
            <Alerta className={s.icono} />
            <p>{errorServidor}</p>
          </div>
        )}
        {!resultado && !errorServidor && <Vacio />}
        {resultado && (
          <Resultado
            r={resultado}
            nombreEstado={nombreEstado}
            nombreTipo={(id) => tipos.get(id)?.nombre ?? id}
            hayFijos={hayFijos}
            onCambiar={cambiarProveedor}
            onSoltar={soltarFijos}
            cargando={cargando}
          />
        )}
      </section>
    </div>
  );
}

function Vacio() {
  return (
    <div className={s.vacio}>
      <h2>Tu surtido aparecerá aquí</h2>
      <p>
        Verás qué proveedor conviene para cada producto, cuánto pagas con envío e IVA, y cuánto ahorras
        frente a comprar todo con uno solo.
      </p>
      <ul>
        <li>Solo proveedores verificados que envían a tu estado.</li>
        <li>Un envío por proveedor: juntar productos con uno puede salir más barato.</li>
        <li>Cada elección viene con su porqué.</li>
      </ul>
    </div>
  );
}

function Resultado({
  r,
  nombreEstado,
  nombreTipo,
  hayFijos,
  onCambiar,
  onSoltar,
  cargando,
}: {
  r: ResultadoSurtido;
  nombreEstado: (c: string) => string;
  nombreTipo: (id: string) => string;
  hayFijos: boolean;
  onCambiar: (renglon: number, proveedorId: string) => void;
  onSoltar: () => void;
  cargando: boolean;
}) {
  const diasMin = Math.max(0, ...r.grupos.map((g) => g.envio.diasMin));
  const diasMax = Math.max(0, ...r.grupos.map((g) => g.envio.diasMax));
  const paquetes = r.grupos.length;

  if (r.grupos.length === 0) {
    return (
      <div className={s.resumen}>
        <h2>No encontramos proveedores para tu lista</h2>
        <SinProveedor r={r} nombreTipo={nombreTipo} />
      </div>
    );
  }

  return (
    <div className={s.resultadoAnimado} key={r.estadoDestino + r.config.prioridad}>
      <div className={s.resumen} aria-live="polite">
        <p className={s.resumenEtiqueta}>Total con envío e IVA a {nombreEstado(r.estadoDestino)}</p>
        <p className={`num ${s.total}`}>{pesos(r.totales.total)}</p>
        <dl className={s.desglose}>
          <div>
            <dt>Productos</dt>
            <dd className="num">{pesos(r.totales.productos)}</dd>
          </div>
          <div>
            <dt>Envíos ({paquetes})</dt>
            <dd className="num">{pesos(r.totales.envio)}</dd>
          </div>
          <div>
            <dt>IVA (16 %)</dt>
            <dd className="num">{pesos(r.totales.iva)}</dd>
          </div>
        </dl>
        <Ahorro r={r} />
        <p className={s.meta}>
          <Camion className={s.icono} />
          {paquetes === 1 ? "1 proveedor, 1 paquete" : `${paquetes} proveedores, ${paquetes} paquetes`} · llega en{" "}
          {diasMin}–{diasMax} días hábiles
        </p>
        {hayFijos && (
          <button type="button" className={`btn btn-ghost btn-sm ${s.soltar}`} onClick={onSoltar} disabled={cargando}>
            Volver a la recomendación
          </button>
        )}
      </div>

      <SinProveedor r={r} nombreTipo={nombreTipo} />

      <ol className={s.grupos}>
        {r.grupos.map((g) => (
          <Grupo key={g.proveedorId} g={g} r={r} nombreEstado={nombreEstado} onCambiar={onCambiar} cargando={cargando} />
        ))}
      </ol>

      <p className={s.notaFinal}>
        Envíos simulados con la tabla de tarifas de Provana. El carrito y el pago llegan en el siguiente
        bloque.
      </p>
    </div>
  );
}

function Ahorro({ r }: { r: ResultadoSurtido }) {
  if (!r.referencia || !r.ahorro) return null;
  const ref = r.referencia;
  const contra =
    ref.tipo === "un-proveedor"
      ? `comprar todo con ${ref.proveedores[0]}`
      : `la combinación con menos proveedores (${ref.proveedores.join(" y ")})`;
  if (r.ahorro.centavos > 0) {
    return (
      <p className={s.ahorro}>
        Ahorras <strong className="num">{pesos(r.ahorro.centavos)}</strong> ({r.ahorro.porcentaje.toLocaleString("es-MX")} %)
        frente a {contra}, que costaría <span className="num">{pesos(ref.total)}</span>.
      </p>
    );
  }
  if (r.ahorro.centavos < 0) {
    return (
      <p className={s.ahorroNeutro}>
        Pagas <span className="num">{pesos(-r.ahorro.centavos)}</span> más que {contra}, a cambio de proveedores con
        más confianza.
      </p>
    );
  }
  return <p className={s.ahorroNeutro}>Comprar con {ref.proveedores.join(" y ")} ya es la mejor opción.</p>;
}

function SinProveedor({ r, nombreTipo }: { r: ResultadoSurtido; nombreTipo: (id: string) => string }) {
  if (r.sinProveedor.length === 0) return null;
  return (
    <div className={s.avisoError} role="status">
      <Alerta className={s.icono} />
      <div>
        <p>
          <strong>
            {r.sinProveedor.length === 1 ? "Un producto se quedó sin proveedor" : `${r.sinProveedor.length} productos se quedaron sin proveedor`}
          </strong>
        </p>
        <ul>
          {r.sinProveedor.map((x) => (
            <li key={x.renglon}>
              <strong>{nombreTipo(x.tipoId)}:</strong> {x.motivo}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Grupo({
  g,
  r,
  nombreEstado,
  onCambiar,
  cargando,
}: {
  g: GrupoProveedor;
  r: ResultadoSurtido;
  nombreEstado: (c: string) => string;
  onCambiar: (renglon: number, proveedorId: string) => void;
  cargando: boolean;
}) {
  const zona = { local: "Envío local", regional: "Envío regional", nacional: "Envío nacional" }[g.envio.zona];
  return (
    <li className={s.grupo}>
      <header className={s.grupoCabecera}>
        <div>
          <h3>{g.proveedorNombre}</h3>
          <p className={s.grupoMeta}>
            Desde {nombreEstado(g.estadoOrigen)} · confianza <span className="num">{g.confianza}</span>/100
          </p>
        </div>
        <div className={s.sellos}>
          <span className="sello sello-verificado">
            <Escudo /> Verificado
          </span>
          <span className="sello sello-mx">
            <Bandera /> Negocio mexicano
          </span>
        </div>
      </header>

      <ul className={s.lineas}>
        {g.lineas.map((l) => {
          const exp = r.explicaciones.find((e) => e.renglon === l.renglon);
          const alts = r.alternativas[l.renglon] ?? [];
          const variante = l.variante ? Object.values(l.variante).join(", ") : null;
          return (
            <li key={l.renglon} className={s.linea}>
              <div className={s.lineaPrincipal}>
                <div>
                  <p className={s.lineaNombre}>
                    {l.nombre}
                    {variante && <span className={s.variante}> · {variante}</span>}
                  </p>
                  <p className={s.lineaDetalle}>
                    <span className="num">{unidades(l.cantidad, l.unidad)}</span> ×{" "}
                    <span className="num">{pesos(l.precioUnitario)}</span>
                    {l.escalonAplicado ? ` · mayoreo desde ${l.escalonAplicado}` : " · menudeo"}
                    {!g.cobraIva && " · no cobra IVA"}
                  </p>
                </div>
                <p className={`num ${s.lineaSubtotal}`}>{pesos(l.subtotal)}</p>
              </div>
              {exp && <p className={s.porque}>{exp.texto}</p>}
              {exp?.avisos.map((a) => (
                <p key={a} className={s.avisoLinea}>
                  <Alerta className={s.icono} />
                  {a}
                </p>
              ))}
              {alts.length > 1 && (
                <div className={s.cambiar}>
                  <label htmlFor={`alt-${l.renglon}`}>Comprar con otro proveedor</label>
                  <select
                    id={`alt-${l.renglon}`}
                    value={g.proveedorId}
                    disabled={cargando}
                    onChange={(e) => onCambiar(l.renglon, e.target.value)}
                  >
                    {alts.map((a) => (
                      <option key={a.proveedorId} value={a.proveedorId}>
                        {a.proveedorNombre} · total {pesos(a.totalSiSeElige)}
                        {a.elegido ? " (actual)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <dl className={s.grupoTotales}>
        <div>
          <dt>
            {zona}
            {g.envio.zonaExtendida ? " (zona extendida)" : ""} · {g.envio.kgCobrables} kg · {g.envio.diasMin}–
            {g.envio.diasMax} días
          </dt>
          <dd className="num">{pesos(g.envio.costo)}</dd>
        </div>
        <div>
          <dt>IVA</dt>
          <dd className="num">{pesos(g.ivaProductos + g.envio.iva)}</dd>
        </div>
        <div className={s.grupoTotal}>
          <dt>Pagas a {g.proveedorNombre}</dt>
          <dd className="num">{pesos(g.total)}</dd>
        </div>
      </dl>
    </li>
  );
}
