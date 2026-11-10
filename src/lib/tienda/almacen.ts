"use client";
/**
 * Almacén de la tienda en MODO DEMOSTRACIÓN.
 * Guarda todo en el navegador (localStorage) detrás de funciones con nombre de negocio.
 * Cada acción revisa permisos con permisos.ts antes de cambiar algo.
 * Para pasar a Supabase se reemplaza este archivo por llamadas a la API con las mismas firmas.
 */
import { useSyncExternalStore } from "react";
import { categorias, estados, productos as productosSemilla, proveedores as proveedoresSemilla, tarifas, tiposProducto } from "@/lib/catalogo";
import { calcularConfianza, componentesConfianza } from "@/lib/surtido/confianza";
import type { DesgloseConfianza } from "@/lib/catalogo";
import { pesos, unidades } from "@/lib/surtido/formato";
import { validarEscalones } from "@/lib/surtido/precios";
import type { Catalogo } from "@/lib/surtido/tipos";
import { validarCsv, type FilaValida } from "./csv";
import { opcionesEnvio, type OpcionEnvio } from "./envios";
import { pagos, type DatosTarjeta } from "./pagos";
import { aplicar, debeLiberarse, guiaSimulada, liquidar, type Accion } from "./pedidos";
import { actorEn, exigirRol, SinPermiso } from "./permisos";
import type {
  Ajustes,
  Aviso,
  Cotizacion,
  Direccion,
  Disputa,
  EstadoTienda,
  LineaCarrito,
  MetodoPago,
  Pedido,
  ProductoTienda,
  ProveedorTienda,

  TipoAviso,
  Usuario,
} from "./tipos";

const CLAVE = "provana:tienda:v1";
export const CLAVE_DEMO = "provana123";
const TODAS_PREFERENCIAS: Record<TipoAviso, boolean> = {
  cuenta: true,
  pedido: true,
  pago: true,
  envio: true,
  entrega: true,
  mensaje: true,
  cotizacion: true,
  disputa: true,
  precio: true,
  verificacion: true,
};

export class ErrorTienda extends Error {}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

const id = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export async function hashClave(clave: string): Promise<string> {
  const datos = new TextEncoder().encode(`provana:${clave}`);
  const h = await crypto.subtle.digest("SHA-256", datos);
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, "0")).join("");
}

/* ------------------------------------------------------------------ */
/* Semilla                                                             */
/* ------------------------------------------------------------------ */

function semilla(hashDemo: string): EstadoTienda {
  const hoy = new Date().toISOString();
  const usuario = (email: string, nombre: string, rol: Usuario["rol"], extra: Partial<Usuario> = {}): Usuario => ({
    id: `u-${rol}`,
    email,
    nombre,
    rol,
    claveHash: hashDemo,
    correoVerificado: true,
    direcciones: [],
    creado: hoy,
    preferencias: { ...TODAS_PREFERENCIAS },
    ...extra,
  });
  return {
    version: 1,
    usuarios: [
      usuario("comprador@demo.provana.mx", "Monse Compradora", "comprador", {
        direcciones: [
          {
            id: "dir-1",
            alias: "Mi tienda",
            nombre: "Monse Compradora",
            calle: "Av. Chapultepec 120",
            colonia: "Americana",
            cp: "44160",
            ciudad: "Guadalajara",
            estado: "JAL",
            telefono: "3300000000",
          },
        ],
      }),
      usuario("proveedor@demo.provana.mx", "Lucía de Aromas del Valle", "proveedor", { proveedorId: "aromas-del-valle" }),
      usuario("admin@demo.provana.mx", "Administración Provana", "admin"),
      // Cada proveedor de ejemplo tiene su cuenta para poder atender sus pedidos en la demostración.
      ...proveedoresSemilla
        .filter((p) => p.id !== "aromas-del-valle")
        .map((p) => usuario(`${p.id}@demo.provana.mx`, `Equipo ${p.nombre}`, "proveedor", { id: `u-${p.id}`, proveedorId: p.id })),
    ],
    sesion: null,
    proveedores: proveedoresSemilla.map((p) => ({
      ...p,
      documentos:
        p.verificacion === "en_revision"
          ? [
              { tipo: "rfc", nombreArchivo: "constancia-rfc.pdf", subido: hoy },
              { tipo: "identificacion", nombreArchivo: "ine.jpg", subido: hoy },
              { tipo: "domicilio", nombreArchivo: "recibo-luz.pdf", subido: hoy },
              { tipo: "taller", nombreArchivo: "taller-1.jpg", subido: hoy },
            ]
          : [],
      condiciones: "Pedidos de lunes a viernes. Cambios por defecto de fábrica dentro de 7 días.",
    })),
    productos: productosSemilla.map((p) => ({ ...p, fotos: [] })),
    carritos: {},
    pedidos: [],
    resenas: [],
    disputas: [],
    mensajes: [],
    favoritos: {},
    listas: {},
    avisos: [],
    cotizaciones: [],
    cupones: [{ codigo: "BIENVENIDA10", proveedorId: "aromas-del-valle", porcentaje: 10, minimo: 100000, activo: true }],
    ajustes: {
      comision: 0.08,
      diasLiberacion: 5,
      confianzaMinima: 60,
      pesosRiesgo: { ahorro: 0, equilibrado: 0.1, confianza: 0.25 },
      planDestacado: { activo: false, precioMensual: 49900 },
    },
    diasAdelantados: 0,
    folio: 10000,
  };
}

/* ------------------------------------------------------------------ */
/* Estado y suscripción                                                */
/* ------------------------------------------------------------------ */

let estado: EstadoTienda | null = null;
const oyentes = new Set<() => void>();
let iniciando: Promise<void> | null = null;

function guardar(nuevo: EstadoTienda) {
  estado = nuevo;
  if (process.env.NODE_ENV === "test") (globalThis as { __provana?: unknown }).__provana = nuevo;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(nuevo));
  } catch {
    // Sin almacenamiento (modo privado): la demo funciona en memoria.
  }
  oyentes.forEach((o) => o());
}

export function iniciarTienda(): Promise<void> {
  if (estado) return Promise.resolve();
  iniciando ??= (async () => {
    let guardado: EstadoTienda | null = null;
    try {
      const t = localStorage.getItem(CLAVE);
      if (t) guardado = JSON.parse(t);
    } catch {
      guardado = null;
    }
    estado = guardado?.version === 1 ? guardado : semilla(await hashClave(CLAVE_DEMO));
    liberacionesAutomaticas();
    oyentes.forEach((o) => o());
  })();
  return iniciando;
}

export async function reiniciarDemo() {
  guardar(semilla(await hashClave(CLAVE_DEMO)));
}

function e(): EstadoTienda {
  if (!estado) throw new ErrorTienda("La tienda todavía está cargando.");
  return estado;
}

function cambiar(f: (s: EstadoTienda) => EstadoTienda | void) {
  const copia = structuredClone(e());
  const r = f(copia);
  guardar(r ?? copia);
}

/** Hook: estado completo de la tienda (null mientras carga). */
export function useTienda(): EstadoTienda | null {
  return useSyncExternalStore(
    (cb) => {
      oyentes.add(cb);
      void iniciarTienda();
      return () => oyentes.delete(cb);
    },
    () => estado,
    () => null,
  );
}

