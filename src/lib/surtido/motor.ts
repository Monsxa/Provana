/**
 * Motor del Surtido inteligente.
 *
 * Dada una lista de renglones (tipo de producto + cantidad) y un estado de destino,
 * elige qué proveedor surte cada renglón para minimizar el costo efectivo:
 *
 *   costo_efectivo = Σ_proveedor (base + riesgo)
 *   base   = productos + envío (con o sin IVA según config.compararConIva)
 *   riesgo = base × p × (100 − confianza) / 100      (solo para decidir, nunca se cobra)
 *
 * El envío se paga una vez por proveedor (un paquete), así que juntar renglones
 * con el mismo proveedor puede salir más barato.
 *
 * La especificación completa está en docs/surtido-inteligente.md.
 */
import { cotizarEnvio, kgCobrables, pesoVolumetricoKg } from "./envio";
import { pesos, unidades, normalizar } from "./formato";
import { calcularIva, elegirCantidad, type CantidadElegida } from "./precios";
import type {
  AlternativaRenglon,
  Catalogo,
  ConfigSurtido,
  Explicacion,
  GrupoProveedor,
  LineaElegida,
  Metodo,
  Oferta,
  ProveedorSurtido,
  Referencia,
  Renglon,
  RenglonSinProveedor,
  ResultadoSurtido,
  Totales,
} from "./tipos";

/** Límite de combinaciones para probar todas una por una. */
export const LIMITE_EXHAUSTIVO = 20_000;
/** Límite de proveedores para probar todos los subconjuntos (2^n). */
export const LIMITE_SUBCONJUNTOS = 14;

interface Opcion {
  renglon: number;
  oferta: Oferta;
  proveedor: ProveedorSurtido;
  eleccion: CantidadElegida;
  pesoRealKg: number;
  pesoVolKg: number;
}

type Asignacion = Opcion[];

interface Contexto {
  catalogo: Catalogo;
  config: ConfigSurtido;
  destino: string;
  /** Peso del riesgo para la prioridad elegida. */
  p: number;
}

interface Evaluacion {
  asignacion: Asignacion;
  grupos: GrupoProveedor[];
  totales: Totales;
  numProveedores: number;
  confianzaPromedio: number;
  diasMax: number;
}

/* ------------------------------------------------------------------ */
/* Candidatos                                                          */
/* ------------------------------------------------------------------ */

function coincideVariante(oferta: Oferta, variante: Renglon["variante"]): boolean {
  if (!variante) return true;
  const ov = oferta.variante ?? {};
  return Object.entries(variante).every(([k, v]) => {
    const encontrado = Object.entries(ov).find(([k2]) => normalizar(k2) === normalizar(k));
    return encontrado !== undefined && normalizar(encontrado[1]) === normalizar(v);
  });
}

function nombreEstado(ctx: Contexto, clave: string): string {
  return ctx.catalogo.estados.find((e) => e.clave === clave)?.nombre ?? clave;
}

/**
 * Construye las opciones de cada renglón aplicando los filtros en orden.
 * Si un renglón se queda sin opciones, guarda el motivo del primer filtro que lo vació.
 */
