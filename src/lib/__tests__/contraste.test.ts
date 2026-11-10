/**
 * Verifica contraste WCAG AA (4.5:1 texto normal) de los pares de tokens
 * que se usan como texto/fondo, en modo claro y oscuro, leyendo globals.css.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(import.meta.dirname, "../../app/globals.css"), "utf8");

function bloque(selector: string): Record<string, string> {
  const i = css.indexOf(selector);
  const inicio = css.indexOf("{", i);
  const fin = css.indexOf("}", inicio);
  const vars: Record<string, string> = {};
  for (const m of css.slice(inicio + 1, fin).matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}

const claro = bloque(":root {");
const oscuro = { ...claro, ...bloque(':root[data-theme="dark"]') };

function resolver(tema: Record<string, string>, nombre: string, prof = 0): string {
  const v = tema[nombre];
  if (!v) throw new Error(`Token inexistente: --${nombre}`);
  const ref = v.match(/^var\(--([\w-]+)\)$/);
  return ref && prof < 5 ? resolver(tema, ref[1], prof + 1) : v;
}

function luminancia(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const PARES: [texto: string, fondo: string][] = [
  ["ink", "bg"],
  ["ink", "surface"],
  ["ink", "surface-2"],
  ["ink-soft", "bg"],
  ["ink-soft", "surface"],
  ["ink-soft", "surface-2"],
  ["ink-faint", "bg"],
  ["ink-faint", "surface"],
  ["accent", "bg"],
  ["accent", "surface"],
  ["accent", "accent-tint"],
  ["accent-on", "accent"],
  ["amber-ink", "amber-tint"],
  ["danger", "danger-tint"],
  ["danger", "surface"],
  ["panel-ink", "panel"],
  ["panel-soft", "panel"],
];

describe.each([
  ["claro", claro],
  ["oscuro", oscuro],
])("contraste AA en modo %s", (_, tema) => {
  it.each(PARES)("%s sobre %s ≥ 4.5:1", (texto, fondo) => {
    const ratio = contraste(resolver(tema, texto), resolver(tema, fondo));
    expect(ratio, `${texto}/${fondo} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
  });
});

it("la escala verde incluye 50–900 y el 600 es #1D6F52", () => {
  for (const n of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]) expect(claro[`verde-${n}`]).toMatch(/^#[0-9a-f]{6}$/);
  expect(claro["verde-600"]).toBe("#1d6f52");
});

it("el ámbar puro no se usa como texto sobre fondo claro (no pasa AA): solo acento", () => {
  // Comprueba también que la función detecta pares que fallan.
  expect(contraste(resolver(claro, "amber"), resolver(claro, "bg"))).toBeLessThan(4.5);
});