export function ahora(s: EstadoTienda = e()): Date {
  return new Date(Date.now() + s.diasAdelantados * 86_400_000);
}

/* ------------------------------------------------------------------ */
/* Lecturas derivadas                                                  */
/* ------------------------------------------------------------------ */

export const usuarioDe = (s: EstadoTienda) => s.usuarios.find((u) => u.id === s.sesion) ?? null;
const yo = () => usuarioDe(e());

export const proveedorVisible = (s: EstadoTienda, id: string) =>
  s.proveedores.find((p) => p.id === id && p.verificacion === "verificado") ?? null;

export const productosVisibles = (s: EstadoTienda) =>
  s.productos.filter((p) => p.estado === "activo" && proveedorVisible(s, p.proveedorId));

export function promedioPlataforma(s: EstadoTienda): number {
  const st = s.proveedores.map((p) => estadisticas(s, p.id));
  const n = st.reduce((a, x) => a + x.numResenas, 0);
  return n ? st.reduce((a, x) => a + x.sumaEstrellas, 0) / n : 4.5;
}

/** Estadísticas reales: las de los datos de ejemplo más lo que pasa en la demo (pedidos y reseñas). */
export function estadisticas(s: EstadoTienda, proveedorId: string) {
  const base = s.proveedores.find((p) => p.id === proveedorId)!.estadisticas;
  const pedidos = s.pedidos.filter((p) => p.proveedorId === proveedorId);
  const cerrados = pedidos.filter((p) => ["completado", "cancelado", "reembolsado"].includes(p.estado));
  const resenas = s.resenas.filter((r) => r.proveedorId === proveedorId && !r.oculta);
  const perdidas = s.disputas.filter(
    (d) => d.resolucion && d.resolucion !== "a_favor_proveedor" && pedidos.some((p) => p.id === d.pedidoId),
  ).length;
  return {
    sumaEstrellas: base.sumaEstrellas + resenas.reduce((a, r) => a + r.estrellas, 0),
    numResenas: base.numResenas + resenas.length,
    pedidosCerrados: base.pedidosCerrados + cerrados.length,
    pedidosCompletados: base.pedidosCompletados + cerrados.filter((p) => p.estado === "completado").length,
    disputasPerdidas: base.disputasPerdidas + perdidas,
    horasRespuesta: base.horasRespuesta,
    pedidosTotales: base.pedidosCerrados + pedidos.length,
  };
}

export function confianza(s: EstadoTienda, proveedorId: string): number {
  return calcularConfianza(estadisticas(s, proveedorId), promedioPlataforma(s));
}

/** Desglose de la confianza con datos vivos de la demo (misma fórmula que el surtido). */
export function desglose(s: EstadoTienda, proveedorId: string): DesgloseConfianza {
  const e = estadisticas(s, proveedorId);
  const c = componentesConfianza(e, promedioPlataforma(s));
  const pct = e.pedidosCerrados ? Math.round((e.pedidosCompletados / e.pedidosCerrados) * 100) : null;
  return {
    total: confianza(s, proveedorId),
    factores: [
      { clave: "calificacion", nombre: "Calificación", puntos: Math.round(50 * c.Q), maximo: 50, detalle: e.numResenas ? `${(e.sumaEstrellas / e.numResenas).toFixed(1)} ★ en ${e.numResenas} reseñas` : "Sin reseñas todavía" },
      { clave: "cumplimiento", nombre: "Pedidos completados", puntos: Math.round(30 * c.K), maximo: 30, detalle: pct === null ? "Sin pedidos todavía" : `${pct} % de ${e.pedidosCerrados.toLocaleString("es-MX")} pedidos` },
      { clave: "disputas", nombre: "Disputas", puntos: Math.round(10 * c.D), maximo: 10, detalle: e.disputasPerdidas === 0 ? "Ninguna perdida" : `${e.disputasPerdidas} perdidas` },
      { clave: "respuesta", nombre: "Tiempo de respuesta", puntos: Math.round(10 * c.R), maximo: 10, detalle: e.horasRespuesta === null ? "Sin datos" : `Responde en ~${e.horasRespuesta} h` },
    ],
  };
}

/** Catálogo para el motor del surtido con lo que hay hoy en la tienda (incluye productos nuevos). */
export function catalogoSurtido(s: EstadoTienda): Catalogo {
  return {
    estados,
    tarifas,
    proveedores: s.proveedores.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      estado: p.estado,
      verificado: p.verificacion === "verificado",
      cobraIva: p.cobraIva,
      enviaA: p.enviaA,
      confianza: confianza(s, p.id),
      diasPreparacion: p.diasPreparacion,
    })),
    ofertas: s.productos.map((p) => ({
      productoId: p.id,
      proveedorId: p.proveedorId,
      tipoId: p.tipoId,
      nombre: p.nombre,
      unidad: p.unidad,
      variante: p.variante,
      precioMenudeo: p.precioMenudeo,
      escalones: p.escalones,
      pedidoMinimo: p.pedidoMinimo,
      existencias: p.existencias,
      pesoKg: p.pesoKg,
      medidas: p.medidas,
      activo: p.estado === "activo",
      maxDiasTransito: p.maxDiasTransito,
    })),
  };
}

export const carritoDe = (s: EstadoTienda) => s.carritos[s.sesion ?? "anonimo"] ?? [];

/* ------------------------------------------------------------------ */
/* Avisos (correos simulados)                                          */
/* ------------------------------------------------------------------ */

function avisar(s: EstadoTienda, usuarioId: string | undefined, tipo: TipoAviso, asunto: string, cuerpo: string, enlace?: string) {
  if (!usuarioId) return;
  const u = s.usuarios.find((x) => x.id === usuarioId);
  if (!u || u.preferencias[tipo] === false) return;
  const aviso: Aviso = { id: id(), usuarioId, tipo, asunto, cuerpo, enlace, fecha: ahora(s).toISOString(), leido: false };
  s.avisos.unshift(aviso);
}

const duenoDe = (s: EstadoTienda, proveedorId: string) => s.usuarios.find((u) => u.proveedorId === proveedorId)?.id;
const admins = (s: EstadoTienda) => s.usuarios.filter((u) => u.rol === "admin").map((u) => u.id);

export function marcarAvisosLeidos() {
  const u = yo();
  if (!u) return;
  cambiar((s) => s.avisos.forEach((a) => a.usuarioId === u.id && (a.leido = true)));
}

export function guardarPreferencias(p: Record<TipoAviso, boolean>) {
  const u = yo();
  exigirRol(u, "comprador", "proveedor", "admin");
  cambiar((s) => {
    s.usuarios.find((x) => x.id === u.id)!.preferencias = p;
  });
}

/* ------------------------------------------------------------------ */
/* Cuentas                                                             */
/* ------------------------------------------------------------------ */

