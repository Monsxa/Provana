/**
 * Carga masiva de productos desde CSV (Excel → "Guardar como CSV UTF-8").
 * Cada fila se valida por separado; las válidas se importan y las demás se reportan con su número de fila.
 */
import { validarEscalones } from "@/lib/surtido/precios";

export const COLUMNAS = [
  "nombre",
  "tipoId",
  "descripcion",
  "unidad",
  "precioMenudeo",
  "escalones",
  "pedidoMinimo",
  "existencias",
  "pesoKg",
  "largoCm",
  "anchoCm",
  "altoCm",
  "variante",
] as const;

export const PLANTILLA_CSV =
  COLUMNAS.join(",") +
  "\n" +
  'Vela de soya — mandarina,vela-soya-200g,"Cera de soya, vaso de vidrio",pieza,85.00,12:72;48:60,6,300,0.3,8,8,9,aroma=mandarina\n' +
  'Bolsa kraft con logo,bolsa-kraft-mediana,"Impresión a una tinta",pieza,3.10,500:2.40,200,5000,0.02,32,24,0.3,\n';

/** Parser de CSV con comillas dobles ("" escapa una comilla). */
export function parsearCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let comillas = false;
  const t = texto.replace(/^﻿/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (comillas) {
      if (c === '"' && t[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ",") {
      fila.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      fila.push(campo);
      if (fila.some((x) => x.trim() !== "")) filas.push(fila);
      fila = [];
      campo = "";
    } else campo += c;
  }
  fila.push(campo);
  if (fila.some((x) => x.trim() !== "")) filas.push(fila);
  return filas;
}

const pesosACentavos = (v: string) => Math.round(Number(v.replace(/[$,\s]/g, "")) * 100);

export interface FilaValida {
  fila: number;
  nombre: string;
  tipoId: string;
  descripcion: string;
  unidad: string;
  precioMenudeo: number;
  escalones: { cantidadMinima: number; precioUnitario: number }[];
  pedidoMinimo: number;
  existencias: number;
  pesoKg: number;
  medidas: { largoCm: number; anchoCm: number; altoCm: number } | null;
  variante: Record<string, string> | null;
}

export function validarCsv(
  texto: string,
  tiposValidos: Set<string>,
): { validas: FilaValida[]; errores: { fila: number; mensajes: string[] }[] } {
  const filas = parsearCsv(texto);
  if (filas.length === 0) return { validas: [], errores: [{ fila: 1, mensajes: ["El archivo está vacío."] }] };
  const cab = filas[0].map((c) => c.trim());
  const faltan = COLUMNAS.filter((c) => !cab.includes(c));
  if (faltan.length) return { validas: [], errores: [{ fila: 1, mensajes: [`Faltan columnas: ${faltan.join(", ")}.`] }] };
  const idx = Object.fromEntries(COLUMNAS.map((c) => [c, cab.indexOf(c)])) as Record<(typeof COLUMNAS)[number], number>;

  const validas: FilaValida[] = [];
  const errores: { fila: number; mensajes: string[] }[] = [];
  filas.slice(1).forEach((f, i) => {
    const n = i + 2;
    const v = (c: (typeof COLUMNAS)[number]) => (f[idx[c]] ?? "").trim();
    const m: string[] = [];
    const nombre = v("nombre");
    if (nombre.length < 3) m.push("El nombre debe tener al menos 3 letras.");
    const tipoId = v("tipoId");
    if (!tiposValidos.has(tipoId)) m.push(`El tipo "${tipoId}" no existe. Usa uno de la lista de tipos.`);
    const unidad = v("unidad") || "pieza";
    if (!["pieza", "kg", "caja", "rollo", "paquete", "litro", "metro"].includes(unidad)) m.push(`Unidad "${unidad}" no válida.`);
    const precioMenudeo = pesosACentavos(v("precioMenudeo"));
    if (!Number.isFinite(precioMenudeo) || precioMenudeo <= 0) m.push("El precio de menudeo debe ser mayor a 0.");
    const escalones: FilaValida["escalones"] = [];
    if (v("escalones")) {
      for (const par of v("escalones").split(";")) {
        const [q, p] = par.split(":");
        const cantidadMinima = Number(q);
        const precioUnitario = pesosACentavos(p ?? "");
        if (!Number.isInteger(cantidadMinima) || !Number.isFinite(precioUnitario)) {
          m.push(`Escalón "${par}" no válido: usa cantidad:precio, por ejemplo 12:76.`);
          break;
        }
        escalones.push({ cantidadMinima, precioUnitario });
      }
      if (m.length === 0) m.push(...validarEscalones(precioMenudeo, escalones));
    }
    const pedidoMinimo = Number(v("pedidoMinimo") || 1);
    if (!Number.isInteger(pedidoMinimo) || pedidoMinimo < 1) m.push("El pedido mínimo debe ser un entero mayor a 0.");
    const existencias = Number(v("existencias"));
    if (!Number.isInteger(existencias) || existencias < 0) m.push("Las existencias deben ser un entero de 0 o más.");
    const pesoKg = Number(v("pesoKg"));
    if (!(pesoKg > 0)) m.push("El peso debe ser mayor a 0 kg.");
    const [l, a, h] = [v("largoCm"), v("anchoCm"), v("altoCm")].map(Number);
    const medidas = l > 0 && a > 0 && h > 0 ? { largoCm: l, anchoCm: a, altoCm: h } : null;
    let variante: Record<string, string> | null = null;
    if (v("variante")) {
      const [k, val] = v("variante").split("=");
      if (!k || !val) m.push('Variante no válida: usa nombre=valor, por ejemplo aroma=lavanda.');
      else variante = { [k.trim()]: val.trim() };
    }
    if (m.length) errores.push({ fila: n, mensajes: m });
    else
      validas.push({ fila: n, nombre, tipoId, descripcion: v("descripcion"), unidad, precioMenudeo, escalones, pedidoMinimo, existencias, pesoKg, medidas, variante });
  });
  return { validas, errores };
}
