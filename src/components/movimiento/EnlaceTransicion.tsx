"use client";
/**
 * Enlace con transición compartida (View Transitions API).
 * Los elementos con el mismo `view-transition-name` en ambas páginas se transforman
 * de uno a otro (p. ej. el avatar de la tarjeta → el avatar de la ficha).
 * Respaldo: si el navegador no la soporta, o hay movimiento reducido, navega normal.
 */
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ComponentProps } from "react";

let resolverPendiente: (() => void) | null = null;

/** Se monta una vez en el layout: avisa a la transición cuando la nueva ruta ya se pintó. */
export function OyenteTransiciones() {
  const ruta = usePathname();
  useEffect(() => {
    resolverPendiente?.();
    resolverPendiente = null;
  }, [ruta]);
  return null;
}

type DocConTransicion = Document & { startViewTransition?: (cb: () => Promise<void>) => unknown };

export function EnlaceTransicion({ href, onClick, ...resto }: ComponentProps<typeof Link> & { href: string }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      {...resto}
      onClick={(e) => {
        onClick?.(e);
        const doc = document as DocConTransicion;
        if (
          e.defaultPrevented ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.button !== 0 ||
          !doc.startViewTransition ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        )
          return;
        e.preventDefault();
        doc.startViewTransition(
          () =>
            new Promise<void>((res) => {
              resolverPendiente = res;
              router.push(href);
              window.setTimeout(res, 800); // por si la ruta no cambia
            }),
        );
      }}
    />
  );
}