const emailValido = (x: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(x);

export async function registrar(datos: {
  nombre: string;
  email: string;
  clave: string;
  rol: "comprador" | "proveedor";
  negocio?: { nombre: string; rfc: string; estado: string; ciudad: string; diasPreparacion: number; enviaA: string[]; cobraIva: boolean; descripcion: string };
}): Promise<void> {
  await iniciarTienda();
  const email = datos.email.trim().toLowerCase();
  if (datos.nombre.trim().length < 2) throw new ErrorTienda("Escribe tu nombre.");
  if (!emailValido(email)) throw new ErrorTienda("Ese correo no parece válido.");
  if (datos.clave.length < 8) throw new ErrorTienda("La contraseña debe tener al menos 8 caracteres.");
  if (e().usuarios.some((u) => u.email === email)) throw new ErrorTienda("Ya existe una cuenta con ese correo. Inicia sesión.");
  const claveHash = await hashClave(datos.clave);
  const uid = id();
  let proveedorId: string | undefined;
  if (datos.rol === "proveedor") {
    const n = datos.negocio;
    if (!n || n.nombre.trim().length < 3) throw new ErrorTienda("Escribe el nombre de tu negocio.");
    if (!estados.some((x) => x.clave === n.estado)) throw new ErrorTienda("Elige el estado de tu negocio.");
    if (n.enviaA.length === 0) throw new ErrorTienda("Elige al menos un estado al que envías.");
    proveedorId = n.nombre
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (e().proveedores.some((p) => p.id === proveedorId)) proveedorId += `-${uid.slice(0, 4)}`;
  }
  cambiar((s) => {
    s.usuarios.push({
      id: uid,
      email,
      nombre: datos.nombre.trim(),
      rol: datos.rol,
      claveHash,
      correoVerificado: false,
      proveedorId,
      direcciones: [],
      creado: ahora(s).toISOString(),
      preferencias: { ...TODAS_PREFERENCIAS },
    });
    if (proveedorId && datos.negocio) {
      const n = datos.negocio;
      s.proveedores.push({
        id: proveedorId,
        nombre: n.nombre.trim(),
        estado: n.estado,
        ciudad: n.ciudad.trim() || estados.find((x) => x.clave === n.estado)!.nombre,
        verificacion: "en_revision",
        cobraIva: n.cobraIva,
        diasPreparacion: n.diasPreparacion,
        enviaA: n.enviaA,
        desde: ahora(s).toISOString().slice(0, 10),
        descripcion: n.descripcion,
        estadisticas: { sumaEstrellas: 0, numResenas: 0, pedidosCerrados: 0, pedidosCompletados: 0, disputasPerdidas: 0, horasRespuesta: null },
        datosDeEjemplo: false,
        documentos: [],
        condiciones: "",
        rfc: n.rfc.trim().toUpperCase(),
      } as ProveedorTienda);
      admins(s).forEach((a) => avisar(s, a, "verificacion", `Nuevo proveedor en revisión: ${n.nombre}`, "Revisa sus documentos en el panel de administración.", "/admin"));
    }
    s.sesion = uid;
    unirCarrito(s, uid);
    avisar(
      s,
      uid,
      "cuenta",
      "Confirma tu correo",
      `Hola, ${datos.nombre.trim()}. Para confirmar tu correo usa el botón de este aviso. (Modo demostración: el correo no sale de Provana.)`,
      "/avisos#verificar",
    );
  });
}

function unirCarrito(s: EstadoTienda, uid: string) {
  const anon = s.carritos.anonimo ?? [];
  if (!anon.length) return;
  const mio = s.carritos[uid] ?? [];
  for (const l of anon) {
    const x = mio.find((m) => m.productoId === l.productoId);
    if (x) x.cantidad += l.cantidad;
    else mio.push({ ...l });
  }
  s.carritos[uid] = mio;
  s.carritos.anonimo = [];
}

export async function entrar(email: string, clave: string) {
  await iniciarTienda();
  const u = e().usuarios.find((x) => x.email === email.trim().toLowerCase());
  if (!u || u.claveHash !== (await hashClave(clave))) throw new ErrorTienda("Correo o contraseña incorrectos.");
  cambiar((s) => {
    s.sesion = u.id;
    unirCarrito(s, u.id);
  });
}

export function salir() {
  cambiar((s) => {
    s.sesion = null;
  });
}

export function verificarCorreo() {
  const u = yo();
  exigirRol(u, "comprador", "proveedor", "admin");
  cambiar((s) => {
    s.usuarios.find((x) => x.id === u.id)!.correoVerificado = true;
  });
}

export function pedirRecuperacion(email: string): string | null {
  const s = e();
  const u = s.usuarios.find((x) => x.email === email.trim().toLowerCase());
  // Respuesta igual exista o no la cuenta, para no revelar correos registrados.
  if (!u) return null;
  const codigo = String(100000 + Math.floor(Math.random() * 900000));
  cambiar((st) => {
    st.avisos.unshift({
      id: id(),
      usuarioId: u.id,
      tipo: "cuenta",
      asunto: "Código para cambiar tu contraseña",
      cuerpo: `Tu código es ${codigo}. Vence en 15 minutos.`,
      fecha: ahora(st).toISOString(),
      leido: false,
    });
  });
  return codigo;
}

export async function restablecerClave(email: string, codigo: string, nueva: string) {
  const s = e();
  const u = s.usuarios.find((x) => x.email === email.trim().toLowerCase());
  const aviso = s.avisos.find((a) => a.usuarioId === u?.id && a.asunto.startsWith("Código para cambiar"));
  if (!u || !aviso || !aviso.cuerpo.includes(codigo) || codigo.length !== 6) throw new ErrorTienda("El código no es correcto.");
  if (nueva.length < 8) throw new ErrorTienda("La contraseña debe tener al menos 8 caracteres.");
  const h = await hashClave(nueva);
  cambiar((st) => {
    st.usuarios.find((x) => x.id === u.id)!.claveHash = h;
    st.avisos = st.avisos.filter((a) => a.id !== aviso.id);
  });
}

export function guardarDireccion(d: Omit<Direccion, "id"> & { id?: string }) {
  const u = yo();
  exigirRol(u, "comprador", "proveedor", "admin");
  if (!/^\d{5}$/.test(d.cp)) throw new ErrorTienda("El código postal tiene 5 dígitos.");
  if (!estados.some((x) => x.clave === d.estado)) throw new ErrorTienda("Elige un estado.");
  if (!d.calle.trim() || !d.nombre.trim()) throw new ErrorTienda("Completa nombre y calle.");
  if (!/^\d{10}$/.test(d.telefono.replace(/\D/g, ""))) throw new ErrorTienda("El teléfono tiene 10 dígitos.");
  const nuevoId = d.id ?? id();
  cambiar((s) => {
    const yoS = s.usuarios.find((x) => x.id === u.id)!;
    const i = yoS.direcciones.findIndex((x) => x.id === d.id);
    const dir = { ...d, id: nuevoId, telefono: d.telefono.replace(/\D/g, "") };
    if (i >= 0) yoS.direcciones[i] = dir;
    else yoS.direcciones.push(dir);
  });
  return nuevoId;
}

export function borrarDireccion(dirId: string) {
  const u = yo();
  exigirRol(u, "comprador", "proveedor", "admin");
  cambiar((s) => {
    const x = s.usuarios.find((v) => v.id === u.id)!;
    x.direcciones = x.direcciones.filter((d) => d.id !== dirId);
  });
}

/* ------------------------------------------------------------------ */
/* Carrito, favoritos y listas                                         */
/* ------------------------------------------------------------------ */

export function agregarAlCarrito(productoId: string, cantidad: number): string {
  const s = e();
  const p = productosVisibles(s).find((x) => x.id === productoId);
  if (!p) throw new ErrorTienda("Ese producto no está disponible.");
  if (!Number.isInteger(cantidad) || cantidad < 1) throw new ErrorTienda("La cantidad debe ser un número entero mayor a 0.");
  const clave = s.sesion ?? "anonimo";
  const actual = (s.carritos[clave] ?? []).find((l) => l.productoId === productoId)?.cantidad ?? 0;
  if (actual + cantidad > p.existencias) throw new ErrorTienda(`Solo hay ${unidades(p.existencias, p.unidad)} disponibles.`);
  cambiar((st) => {
    const c = (st.carritos[clave] ??= []);
    const l = c.find((x) => x.productoId === productoId);
    if (l) l.cantidad += cantidad;
    else c.push({ productoId, cantidad });
  });
  return `Agregamos ${unidades(cantidad, p.unidad)} de ${p.nombre} a tu carrito.`;
}

export function cambiarCantidad(productoId: string, cantidad: number) {
  cambiar((s) => {
    const c = s.carritos[s.sesion ?? "anonimo"] ?? [];
    const p = s.productos.find((x) => x.id === productoId);
    const l = c.find((x) => x.productoId === productoId);
    if (!l || !p) return;
    l.cantidad = Math.max(1, Math.min(p.existencias, Math.floor(cantidad) || 1));
  });
}

export function quitarDelCarrito(productoId: string) {
  cambiar((s) => {
    const k = s.sesion ?? "anonimo";
    s.carritos[k] = (s.carritos[k] ?? []).filter((l) => l.productoId !== productoId);
  });
}

export function alternarFavorito(productoId: string): boolean {
  const u = yo();
  exigirRol(u, "comprador", "proveedor", "admin");
  let ahoraEs = false;
  cambiar((s) => {
    const f = (s.favoritos[u.id] ??= []);
    const i = f.findIndex((x) => x.productoId === productoId);
    const p = s.productos.find((x) => x.id === productoId)!;
    if (i >= 0) f.splice(i, 1);
    else {
      f.push({ productoId, precioAlGuardar: p.precioMenudeo, existenciasAlGuardar: p.existencias });
      ahoraEs = true;
    }
  });
  return ahoraEs;
}

export function guardarLista(nombre: string, lineas: LineaCarrito[]) {
  const u = yo();
  exigirRol(u, "comprador");
  if (!nombre.trim()) throw new ErrorTienda("Ponle nombre a tu lista.");
  if (!lineas.length) throw new ErrorTienda("La lista está vacía.");
  cambiar((s) => {
    (s.listas[u.id] ??= []).push({ id: id(), nombre: nombre.trim(), lineas: structuredClone(lineas) });
  });
}

export function borrarLista(listaId: string) {
  const u = yo();
  exigirRol(u, "comprador");
  cambiar((s) => {
    s.listas[u.id] = (s.listas[u.id] ?? []).filter((l) => l.id !== listaId);
  });
}

/** Agrega varias líneas al carrito (volver a pedir / usar lista). Devuelve las que no se pudieron. */
export function agregarVarias(lineas: LineaCarrito[]): { agregadas: number; omitidas: string[] } {
  let agregadas = 0;
  const omitidas: string[] = [];
  for (const l of lineas) {
    try {
      agregarAlCarrito(l.productoId, l.cantidad);
      agregadas++;
    } catch (err) {
      const p = e().productos.find((x) => x.id === l.productoId);
      omitidas.push(`${p?.nombre ?? "Producto"}: ${(err as Error).message}`);
    }
  }
  return { agregadas, omitidas };
}

/* ------------------------------------------------------------------ */
/* Carrito → revisión por proveedor                                    */
/* ------------------------------------------------------------------ */

export interface GrupoCarrito {
  proveedor: ProveedorTienda;
  lineas: { producto: ProductoTienda; cantidad: number; precioUnitario: number; subtotal: number; problema?: string }[];
  productos: number;
  ivaProductos: number;
  problemas: string[];
}

export function agruparCarrito(s: EstadoTienda, lineas = carritoDe(s)): GrupoCarrito[] {
  const grupos = new Map<string, GrupoCarrito>();
  for (const l of lineas) {
    const p = s.productos.find((x) => x.id === l.productoId);
    if (!p) continue;
    const prov = s.proveedores.find((x) => x.id === p.proveedorId)!;
    const g = grupos.get(prov.id) ?? { proveedor: prov, lineas: [], productos: 0, ivaProductos: 0, problemas: [] };
    let precio = p.precioMenudeo;
    for (const esc of [...p.escalones].sort((a, b) => a.cantidadMinima - b.cantidadMinima)) if (l.cantidad >= esc.cantidadMinima) precio = esc.precioUnitario;
    let problema: string | undefined;
    if (p.estado !== "activo" || prov.verificacion !== "verificado") problema = "Ya no está disponible.";
    else if (l.cantidad < p.pedidoMinimo) problema = `El pedido mínimo es ${unidades(p.pedidoMinimo, p.unidad)}.`;
    else if (l.cantidad > p.existencias) problema = `Solo hay ${unidades(p.existencias, p.unidad)}.`;
    if (problema) g.problemas.push(`${p.nombre}: ${problema}`);
    g.lineas.push({ producto: p, cantidad: l.cantidad, precioUnitario: precio, subtotal: precio * l.cantidad, problema });
    g.productos += precio * l.cantidad;
    grupos.set(prov.id, g);
  }
  for (const g of grupos.values()) g.ivaProductos = g.proveedor.cobraIva ? Math.round(g.productos * 0.16) : 0;
  return [...grupos.values()];
}

export function opcionesEnvioGrupo(g: GrupoCarrito, destino: string): OpcionEnvio[] {
  return opcionesEnvio(
    g.proveedor.estado,
    destino,
    g.lineas.map((l) => ({ cantidad: l.cantidad, pesoKg: l.producto.pesoKg, medidas: l.producto.medidas })),
    g.proveedor.diasPreparacion,
    tarifas,
    estados,
  );
}

export function aplicarCupon(s: EstadoTienda, proveedorId: string, codigo: string, productos: number): { descuento: number; error?: string } {
  if (!codigo) return { descuento: 0 };
  const c = s.cupones.find((x) => x.codigo === codigo.trim().toUpperCase() && x.proveedorId === proveedorId && x.activo);
  if (!c) return { descuento: 0, error: "Ese cupón no es válido para este proveedor." };
  if (productos < c.minimo) return { descuento: 0, error: `Este cupón aplica en compras desde ${pesos(c.minimo)}.` };
  return { descuento: Math.round((productos * c.porcentaje) / 100) };
}

/* ------------------------------------------------------------------ */
/* Compra                                                              */
/* ------------------------------------------------------------------ */

export interface DatosCompra {
  direccion: Direccion;
  envios: Record<string, OpcionEnvio["id"]>;
  cupones: Record<string, string>;
  metodo: MetodoPago;
  tarjeta?: DatosTarjeta;
  factura: { solicitada: boolean; rfc?: string; razonSocial?: string; usoCfdi?: string };
}

export function comprar(datos: DatosCompra): { grupoCompra: string; pedidos: string[]; pendiente?: { referencia: string; instrucciones: string } } {
  const u = yo();
  exigirRol(u, "comprador");
  const s = e();
  const grupos = agruparCarrito(s);
  if (!grupos.length) throw new ErrorTienda("Tu carrito está vacío.");
  const problemas = grupos.flatMap((g) => g.problemas);
  if (problemas.length) throw new ErrorTienda(problemas[0]);
  for (const g of grupos) {
    if (!g.proveedor.enviaA.includes(datos.direccion.estado))
      throw new ErrorTienda(`${g.proveedor.nombre} no envía a ${estados.find((x) => x.clave === datos.direccion.estado)?.nombre}.`);
  }
  if (datos.factura.solicitada && (!datos.factura.rfc || !datos.factura.razonSocial)) throw new ErrorTienda("Para facturar escribe tu RFC y razón social.");

  const fecha = ahora(s);
  const grupoCompra = id();
  const armados: Pedido[] = [];
  let folio = s.folio;
  for (const g of grupos) {
    const opcion = opcionesEnvioGrupo(g, datos.direccion.estado).find((o) => o.id === (datos.envios[g.proveedor.id] ?? "estandar"))!;
    const cup = aplicarCupon(s, g.proveedor.id, datos.cupones[g.proveedor.id] ?? "", g.productos);
    if (cup.error) throw new ErrorTienda(cup.error);
    const base = g.productos - cup.descuento;
    const ivaProductos = g.proveedor.cobraIva ? Math.round(base * 0.16) : 0;
    const ivaEnvio = Math.round(opcion.costo * 0.16);
    const total = base + ivaProductos + opcion.costo + ivaEnvio;
    const { comision, montoProveedor } = liquidar(g.productos, cup.descuento, ivaProductos, s.ajustes.comision);
    folio += 1;
    armados.push({
      id: id(),
      folio: `PV-${folio}`,
      grupoCompra,
      compradorId: u.id,
      proveedorId: g.proveedor.id,
      lineas: g.lineas.map((l) => ({
        productoId: l.producto.id,
        nombre: l.producto.nombre,
        unidad: l.producto.unidad,
        cantidad: l.cantidad,
        precioUnitario: l.precioUnitario,
        subtotal: l.subtotal,
      })),
      productos: g.productos,
      descuento: cup.descuento,
      cupon: cup.descuento ? datos.cupones[g.proveedor.id]?.toUpperCase() : undefined,
      ivaProductos,
      envio: { servicio: opcion.nombre, costo: opcion.costo, iva: ivaEnvio, diasMin: opcion.diasMin, diasMax: opcion.diasMax },
      total,
      comisionTasa: s.ajustes.comision,
      comision,
      montoProveedor,
      pago: { metodo: datos.metodo, estado: "pendiente", referencia: "" },
      estado: "pendiente_pago",
      eventos: [{ estado: "pendiente_pago", fecha: fecha.toISOString(), nota: "Pedido creado." }],
      direccion: datos.direccion,
      factura: datos.factura,
      creado: fecha.toISOString(),
    });
  }
  const totalCompra = armados.reduce((a, p) => a + p.total, 0);
  const cobro = pagos.cobrar(datos.metodo, totalCompra, { tarjeta: datos.tarjeta, folio: armados[0].folio, ahora: fecha });
  if (!cobro.ok) throw new ErrorTienda(cobro.error);

  cambiar((st) => {
    st.folio = folio;
    for (let p of armados) {
      p.pago.referencia = cobro.referencia;
      if (cobro.estado === "aprobado") {
        p.pago.ultimos4 = cobro.ultimos4;
        p = aplicar(p, "acreditar_pago", "sistema", fecha.toISOString(), "Pago con tarjeta de prueba aprobado. El dinero queda retenido.");
      }
      // Reserva de inventario: se descuenta al crear el pedido y se devuelve si se cancela.
      for (const l of p.lineas) st.productos.find((x) => x.id === l.productoId)!.existencias -= l.cantidad;
      st.pedidos.unshift(p);
      const prov = st.proveedores.find((x) => x.id === p.proveedorId)!;
      avisar(st, u.id, "pedido", `Recibimos tu pedido ${p.folio}`, `${prov.nombre} · ${pesos(p.total)}. ${cobro.estado === "aprobado" ? "Tu pago está protegido hasta que confirmes la entrega." : "Falta tu pago: usa la referencia del pedido."}`, `/pedidos/${p.id}`);
      if (cobro.estado === "aprobado")
        avisar(st, duenoDe(st, p.proveedorId), "pedido", `Nuevo pedido ${p.folio}`, `${p.lineas.length} producto(s) · ${pesos(p.productos)} sin IVA. Prepáralo desde tu panel.`, "/panel/pedidos");
    }
    st.carritos[u.id] = [];
  });
  return {
    grupoCompra,
    pedidos: e().pedidos.filter((p) => p.grupoCompra === grupoCompra).map((p) => p.id),
    pendiente: cobro.estado === "pendiente" ? { referencia: cobro.referencia, instrucciones: cobro.instrucciones } : undefined,
  };
}

/** Modo demostración: simula que el comprador pagó en tienda o por transferencia. */
export function simularPagoRecibido(grupoCompra: string) {
  const u = yo();
  exigirRol(u, "comprador");
  cambiar((s) => {
    s.pedidos = s.pedidos.map((p) => {
      if (p.grupoCompra !== grupoCompra || p.compradorId !== u.id || p.estado !== "pendiente_pago") return p;
      const n = aplicar(p, "acreditar_pago", "sistema", ahora(s).toISOString(), "Pago recibido (simulado). El dinero queda retenido.");
      avisar(s, u.id, "pago", `Pago recibido · ${p.folio}`, "Tu dinero está retenido hasta que confirmes la entrega.", `/pedidos/${p.id}`);
      avisar(s, duenoDe(s, p.proveedorId), "pedido", `Nuevo pedido ${p.folio}`, "El pago ya está confirmado. Prepáralo desde tu panel.", "/panel/pedidos");
      return n;
    });
  });
}

/* ------------------------------------------------------------------ */
/* Acciones sobre pedidos                                              */
/* ------------------------------------------------------------------ */

const TEXTOS: Partial<Record<Accion, (p: Pedido) => [TipoAviso, string, string]>> = {
  preparar: (p) => ["pedido", `Tu pedido ${p.folio} se está preparando`, "El proveedor ya está armando tu paquete."],
  enviar: (p) => ["envio", `Tu pedido ${p.folio} va en camino`, `Guía ${p.envio.guia} · ${p.envio.servicio}. Llega en ${p.envio.diasMin}–${p.envio.diasMax} días hábiles.`],
  marcar_entregado: (p) => ["entrega", `Tu pedido ${p.folio} fue entregado`, "Revisa tu pedido y confirma la entrega para liberar el pago al proveedor."],
  cancelar: (p) => ["pedido", `Pedido ${p.folio} cancelado`, p.pago.estado === "reembolsado" ? "Te devolvimos el pago completo (simulado)." : "No se hizo ningún cobro."],
};

export function accionPedido(pedidoId: string, accion: Accion, nota = "", extra: { reembolso?: number } = {}) {
  const u = yo();
  const s = e();
  const p = s.pedidos.find((x) => x.id === pedidoId);
  if (!p) throw new ErrorTienda("No encontramos ese pedido.");
  const actor = actorEn(u, p);
  if (!actor) throw new SinPermiso("Este pedido no es tuyo.");
  cambiar((st) => {
    const i = st.pedidos.findIndex((x) => x.id === pedidoId);
    const fecha = ahora(st).toISOString();
    const guia = accion === "enviar" ? { guia: guiaSimulada(p.folio), paqueteria: `Paquetería simulada · ${p.envio.servicio}` } : {};
    const n = aplicar(st.pedidos[i], accion, actor, fecha, nota, { ...guia, ...extra });
    st.pedidos[i] = n;
    const prov = st.proveedores.find((x) => x.id === n.proveedorId)!;
    if (accion === "cancelar") for (const l of n.lineas) st.productos.find((x) => x.id === l.productoId)!.existencias += l.cantidad;
    const t = TEXTOS[accion]?.(n);
    if (t) avisar(st, n.compradorId, t[0], t[1], t[2], `/pedidos/${n.id}`);
    if (accion === "cancelar") avisar(st, duenoDe(st, n.proveedorId), "pedido", `Pedido ${n.folio} cancelado`, nota || "El comprador canceló antes de la preparación.", "/panel/pedidos");
    if (accion === "confirmar_entrega")
      avisar(st, duenoDe(st, n.proveedorId), "pago", `Pago liberado · ${n.folio}`, `Recibes ${pesos(n.montoProveedor)} (ya con la comisión de ${pesos(n.comision)} descontada).`, "/panel/cuenta");
    if (accion === "abrir_disputa") {
      const d: Disputa = {
        id: id(),
        pedidoId: n.id,
        motivo: nota,
        estado: "abierta",
        historial: [{ autor: "Comprador", texto: nota, fecha }],
        creada: fecha,
      };
      st.disputas.unshift(d);
      avisar(st, duenoDe(st, n.proveedorId), "disputa", `Problema con el pedido ${n.folio}`, `${nota}. El pago queda detenido mientras se resuelve.`, "/panel/pedidos");
      admins(st).forEach((a) => avisar(st, a, "disputa", `Nueva disputa · ${n.folio}`, `${prov.nombre}: ${nota}`, "/admin"));
      avisar(st, n.compradorId, "disputa", `Abrimos tu reporte · ${n.folio}`, "Detuvimos el pago al proveedor. Administración te responderá.", `/pedidos/${n.id}`);
    }
  });
}

export function resolverDisputa(disputaId: string, resolucion: NonNullable<Disputa["resolucion"]>, monto: number, nota: string) {
  const u = yo();
  exigirRol(u, "admin");
  const d = e().disputas.find((x) => x.id === disputaId);
  if (!d || d.estado !== "abierta") throw new ErrorTienda("Esa disputa ya está cerrada.");
  const p = e().pedidos.find((x) => x.id === d.pedidoId)!;
  if (resolucion === "a_favor_proveedor") accionPedido(p.id, "resolver_a_favor_proveedor", nota);
  else accionPedido(p.id, "resolver_reembolso", nota, { reembolso: resolucion === "reembolso_total" ? p.total : monto });
  cambiar((s) => {
    const x = s.disputas.find((v) => v.id === disputaId)!;
    x.estado = "resuelta";
    x.resolucion = resolucion;
    x.montoReembolso = resolucion === "a_favor_proveedor" ? 0 : resolucion === "reembolso_total" ? p.total : monto;
    x.historial.push({ autor: "Administración", texto: nota || "Disputa resuelta.", fecha: ahora(s).toISOString() });
    const msg = resolucion === "a_favor_proveedor" ? "Se liberó el pago al proveedor." : `Te reembolsamos ${pesos(x.montoReembolso!)} (simulado).`;
    avisar(s, p.compradorId, "disputa", `Resolvimos tu reporte · ${p.folio}`, `${msg} ${nota}`, `/pedidos/${p.id}`);
    avisar(s, duenoDe(s, p.proveedorId), "disputa", `Disputa resuelta · ${p.folio}`, `${resolucion === "a_favor_proveedor" ? "Se liberó tu pago." : "Se reembolsó al comprador."} ${nota}`, "/panel/pedidos");
  });
}

/** Libera los pedidos entregados que pasaron el plazo sin confirmación. */
export function liberacionesAutomaticas() {
  const s = e();
  const t = ahora(s);
  const pendientes = s.pedidos.filter((p) => debeLiberarse(p, t, s.ajustes.diasLiberacion));
  if (!pendientes.length) return 0;
  cambiar((st) => {
    st.pedidos = st.pedidos.map((p) => {
      if (!debeLiberarse(p, t, st.ajustes.diasLiberacion)) return p;
      const n = aplicar(p, "liberar_automatico", "sistema", t.toISOString(), `Liberado automáticamente a los ${st.ajustes.diasLiberacion} días de la entrega.`);
      avisar(st, duenoDe(st, p.proveedorId), "pago", `Pago liberado · ${p.folio}`, `Recibes ${pesos(p.montoProveedor)}.`, "/panel/cuenta");
      return n;
    });
  });
  return pendientes.length;
}

export function adelantarReloj(dias: number) {
  exigirRol(yo(), "admin");
  cambiar((s) => {
    s.diasAdelantados += dias;
  });
  return liberacionesAutomaticas();
}

export function subirFactura(pedidoId: string, xml: string, pdf: string) {
  const u = yo();
  exigirRol(u, "proveedor");
  const p = e().pedidos.find((x) => x.id === pedidoId);
  if (!p || p.proveedorId !== u.proveedorId) throw new SinPermiso("Este pedido no es de tu tienda.");
  if (!p.factura.solicitada) throw new ErrorTienda("El comprador no pidió factura.");
  if (!/\.xml$/i.test(xml) || !/\.pdf$/i.test(pdf)) throw new ErrorTienda("Sube el XML y el PDF de la factura.");
  cambiar((s) => {
    const x = s.pedidos.find((v) => v.id === pedidoId)!;
    x.factura = { ...x.factura, xml, pdf };
    avisar(s, x.compradorId, "pedido", `Tu factura de ${x.folio} está lista`, "Puedes descargarla desde tu pedido.", `/pedidos/${x.id}`);
  });
}

/* ------------------------------------------------------------------ */
/* Reseñas, mensajes y cotizaciones                                    */
/* ------------------------------------------------------------------ */

export function puedeResenar(s: EstadoTienda, pedidoId: string): boolean {
  const u = usuarioDe(s);
  const p = s.pedidos.find((x) => x.id === pedidoId);
  return !!u && !!p && p.compradorId === u.id && p.estado === "completado" && !s.resenas.some((r) => r.pedidoId === pedidoId);
}

export function resenar(pedidoId: string, estrellas: number, texto: string, fotos: string[]) {
  const u = yo();
  exigirRol(u, "comprador");
  if (!puedeResenar(e(), pedidoId)) throw new ErrorTienda("Solo puedes reseñar pedidos completados, una vez por pedido.");
  if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) throw new ErrorTienda("Elige de 1 a 5 estrellas.");
  if (texto.trim().length < 10) throw new ErrorTienda("Cuéntanos un poco más (al menos 10 caracteres).");
  const p = e().pedidos.find((x) => x.id === pedidoId)!;
  cambiar((s) => {
    s.resenas.unshift({
      id: id(),
      pedidoId,
      proveedorId: p.proveedorId,
      compradorId: u.id,
      compradorNombre: u.nombre.split(" ")[0] + " " + (u.nombre.split(" ")[1]?.[0] ?? "") + ".",
      estrellas,
      texto: texto.trim(),
      fotos: fotos.slice(0, 3),
      oculta: false,
      fecha: ahora(s).toISOString(),
    });
    avisar(s, duenoDe(s, p.proveedorId), "pedido", `Nueva reseña de ${estrellas} ★`, texto.trim().slice(0, 140), "/panel");
  });
}

