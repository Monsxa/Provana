"use client";
/**
 * Entrada escalonada al hacer scroll (IntersectionObserver).
 * Cada hijo directo entra con opacidad + 8 px, 250 ms, desfase de 50 ms.
 * Sin JavaScript o con movimiento reducido, todo se ve desde el principio:
 * el estado oculto solo se aplica después de montar (data-revelar="listo").
 */
import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { prefiereMenosMovimiento } from "./usarMovimiento";

export function Revelar({
  as: Etiqueta = "div",
  className,
  children,
  desfase = 50,
  ...resto
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  desfase?: number;
} & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefiereMenosMovimiento() || !("IntersectionObserver" in window)) return;
    const hijos = Array.from(el.children) as HTMLElement[];
    // Solo se ocultan los que todavía no están en pantalla, para no parpadear arriba del pliegue.
    const alto = window.innerHeight;
    const pendientes = hijos.filter((h) => h.getBoundingClientRect().top > alto * 0.92);
    if (pendientes.length === 0) return;
    pendientes.forEach((h) => h.setAttribute("data-revelar", "listo"));
    let lote = 0;
    let temporizador = 0;
    const io = new IntersectionObserver(
      (entradas) => {
        const visibles = entradas.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement);
        visibles.forEach((h) => {
          h.style.setProperty("--retraso", `${lote++ * desfase}ms`);
          h.setAttribute("data-revelar", "visto");
          io.unobserve(h);
        });
        window.clearTimeout(temporizador);
        temporizador = window.setTimeout(() => (lote = 0), 120);
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    pendientes.forEach((h) => io.observe(h));
    return () => {
      io.disconnect();
      window.clearTimeout(temporizador);
    };
  }, [desfase]);

  return (
    <Etiqueta ref={ref} className={className} {...resto}>
      {children}
    </Etiqueta>
  );
}
