"use client";
/** Lista para comparar (hasta 3 productos), guardada en el navegador. */
import { useSyncExternalStore } from "react";

const CLAVE = "provana:comparar";
const oyentes = new Set<() => void>();
let cache: string[] | null = null;

function leer(): string[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
  } catch {
    cache = [];
  }
  return cache!;
}
function escribir(v: string[]) {
  cache = v;
  try {
    localStorage.setItem(CLAVE, JSON.stringify(v));
  } catch {}
  oyentes.forEach((o) => o());
}

export const MAX_COMPARAR = 3;
const VACIO: string[] = [];

export function useComparar(): string[] {
  return useSyncExternalStore(
    (cb) => (oyentes.add(cb), () => oyentes.delete(cb)),
    leer,
    () => VACIO,
  );
}

/** Devuelve un mensaje para mostrar. */
export function alternarComparar(id: string, nombre: string): string {
  const v = leer();
  if (v.includes(id)) {
    escribir(v.filter((x) => x !== id));
    return `Quitamos ${nombre} del comparador.`;
  }
  if (v.length >= MAX_COMPARAR) return `Puedes comparar hasta ${MAX_COMPARAR} productos. Quita uno primero.`;
  escribir([...v, id]);
  return `Agregamos ${nombre} al comparador.`;
}
export const limpiarComparar = () => escribir([]);