export function responderResena(resenaId: string, texto: string) {
  const u = yo();
  exigirRol(u, "proveedor");
  const r = e().resenas.find((x) => x.id === resenaId);
  if (!r || r.proveedorId !== u.proveedorId) throw new SinPermiso("Esa reseña no es de tu tienda.");
  if (texto.trim().length < 3) throw new ErrorTienda("Escribe tu respuesta.");
  cambiar((s) => {
    s.resenas.find((x) => x.id === resenaId)!.respuesta = texto.trim();
  });
}

export function reportarResena(resenaId: string, motivo: string) {
  exigirRol(yo(), "comprador", "proveedor", "admin");
  if (motivo.trim().length < 5) throw new ErrorTienda("Explica por qué la reportas.");
  cambiar((s) => {
    s.resenas.find((x) => x.id === resenaId)!.reportada = motivo.trim();
    admins(s).forEach((a) => avisar(s, a, "disputa", "Reseña reportada", motivo.trim(), "/admin"));
  });
}

export function moderarResena(resenaId: string, ocultar: boolean) {
  exigirRol(yo(), "admin");
  cambiar((s) => {
    const r = s.resenas.find((x) => x.id === resenaId)!;
    r.oculta = ocultar;
    r.reportada = undefined;
  });
}

export const hiloDe = (compradorId: string, proveedorId: string) => `${compradorId}:${proveedorId}`;

