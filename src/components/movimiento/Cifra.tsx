"use client";
/**
 * Cifra que cuenta hasta su valor final (ahorro, totales, calificaciones).
 * - Al cambiar de valor, anima desde el valor anterior (no desde cero).
 * - Con movimiento reducido muestra el valor final de inmediato.
 * - Cifras tabulares para que el ancho no salte.
 */
import { useEffect, useRef, useState } from "react";
import { pesos } from "@/lib/surtido/formato";
import { easeOut, prefiereMenosMovimiento } from "./usarMovimiento";

type Formato = "pesos" | "entero" | "decimal1" | "porcentaje";

const formatear = (v: number, f: Formato) => {
  switch (f) {
    case "pesos":
      return pesos(Math.round(v));
    case "decimal1":
      return v.toLocaleString("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    case "porcentaje":
      return `${v.toLocaleString("es-MX", { maximumFractionDigits: 1 })} %`;
    default:
      return Math.round(v).toLocaleString("es-MX");
  }
};

export function Cifra({
  valor,
  formato = "entero",
  duracion = 700,
  desdeCero = false,
  className,
}: {
  valor: number;
  formato?: Formato;
  duracion?: number;
  /** Si true, la primera vez cuenta desde 0 cuando entra en pantalla. */
  desdeCero?: boolean;
  className?: string;
}) {
  const [mostrado, setMostrado] = useState(valor);
  const anterior = useRef(desdeCero ? 0 : valor);
  const ref = useRef<HTMLSpanElement>(null);
  const primera = useRef(true);

  useEffect(() => {
    const desde = anterior.current;
    anterior.current = valor;
    if (prefiereMenosMovimiento() || desde === valor) {
      setMostrado(valor);
      return;
    }
    let frame = 0;
    let cancelado = false;
    const animar = () => {
      const inicio = performance.now();
      const paso = (ahora: number) => {
        if (cancelado) return;
        const t = Math.min(1, (ahora - inicio) / duracion);
        setMostrado(desde + (valor - desde) * easeOut(t));
        if (t < 1) frame = requestAnimationFrame(paso);
      };
      setMostrado(desde);
      frame = requestAnimationFrame(paso);
    };
    // La primera animación desde cero espera a que la cifra sea visible.
    if (primera.current && desdeCero && ref.current && "IntersectionObserver" in window) {
      primera.current = false;
      // Si ya está en pantalla al cargar, se muestra tal cual: contar desde cero ahí sería un parpadeo.
      if (ref.current.getBoundingClientRect().top < window.innerHeight) {
        setMostrado(valor);
        return;
      }
      setMostrado(0);
      const io = new IntersectionObserver(
        ([e]) => {
          if (e.isIntersecting) {
            io.disconnect();
            animar();
          }
        },
        { threshold: 0.6 },
      );
      io.observe(ref.current);
      return () => {
        cancelado = true;
        io.disconnect();
        cancelAnimationFrame(frame);
      };
    }
    primera.current = false;
    animar();
    return () => {
      cancelado = true;
      cancelAnimationFrame(frame);
    };
  }, [valor, duracion, desdeCero]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      <span aria-hidden>{formatear(mostrado, formato)}</span>
      <span className="sr-only">{formatear(valor, formato)}</span>
    </span>
  );
}