function construirOpciones(
  renglones: Renglon[],
  ctx: Contexto,
  respetarFijos: boolean,
): { opciones: Opcion[][]; sinProveedor: RenglonSinProveedor[] } {
  const { catalogo, config, destino } = ctx;
  const provPorId = new Map(catalogo.proveedores.map((p) => [p.id, p]));
  const opciones: Opcion[][] = [];
  const sinProveedor: RenglonSinProveedor[] = [];

  renglones.forEach((r, i) => {
    const sinOpcion = (motivo: string) => {
      sinProveedor.push({ renglon: i, tipoId: r.tipoId, cantidad: r.cantidad, motivo });
      opciones.push([]);
    };

    let lista = catalogo.ofertas.filter((o) => o.tipoId === r.tipoId);
    if (lista.length === 0) return sinOpcion("Todavía no hay productos de este tipo en Provana.");

    lista = lista.filter((o) => coincideVariante(o, r.variante));
    if (lista.length === 0) return sinOpcion("Ningún proveedor ofrece esa variante.");

    lista = lista.filter((o) => o.activo && provPorId.get(o.proveedorId)?.verificado);
    if (lista.length === 0)
      return sinOpcion("No hay proveedores verificados con este producto activo.");

    lista = lista.filter((o) => provPorId.get(o.proveedorId)!.enviaA.includes(destino));
    if (lista.length === 0)
      return sinOpcion(`Ningún proveedor de este producto envía a ${nombreEstado(ctx, destino)}.`);

    lista = lista.filter((o) => provPorId.get(o.proveedorId)!.confianza >= config.confianzaMinima);
    if (lista.length === 0)
      return sinOpcion(
        `Los proveedores que lo venden tienen confianza menor a ${config.confianzaMinima}/100.`,
      );

    const conCantidad = lista
      .map((o) => ({ o, e: elegirCantidad(o, r.cantidad, config.permitirExtra) }))
      .filter((x): x is { o: Oferta; e: CantidadElegida } => x.e !== null);
    if (conCantidad.length === 0)
      return sinOpcion(
        `Ningún proveedor tiene existencias para ${unidades(r.cantidad, lista[0].unidad)}.`,
      );

    let candidatas: Opcion[] = conCantidad.map(({ o, e }) => ({
      renglon: i,
      oferta: o,
      proveedor: provPorId.get(o.proveedorId)!,
      eleccion: e,
      pesoRealKg: e.cantidad * o.pesoKg,
      pesoVolKg: e.cantidad * pesoVolumetricoKg(o.medidas, catalogo.tarifas.divisorVolumetrico),
    }));

    candidatas = candidatas.filter((op) => {
      if (op.oferta.maxDiasTransito == null) return true;
      const c = cotizarEnvio(op.proveedor.estado, destino, 1, catalogo.tarifas, catalogo.estados);
      return c.diasMax <= op.oferta.maxDiasTransito;
    });
    if (candidatas.length === 0)
      return sinOpcion(
        `Es perecedero y ninguna opción de envío llega a tiempo a ${nombreEstado(ctx, destino)}.`,
      );

    if (respetarFijos && r.proveedorFijo) {
      candidatas = candidatas.filter((op) => op.proveedor.id === r.proveedorFijo);
      if (candidatas.length === 0)
        return sinOpcion("El proveedor elegido no puede surtir este renglón.");
    }

    // Una sola opción por proveedor: la más barata por sí sola.
    const porProveedor = new Map<string, Opcion>();
    for (const op of candidatas) {
      const actual = porProveedor.get(op.proveedor.id);
      if (!actual || costoSolo(op, ctx) < costoSolo(actual, ctx)) {
        porProveedor.set(op.proveedor.id, op);
      }
    }
    opciones.push([...porProveedor.values()]);
  });

  return { opciones, sinProveedor };
}

/* ------------------------------------------------------------------ */
/* Evaluación de una asignación                                        */
/* ------------------------------------------------------------------ */

function multiplicadorRiesgo(p: number, confianza: number): number {
  return 1 + (p * (100 - confianza)) / 100;
}