export function enviarMensaje(hilo: string, texto: string) {
  const u = yo();
  exigirRol(u, "comprador", "proveedor");
  const [compradorId, proveedorId] = hilo.split(":");
  const soyParte = (u.rol === "comprador" && u.id === compradorId) || (u.rol === "proveedor" && u.proveedorId === proveedorId);
  if (!soyParte) throw new SinPermiso("No participas en esta conversación.");
  if (!texto.trim()) throw new ErrorTienda("Escribe un mensaje.");
  cambiar((s) => {
    s.mensajes.push({ id: id(), hilo, autorId: u.id, texto: texto.trim().slice(0, 1000), fecha: ahora(s).toISOString() });
    const prov = s.proveedores.find((p) => p.id === proveedorId)!;
    if (u.rol === "comprador") avisar(s, duenoDe(s, proveedorId), "mensaje", `Mensaje de ${u.nombre}`, texto.trim().slice(0, 140), "/panel/mensajes");
    else avisar(s, compradorId, "mensaje", `Mensaje de ${prov.nombre}`, texto.trim().slice(0, 140), `/mensajes?proveedor=${proveedorId}`);
  });
}

export function solicitarCotizacion(productoId: string, tipo: Cotizacion["tipo"], cantidad: number, mensaje: string) {
  const u = yo();
  exigirRol(u, "comprador");
  const p = productosVisibles(e()).find((x) => x.id === productoId);
  if (!p) throw new ErrorTienda("Ese producto no está disponible.");
  if (!Number.isInteger(cantidad) || cantidad < 1) throw new ErrorTienda("Escribe una cantidad válida.");
  cambiar((s) => {
    s.cotizaciones.unshift({ id: id(), tipo, compradorId: u.id, proveedorId: p.proveedorId, productoId, cantidad, mensaje: mensaje.trim(), estado: "pendiente", fecha: ahora(s).toISOString() });
    avisar(s, duenoDe(s, p.proveedorId), "cotizacion", `${tipo === "muestra" ? "Piden una muestra" : "Piden una cotización"} de ${p.nombre}`, `${unidades(cantidad, p.unidad)}. ${mensaje}`, "/panel/cotizaciones");
  });
}

