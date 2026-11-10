import type { Centavos } from "./tipos";

const moneda = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 171900 → "$1,719.00" */
export function pesos(c: Centavos): string {
  return moneda.format(c / 100);
}

const PLURALES: Record<string, string> = {
  pieza: "piezas",
  caja: "cajas",
  litro: "litros",
  paquete: "paquetes",
  rollo: "rollos",
  metro: "metros",
  kg: "kg",
  g: "g",
};

export function unidades(cantidad: number, unidad = "pieza"): string {
  const u = cantidad === 1 ? unidad : (PLURALES[unidad] ?? `${unidad}s`);
  return `${cantidad.toLocaleString("es-MX")} ${u}`;
}

/** Quita acentos y pasa a minúsculas para comparar textos. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Iniciales de un negocio para su avatar ("Aromas del Valle" → "AV"). */
export function iniciales(nombre: string): string {
  return nombre
    .split(" ")
    .filter((w) => w && !["de", "del", "la", "las", "los", "y"].includes(w.toLowerCase()))
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}