function evaluar(asignacion: Asignacion, ctx: Contexto): Evaluacion {
  const { config, catalogo, destino, p } = ctx;
  const orden: string[] = [];
  const porProveedor = new Map<string, Opcion[]>();
  for (const op of asignacion) {
    if (!porProveedor.has(op.proveedor.id)) {
      porProveedor.set(op.proveedor.id, []);
      orden.push(op.proveedor.id);
    }
    porProveedor.get(op.proveedor.id)!.push(op);
  }

  const grupos: GrupoProveedor[] = [];
  const totales: Totales = { productos: 0, envio: 0, iva: 0, sinIva: 0, total: 0, base: 0, efectivo: 0 };
  let sumaConfianza = 0;
  let diasMax = 0;

  for (const id of orden) {
    const ops = porProveedor.get(id)!;
    const prov = ops[0].proveedor;
    const productos = ops.reduce((s, o) => s + o.eleccion.subtotal, 0);
    const ivaProductos = prov.cobraIva ? calcularIva(productos, config.tasaIva) : 0;
    const kg = kgCobrables(
      ops.reduce((s, o) => s + o.pesoRealKg, 0),
      ops.reduce((s, o) => s + o.pesoVolKg, 0),
    );
    const cot = cotizarEnvio(prov.estado, destino, kg, catalogo.tarifas, catalogo.estados);
    const ivaEnvio = calcularIva(cot.costo, config.tasaIva);
    const totalSinIva = productos + cot.costo;
    const total = totalSinIva + ivaProductos + ivaEnvio;
    const base = config.compararConIva ? total : totalSinIva;
    const riesgo = Math.round((base * p * (100 - prov.confianza)) / 100);

    const lineas: LineaElegida[] = ops.map((o) => ({
      renglon: o.renglon,
      tipoId: o.oferta.tipoId,
      productoId: o.oferta.productoId,
      nombre: o.oferta.nombre,
      unidad: o.oferta.unidad ?? "pieza",
      variante: o.oferta.variante ?? null,
      cantidadPedida: pedidaDe(o),
      cantidad: o.eleccion.cantidad,
      ajuste: o.eleccion.ajuste,
      precioUnitario: o.eleccion.precioUnitario,
      escalonAplicado: o.eleccion.escalonAplicado,
      subtotal: o.eleccion.subtotal,
      ahorroPorExtra: o.eleccion.ahorroPorExtra,
    }));

    grupos.push({
      proveedorId: prov.id,
      proveedorNombre: prov.nombre,
      estadoOrigen: prov.estado,
      confianza: prov.confianza,
      cobraIva: prov.cobraIva,
      lineas,
      productos,
      ivaProductos,
      envio: {
        zona: cot.zona,
        zonaExtendida: cot.zonaExtendida,
        kgCobrables: kg,
        costo: cot.costo,
        iva: ivaEnvio,
        diasMin: cot.diasMin + prov.diasPreparacion,
        diasMax: cot.diasMax + prov.diasPreparacion,
      },
      totalSinIva,
      total,
      riesgo,
    });

    totales.productos += productos;
    totales.envio += cot.costo;
    totales.iva += ivaProductos + ivaEnvio;
    totales.sinIva += totalSinIva;
    totales.total += total;
    totales.base += base;
    totales.efectivo += base + riesgo;
    sumaConfianza += prov.confianza;
    diasMax = Math.max(diasMax, cot.diasMax + prov.diasPreparacion);
  }

  return {
    asignacion,
    grupos,
    totales,
    numProveedores: orden.length,
    confianzaPromedio: orden.length ? sumaConfianza / orden.length : 0,
    diasMax,
  };
}

/** Cantidad que pidió el usuario para la opción (se guarda en el renglón original). */
const pedidas = new WeakMap<Opcion, number>();
function pedidaDe(o: Opcion): number {
  return pedidas.get(o) ?? o.eleccion.cantidad;
}

/** ¿`a` es mejor que `b`? Menor costo efectivo; en empate, menos proveedores, más confianza, llega antes. */
function esMejor(a: Evaluacion, b: Evaluacion | null): boolean {
  if (!b) return true;
  if (a.totales.efectivo !== b.totales.efectivo) return a.totales.efectivo < b.totales.efectivo;
  if (a.numProveedores !== b.numProveedores) return a.numProveedores < b.numProveedores;
  if (a.confianzaPromedio !== b.confianzaPromedio) return a.confianzaPromedio > b.confianzaPromedio;
  return a.diasMax < b.diasMax;
}

/* ------------------------------------------------------------------ */
/* Costos aproximados para guiar la búsqueda                           */
/* ------------------------------------------------------------------ */

function baseProductos(op: Opcion, ctx: Contexto): number {
  const iva = ctx.config.compararConIva && op.proveedor.cobraIva ? ctx.config.tasaIva : 0;
  return op.eleccion.subtotal * (1 + iva);
}

/** Costo de la opción si viajara sola en su propio paquete (con riesgo). */
function costoSolo(op: Opcion, ctx: Contexto): number {
  const kg = kgCobrables(op.pesoRealKg, op.pesoVolKg);
  const cot = cotizarEnvio(op.proveedor.estado, ctx.destino, kg, ctx.catalogo.tarifas, ctx.catalogo.estados);
  const ivaEnvio = ctx.config.compararConIva ? 1 + ctx.config.tasaIva : 1;
  return (
    multiplicadorRiesgo(ctx.p, op.proveedor.confianza) *
    (baseProductos(op, ctx) + cot.costo * ivaEnvio)
  );
}