export function responderCotizacion(cotId: string, respuesta: string, precio?: number) {
  const u = yo();
  exigirRol(u, "proveedor");
  const c = e().cotizaciones.find((x) => x.id === cotId);
  if (!c || c.proveedorId !== u.proveedorId) throw new SinPermiso("Esa solicitud no es de tu tienda.");
  if (!respuesta.trim()) throw new ErrorTienda("Escribe tu respuesta.");
  cambiar((s) => {
    const x = s.cotizaciones.find((v) => v.id === cotId)!;
    x.estado = "respondida";
    x.respuesta = respuesta.trim();
    x.precioOfrecido = precio;
    avisar(s, x.compradorId, "cotizacion", "Te respondieron tu solicitud", `${respuesta.trim()}${precio ? ` · ${pesos(precio)} c/u + IVA` : ""}`, "/cuenta#cotizaciones");
  });
}

/* ------------------------------------------------------------------ */
/* Proveedor                                                           */
/* ------------------------------------------------------------------ */

export interface DatosProducto {
  id?: string;
  nombre: string;
  tipoId: string;
  descripcion: string;
  unidad: ProductoTienda["unidad"];
  variante: Record<string, string> | null;
  precioMenudeo: number;
  escalones: { cantidadMinima: number; precioUnitario: number }[];
  pedidoMinimo: number;
  existencias: number;
  pesoKg: number;
  medidas: ProductoTienda["medidas"];
  maxDiasTransito: number | null;
  permisoSanitario: ProductoTienda["permisoSanitario"];
  fotos: string[];
}

