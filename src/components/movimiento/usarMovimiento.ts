"use client";

/** true si el sistema pide reducir el movimiento (solo en el navegador). */
export const prefiereMenosMovimiento = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** ease-out fuerte, cercano a cubic-bezier(0.23, 1, 0.32, 1), para animaciones con requestAnimationFrame. */
export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}