/** Costo marginal de agregar la opción a un paquete que ya existe (solo el costo por kg). */
function costoMarginal(op: Opcion, ctx: Contexto): number {
  const zona = cotizarEnvio(op.proveedor.estado, ctx.destino, 1, ctx.catalogo.tarifas, ctx.catalogo.estados).zona;
  const porKg = ctx.catalogo.tarifas.zonas[zona].porKg;
  const ivaEnvio = ctx.config.compararConIva ? 1 + ctx.config.tasaIva : 1;
  return (
    multiplicadorRiesgo(ctx.p, op.proveedor.confianza) *
    (baseProductos(op, ctx) + porKg * Math.max(op.pesoRealKg, op.pesoVolKg) * ivaEnvio)
  );
}

/* ------------------------------------------------------------------ */
/* Métodos de búsqueda                                                 */
/* ------------------------------------------------------------------ */

/** Prueba todas las combinaciones. Exacto. */
function buscarExhaustivo(opciones: Opcion[][], ctx: Contexto): Evaluacion {
  let mejor: Evaluacion | null = null;
  const actual: Asignacion = [];
  const recorrer = (i: number) => {
    if (i === opciones.length) {
      const ev = evaluar([...actual], ctx);
      if (esMejor(ev, mejor)) mejor = ev;
      return;
    }
    for (const op of opciones[i]) {
      actual.push(op);
      recorrer(i + 1);
      actual.pop();
    }
  };
  recorrer(0);
  return mejor!;
}

/** Dentro de un conjunto de proveedores, cada renglón va con el de menor costo marginal. */
function asignarEnConjunto(
  opciones: Opcion[][],
  conjunto: Set<string>,
  ctx: Contexto,
): Asignacion | null {
  const asig: Asignacion = [];
  for (const ops of opciones) {
    let mejor: Opcion | null = null;
    for (const op of ops) {
      if (!conjunto.has(op.proveedor.id)) continue;
      if (!mejor || costoMarginal(op, ctx) < costoMarginal(mejor, ctx)) mejor = op;
    }
    if (!mejor) return null;
    asig.push(mejor);
  }
  return asig;
}

/**
 * Mejora una asignación con movimientos pequeños hasta que ya no mejora:
 * 1. Cambiar el proveedor de un renglón.
 * 2. Cerrar un proveedor: mover todos sus renglones a otros.
 */
function busquedaLocal(inicial: Asignacion, opciones: Opcion[][], ctx: Contexto): Evaluacion {
  let actual = evaluar(inicial, ctx);
  for (let vuelta = 0; vuelta < 100; vuelta++) {
    let mejoro = false;

    for (let i = 0; i < opciones.length; i++) {
      for (const op of opciones[i]) {
        if (op === actual.asignacion[i]) continue;
        const cand = [...actual.asignacion];
        cand[i] = op;
        const ev = evaluar(cand, ctx);
        if (esMejor(ev, actual)) {
          actual = ev;
          mejoro = true;
        }
      }
    }

    const abiertos = new Set(actual.asignacion.map((o) => o.proveedor.id));
    for (const cerrar of abiertos) {
      const resto = new Set([...abiertos].filter((id) => id !== cerrar));
      const cand: Asignacion = [];
      let posible = true;
      for (let i = 0; i < opciones.length; i++) {
        const op = actual.asignacion[i];
        if (op.proveedor.id !== cerrar) {
          cand.push(op);
          continue;
        }
        const alternativas = opciones[i].filter((o) => o.proveedor.id !== cerrar);
        if (alternativas.length === 0) {
          posible = false;
          break;
        }
        const enAbiertos = alternativas.filter((o) => resto.has(o.proveedor.id));
        const pool = enAbiertos.length ? enAbiertos : alternativas;
        cand.push(pool.reduce((a, b) => (costoMarginal(b, ctx) < costoMarginal(a, ctx) ? b : a)));
      }
      if (!posible) continue;
      const ev = evaluar(cand, ctx);
      if (esMejor(ev, actual)) {
        actual = ev;
        mejoro = true;
      }
    }

    if (!mejoro) break;
  }
  return actual;
}

/** Prueba todos los subconjuntos de proveedores (2^n) y pule el mejor con búsqueda local. */
function buscarPorSubconjuntos(opciones: Opcion[][], proveedores: string[], ctx: Contexto): Evaluacion {
  let mejor: Evaluacion | null = null;
  const n = proveedores.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const conjunto = new Set<string>();
    for (let b = 0; b < n; b++) if (mask & (1 << b)) conjunto.add(proveedores[b]);
    const asig = asignarEnConjunto(opciones, conjunto, ctx);
    if (!asig) continue;
    const ev = evaluar(asig, ctx);
    if (esMejor(ev, mejor)) mejor = ev;
  }
  return busquedaLocal(mejor!.asignacion, opciones, ctx);
}