export function validarProducto(d: DatosProducto): string[] {
  const m: string[] = [];
  if (d.nombre.trim().length < 3) m.push("El nombre debe tener al menos 3 letras.");
  if (!tiposProducto.some((t) => t.id === d.tipoId)) m.push("Elige el tipo de producto.");
  if (!Number.isInteger(d.precioMenudeo) || d.precioMenudeo <= 0) m.push("El precio de menudeo debe ser mayor a 0.");
  m.push(...validarEscalones(d.precioMenudeo, d.escalones));
  if (!Number.isInteger(d.pedidoMinimo) || d.pedidoMinimo < 1) m.push("El pedido mínimo debe ser al menos 1.");
  if (!Number.isInteger(d.existencias) || d.existencias < 0) m.push("Las existencias no pueden ser negativas.");
  if (!(d.pesoKg > 0)) m.push("El peso debe ser mayor a 0.");
  const tipo = tiposProducto.find((t) => t.id === d.tipoId);
  const cat = categorias.find((c) => c.id === tipo?.categoriaId);
  if (cat?.requierePermiso && !d.permisoSanitario) m.push("Este tipo de producto requiere declarar su permiso o etiquetado sanitario.");
  return m;
}

function slug(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

export function guardarProducto(d: DatosProducto): string {
  const u = yo();
  exigirRol(u, "proveedor");
  const errores = validarProducto(d);
  if (errores.length) throw new ErrorTienda(errores[0]);
  const previo = d.id ? e().productos.find((p) => p.id === d.id) : undefined;
  if (previo && previo.proveedorId !== u.proveedorId) throw new SinPermiso("Ese producto no es de tu tienda.");
  const nuevoId = d.id ?? `${u.proveedorId!.slice(0, 12)}-${slug(d.nombre)}-${id().slice(0, 4)}`;
  cambiar((s) => {
    const i = s.productos.findIndex((p) => p.id === nuevoId);
    const prod: ProductoTienda = {
      ...(i >= 0 ? s.productos[i] : { estado: "activo" as const, datosDeEjemplo: false }),
      id: nuevoId,
      proveedorId: u.proveedorId!,
      tipoId: d.tipoId,
      nombre: d.nombre.trim(),
      descripcion: d.descripcion.trim(),
      unidad: d.unidad,
      variante: d.variante,
      precioMenudeo: d.precioMenudeo,
      escalones: d.escalones,
      pedidoMinimo: d.pedidoMinimo,
      existencias: d.existencias,
      pesoKg: d.pesoKg,
      medidas: d.medidas,
      maxDiasTransito: d.maxDiasTransito,
      permisoSanitario: d.permisoSanitario,
      fotos: d.fotos,
    } as ProductoTienda;
    if (i >= 0) s.productos[i] = prod;
    else s.productos.unshift(prod);
    // Alertas de bajada de precio y de reposición a quien lo tiene en favoritos.
    if (previo) {
      for (const [uid, favs] of Object.entries(s.favoritos)) {
        const f = favs.find((x) => x.productoId === nuevoId);
        if (!f) continue;
        if (prod.precioMenudeo < f.precioAlGuardar) {
          avisar(s, uid, "precio", `Bajó de precio: ${prod.nombre}`, `Ahora ${pesos(prod.precioMenudeo)} + IVA (antes ${pesos(f.precioAlGuardar)}).`, `/producto/${prod.id}`);
          f.precioAlGuardar = prod.precioMenudeo;
        }
        if (previo.existencias === 0 && prod.existencias > 0) avisar(s, uid, "precio", `Ya hay existencias: ${prod.nombre}`, `${unidades(prod.existencias, prod.unidad)} disponibles.`, `/producto/${prod.id}`);
        f.existenciasAlGuardar = prod.existencias;
      }
    }
  });
  return nuevoId;
}

export function cambiarEstadoProducto(productoId: string, accion: "pausar" | "activar" | "borrar") {
  const u = yo();
  exigirRol(u, "proveedor");
  const p = e().productos.find((x) => x.id === productoId);
  if (!p || p.proveedorId !== u.proveedorId) throw new SinPermiso("Ese producto no es de tu tienda.");
  cambiar((s) => {
    if (accion === "borrar") s.productos = s.productos.filter((x) => x.id !== productoId);
    else s.productos.find((x) => x.id === productoId)!.estado = accion === "pausar" ? "pausado" : "activo";
  });
}

export function importarCsv(texto: string): { importadas: number; errores: { fila: number; mensajes: string[] }[] } {
  const u = yo();
  exigirRol(u, "proveedor");
  const { validas, errores } = validarCsv(texto, new Set(tiposProducto.map((t) => t.id)));
  const extra: { fila: number; mensajes: string[] }[] = [];
  let importadas = 0;
  for (const f of validas as FilaValida[]) {
    try {
      guardarProducto({ ...f, unidad: f.unidad as ProductoTienda["unidad"], maxDiasTransito: null, permisoSanitario: null, fotos: [] });
      importadas++;
    } catch (err) {
      extra.push({ fila: f.fila, mensajes: [(err as Error).message] });
    }
  }
  return { importadas, errores: [...errores, ...extra].sort((a, b) => a.fila - b.fila) };
}

export function guardarTienda(datos: Partial<Pick<ProveedorTienda, "descripcion" | "condiciones" | "diasPreparacion" | "enviaA" | "cobraIva" | "ciudad">>) {
  const u = yo();
  exigirRol(u, "proveedor");
  if (datos.enviaA && datos.enviaA.length === 0) throw new ErrorTienda("Elige al menos un estado al que envías.");
  cambiar((s) => {
    Object.assign(s.proveedores.find((p) => p.id === u.proveedorId)!, datos);
  });
}

export function subirDocumento(tipo: ProveedorTienda["documentos"][number]["tipo"], nombreArchivo: string) {
  const u = yo();
  exigirRol(u, "proveedor");
  if (!/\.(pdf|jpe?g|png|webp)$/i.test(nombreArchivo)) throw new ErrorTienda("Sube un PDF o una imagen.");
  cambiar((s) => {
    const p = s.proveedores.find((x) => x.id === u.proveedorId)!;
    p.documentos = [...p.documentos.filter((d) => d.tipo !== tipo), { tipo, nombreArchivo, subido: ahora(s).toISOString() }];
    if (p.verificacion === "rechazado") {
      p.verificacion = "en_revision";
      p.motivoRechazo = undefined;
    }
  });
}

export function guardarCupon(codigo: string, porcentaje: number, minimo: number) {
  const u = yo();
  exigirRol(u, "proveedor");
  const c = codigo.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,16}$/.test(c)) throw new ErrorTienda("El código lleva de 4 a 16 letras o números, sin espacios.");
  if (!(porcentaje >= 1 && porcentaje <= 50)) throw new ErrorTienda("El descuento va de 1 % a 50 %.");
  if (e().cupones.some((x) => x.codigo === c && x.proveedorId !== u.proveedorId)) throw new ErrorTienda("Ese código ya lo usa otro proveedor.");
  cambiar((s) => {
    s.cupones = s.cupones.filter((x) => !(x.codigo === c && x.proveedorId === u.proveedorId));
    s.cupones.push({ codigo: c, proveedorId: u.proveedorId!, porcentaje, minimo, activo: true });
  });
}

