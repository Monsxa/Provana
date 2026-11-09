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
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