/** Varios puntos de partida + búsqueda local. Para catálogos grandes. */
function buscarHeuristico(opciones: Opcion[][], proveedores: string[], ctx: Contexto): Evaluacion {
  const inicios: Asignacion[] = [];
  inicios.push(
    opciones.map((ops) => ops.reduce((a, b) => (costoSolo(b, ctx) < costoSolo(a, ctx) ? b : a))),
  );
  inicios.push(
    opciones.map((ops) => ops.reduce((a, b) => (costoMarginal(b, ctx) < costoMarginal(a, ctx) ? b : a))),
  );
  // Consolidar con cada proveedor: todo lo que pueda surtir va con él.
  for (const id of proveedores) {
    inicios.push(
      opciones.map(
        (ops) =>
          ops.find((o) => o.proveedor.id === id) ??
          ops.reduce((a, b) => (costoMarginal(b, ctx) < costoMarginal(a, ctx) ? b : a)),
      ),
    );
  }
  let mejor: Evaluacion | null = null;
  for (const ini of inicios) {
    const ev = busquedaLocal(ini, opciones, ctx);
    if (esMejor(ev, mejor)) mejor = ev;
  }
  return mejor!;
}

function proveedoresDe(opciones: Opcion[][]): string[] {
  return [...new Set(opciones.flat().map((o) => o.proveedor.id))];
}

function optimizar(opciones: Opcion[][], ctx: Contexto): { ev: Evaluacion; metodo: Metodo } {
  const proveedores = proveedoresDe(opciones);
  const combinaciones = opciones.reduce((n, ops) => n * ops.length, 1);
  const forzado = ctx.config.forzarMetodo;

  if (forzado === "exhaustivo" || (!forzado && combinaciones <= LIMITE_EXHAUSTIVO)) {
    return { ev: buscarExhaustivo(opciones, ctx), metodo: "exhaustivo" };
  }
  if (forzado === "subconjuntos" || (!forzado && proveedores.length <= LIMITE_SUBCONJUNTOS)) {
    return { ev: buscarPorSubconjuntos(opciones, proveedores, ctx), metodo: "subconjuntos" };
  }
  if (!forzado) {
    // Poda: solo proveedores que estén entre los 3 mejores de algún renglón.
    const utiles = new Set<string>();
    for (const ops of opciones) {
      [...ops]
        .sort((a, b) => costoSolo(a, ctx) - costoSolo(b, ctx))
        .slice(0, 3)
        .forEach((o) => utiles.add(o.proveedor.id));
    }
    if (utiles.size <= LIMITE_SUBCONJUNTOS) {
      const podadas = opciones.map((ops) => ops.filter((o) => utiles.has(o.proveedor.id)));
      const ev = buscarPorSubconjuntos(podadas, [...utiles], ctx);
      const pulida = busquedaLocal(ev.asignacion, opciones, ctx);
      const heur = buscarHeuristico(opciones, proveedores, ctx);
      return { ev: esMejor(heur, pulida) ? heur : pulida, metodo: "subconjuntos" };
    }
  }
  return { ev: buscarHeuristico(opciones, proveedores, ctx), metodo: "heuristico" };
}

/* ------------------------------------------------------------------ */
/* Referencia "todo con uno"                                           */
/* ------------------------------------------------------------------ */

function combinaciones<T>(items: T[], k: number): T[][] {
  const res: T[][] = [];
  const actual: T[] = [];
  const rec = (inicio: number) => {
    if (actual.length === k) {
      res.push([...actual]);
      return;
    }
    for (let i = inicio; i < items.length; i++) {
      actual.push(items[i]);
      rec(i + 1);
      actual.pop();
    }
  };
  rec(0);
  return res;
}

/**
 * Compara contra comprar todo con UN proveedor (el más barato que tenga todo).
 * Si ninguno tiene todo, contra la combinación con el menor número de proveedores.
 * Usa dinero real (sin riesgo).
 */