export function alternarCupon(codigo: string) {
  const u = yo();
  exigirRol(u, "proveedor");
  cambiar((s) => {
    const c = s.cupones.find((x) => x.codigo === codigo && x.proveedorId === u.proveedorId);
    if (c) c.activo = !c.activo;
  });
}

/* ------------------------------------------------------------------ */
/* Administración                                                      */
/* ------------------------------------------------------------------ */

export function verificarProveedor(proveedorId: string, aprobar: boolean, motivo = "") {
  exigirRol(yo(), "admin");
  if (!aprobar && motivo.trim().length < 10) throw new ErrorTienda("Explica el motivo del rechazo (al menos 10 caracteres).");
  cambiar((s) => {
    const p = s.proveedores.find((x) => x.id === proveedorId)!;
    p.verificacion = aprobar ? "verificado" : "rechazado";
    p.motivoRechazo = aprobar ? undefined : motivo.trim();
    avisar(
      s,
      duenoDe(s, proveedorId),
      "verificacion",
      aprobar ? "¡Tu tienda está verificada!" : "Necesitamos corregir tu verificación",
      aprobar ? "Tus productos activos ya aparecen en el catálogo y en el surtido." : `Motivo: ${motivo.trim()}. Sube los documentos corregidos desde tu panel.`,
      "/panel",
    );
  });
}

export function guardarAjustes(a: Ajustes) {
  exigirRol(yo(), "admin");
  if (!(a.comision >= 0 && a.comision <= 0.3)) throw new ErrorTienda("La comisión va de 0 % a 30 %.");
  if (!(a.diasLiberacion >= 1 && a.diasLiberacion <= 30)) throw new ErrorTienda("La liberación va de 1 a 30 días.");
  if (!(a.confianzaMinima >= 0 && a.confianzaMinima <= 100)) throw new ErrorTienda("La confianza mínima va de 0 a 100.");
  cambiar((s) => {
    s.ajustes = a;
  });
}