function calcularReferencia(opciones: Opcion[][], ctx: Contexto): Evaluacion | null {
  if (opciones.length === 0) return null;
  const ctxSinRiesgo: Contexto = { ...ctx, p: 0 };
  let proveedores = proveedoresDe(opciones);
  // Limitar a los 25 que cubren más renglones.
  const cobertura = (id: string) => opciones.filter((ops) => ops.some((o) => o.proveedor.id === id)).length;
  proveedores = proveedores.sort((a, b) => cobertura(b) - cobertura(a)).slice(0, 25);

  for (let k = 1; k <= Math.min(4, proveedores.length); k++) {
    let mejor: Evaluacion | null = null;
    for (const combo of combinaciones(proveedores, k)) {
      const conjunto = new Set(combo);
      const asig = asignarEnConjunto(opciones, conjunto, ctxSinRiesgo);
      if (!asig) continue;
      const restringidas = opciones.map((ops) => ops.filter((o) => conjunto.has(o.proveedor.id)));
      const ev = k === 1 ? evaluar(asig, ctxSinRiesgo) : busquedaLocal(asig, restringidas, ctxSinRiesgo);
      if (!mejor || ev.totales.base < mejor.totales.base) mejor = ev;
    }
    if (mejor) return mejor;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Explicaciones                                                       */
/* ------------------------------------------------------------------ */

const NOMBRE_PRIORIDAD: Record<string, string> = {
  ahorro: "Ahorro",
  equilibrado: "Equilibrado",
  confianza: "Confianza",
};

function explicar(
  mejor: Evaluacion,
  opcionesLibres: Opcion[][],
  indices: number[],
  ctx: Contexto,
): { explicaciones: Explicacion[]; alternativas: Record<number, AlternativaRenglon[]> } {
  const explicaciones: Explicacion[] = [];
  const alternativas: Record<number, AlternativaRenglon[]> = {};

  indices.forEach((renglon, pos) => {
    const elegida = mejor.asignacion[pos];
    const grupo = mejor.grupos.find((g) => g.proveedorId === elegida.proveedor.id)!;
    const linea = grupo.lineas.find((l) => l.renglon === renglon)!;
    const unidad = elegida.oferta.unidad ?? "pieza";

    // Total si este renglón se comprara con cada proveedor posible (el resto igual).
    const evaluadas = opcionesLibres[pos].map((op) => {
      const cand = [...mejor.asignacion];
      cand[pos] = op;
      return { op, ev: op.proveedor.id === elegida.proveedor.id ? mejor : evaluar(cand, ctx) };
    });
    alternativas[renglon] = evaluadas
      .map(({ op, ev }) => ({
        proveedorId: op.proveedor.id,
        proveedorNombre: op.proveedor.nombre,
        confianza: op.proveedor.confianza,
        precioUnitario: op.eleccion.precioUnitario,
        cantidad: op.eleccion.cantidad,
        totalSiSeElige: ev.totales.total,
        elegido: op.proveedor.id === elegida.proveedor.id,
      }))
      .sort((a, b) => a.totalSiSeElige - b.totalSiSeElige);

    const otras = evaluadas.filter((x) => x.op.proveedor.id !== elegida.proveedor.id);
    const segunda = otras.length
      ? otras.reduce((a, b) => (b.ev.totales.base < a.ev.totales.base ? b : a))
      : null;

    const partes: string[] = [];
    const precio = `${pesos(linea.precioUnitario)} c/u + IVA`;
    partes.push(
      linea.escalonAplicado
        ? `${unidades(linea.cantidad, unidad)} a ${precio}: precio de mayoreo desde ${unidades(linea.escalonAplicado, unidad)}.`
        : `${unidades(linea.cantidad, unidad)} a ${precio} (precio de menudeo).`,
    );
    if (grupo.lineas.length > 1) {
      const otrasLineas = grupo.lineas.length - 1;
      partes.push(
        `Comparte un solo envío con ${otrasLineas} producto${otrasLineas > 1 ? "s" : ""} más de ${grupo.proveedorNombre}.`,
      );
    }
    let alternativa: Explicacion["alternativa"] = null;
    if (segunda) {
      const diferencia = segunda.ev.totales.base - mejor.totales.base;
      alternativa = {
        proveedorId: segunda.op.proveedor.id,
        proveedorNombre: segunda.op.proveedor.nombre,
        diferencia,
      };
      if (diferencia > 0) {
        partes.push(
          `Con ${segunda.op.proveedor.nombre} pagarías ${pesos(diferencia)} más en total, contando envío.`,
        );
      } else if (diferencia < 0) {
        partes.push(
          `${segunda.op.proveedor.nombre} saldría ${pesos(-diferencia)} más barato, pero tiene confianza ${segunda.op.proveedor.confianza}/100 contra ${elegida.proveedor.confianza}/100; con la prioridad "${NOMBRE_PRIORIDAD[ctx.config.prioridad]}" conviene ${elegida.proveedor.nombre}.`,
        );
      } else {
        partes.push(
          `Con ${segunda.op.proveedor.nombre} costaría lo mismo; elegimos ${elegida.proveedor.nombre} por usar menos proveedores o tener más confianza.`,
        );
      }
    } else {
      partes.push(`Es el único proveedor que puede surtir este producto a tu estado.`);
    }

    const avisos: string[] = [];
    if (linea.ajuste === "minimo") {
      avisos.push(
        `Pediste ${unidades(pedidaDe(elegida), unidad)}, pero ${grupo.proveedorNombre} vende mínimo ${unidades(elegida.oferta.pedidoMinimo, unidad)}.`,
      );
    }
    if (linea.ajuste === "extra") {
      avisos.push(
        `Te conviene pedir ${unidades(linea.cantidad, unidad)} en vez de ${unidades(pedidaDe(elegida), unidad)}: pagas ${pesos(linea.ahorroPorExtra)} menos (sin IVA) y te llevas más.`,
      );
    }
    if (elegida.proveedor.confianza < 75) {
      avisos.push(`Confianza ${elegida.proveedor.confianza}/100: revisa sus reseñas antes de comprar.`);
    }

    explicaciones.push({
      renglon,
      proveedorId: elegida.proveedor.id,
      texto: partes.join(" "),
      alternativa,
      avisos,
    });
  });

  return { explicaciones, alternativas };
}

/* ------------------------------------------------------------------ */
/* Función principal                                                   */
/* ------------------------------------------------------------------ */

export function resolverSurtido(
  renglones: Renglon[],
  estadoDestino: string,
  catalogo: Catalogo,
  config: ConfigSurtido,
): ResultadoSurtido {
  const ctx: Contexto = {
    catalogo,
    config,
    destino: estadoDestino,
    p: config.pesosRiesgo[config.prioridad] ?? 0,
  };

  const conFijos = construirOpciones(renglones, ctx, true);
  const libres = construirOpciones(renglones, ctx, false);

  // Guardar la cantidad pedida de cada opción para los textos.
  [conFijos.opciones, libres.opciones].forEach((tabla) =>
    tabla.forEach((ops, i) => ops.forEach((o) => pedidas.set(o, renglones[i].cantidad))),
  );

  const indices = renglones.map((_, i) => i).filter((i) => conFijos.opciones[i].length > 0);
  const opciones = indices.map((i) => conFijos.opciones[i]);
  const opcionesLibres = indices.map((i) => libres.opciones[i]);
  const { forzarMetodo: _omitido, ...configPublica } = config;
  void _omitido;

  if (opciones.length === 0) {
    return {
      estadoDestino,
      config: configPublica,
      metodo: "exhaustivo",
      grupos: [],
      totales: { productos: 0, envio: 0, iva: 0, sinIva: 0, total: 0, base: 0, efectivo: 0 },
      referencia: null,
      ahorro: null,
      explicaciones: [],
      alternativas: {},
      sinProveedor: conFijos.sinProveedor,
    };
  }

  const { ev: mejor, metodo } = optimizar(opciones, ctx);
  const ref = calcularReferencia(opcionesLibres, ctx);
  const referencia: Referencia | null = ref
    ? {
        tipo: ref.numProveedores === 1 ? "un-proveedor" : "menos-proveedores",
        proveedores: ref.grupos.map((g) => g.proveedorNombre),
        total: ref.totales.total,
        base: ref.totales.base,
      }
    : null;
  const ahorro = ref
    ? {
        centavos: ref.totales.base - mejor.totales.base,
        porcentaje:
          ref.totales.base > 0
            ? Math.round(((ref.totales.base - mejor.totales.base) / ref.totales.base) * 1000) / 10
            : 0,
      }
    : null;

  const { explicaciones, alternativas } = explicar(mejor, opcionesLibres, indices, ctx);

  return {
    estadoDestino,
    config: configPublica,
    metodo,
    grupos: mejor.grupos,
    totales: mejor.totales,
    referencia,
    ahorro,
    explicaciones,
    alternativas,
    sinProveedor: conFijos.sinProveedor,
  };
}
