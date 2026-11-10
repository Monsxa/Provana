"use client";
/**
 * Puntaje de confianza 0–100 con anillo animado y desglose de factores.
 * - El anillo se dibuja al entrar en pantalla (stroke-dashoffset, 600 ms ease-out).
 *   Excepción consciente a "solo transform/opacity": es un SVG de 48–96 px y el costo de pintado es mínimo.
 * - El desglose abre un popover que sale desde el anillo (transform-origin arriba a la izquierda).
 */
import { useEffect, useId, useRef, useState } from "react";
import type { DesgloseConfianza } from "@/lib/catalogo";
import s from "./AnilloConfianza.module.css";

export function AnilloConfianza({
  desglose,
  tam = "md",
  abierto: abiertoFijo,
}: {
  desglose: DesgloseConfianza;
  tam?: "sm" | "md" | "lg";
  /** Muestra el desglose siempre (ficha de proveedor) en vez de en popover. */
  abierto?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const r = 20;
  const circ = 2 * Math.PI * r;
  const nivel = desglose.total >= 85 ? "alta" : desglose.total >= 70 ? "media" : "baja";

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return setVisible(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setVisible(true), io.disconnect()), {
      threshold: 0.5,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", cerrar);
    document.addEventListener("keydown", cerrar);
    return () => {
      document.removeEventListener("mousedown", cerrar);
      document.removeEventListener("keydown", cerrar);
    };
  }, [abierto]);

  const anillo = (
    <svg viewBox="0 0 48 48" className={s.svg} aria-hidden>
      <circle cx="24" cy="24" r={r} className={s.pista} />
      <circle
        cx="24"
        cy="24"
        r={r}
        className={s.valor}
        data-nivel={nivel}
        strokeDasharray={circ}
        strokeDashoffset={visible ? circ * (1 - desglose.total / 100) : circ}
      />
    </svg>
  );

  const lista = (
    <ul className={s.factores}>
      {desglose.factores.map((f) => (
        <li key={f.clave}>
          <div className={s.factorFila}>
            <span>{f.nombre}</span>
            <span className="num">
              {f.puntos}/{f.maximo}
            </span>
          </div>
          <div className={s.barra} aria-hidden>
            <span style={{ transform: `scaleX(${visible || abiertoFijo === undefined ? f.puntos / f.maximo : 0})` }} />
          </div>
          <p className={s.detalle}>{f.detalle}</p>
        </li>
      ))}
    </ul>
  );

  if (abiertoFijo) {
    return (
      <div ref={ref} className={s.fijo} data-tam={tam}>
        <div className={s.anillo} role="img" aria-label={`Confianza ${desglose.total} de 100`}>
          {anillo}
          <span className={`num ${s.numero}`}>{desglose.total}</span>
        </div>
        {lista}
      </div>
    );
  }

  return (
    <div ref={ref} className={s.contenedor} data-tam={tam}>
      <button
        type="button"
        className={s.boton}
        aria-expanded={abierto}
        aria-controls={id}
        onClick={() => setAbierto((a) => !a)}
      >
        <span className={s.anillo}>
          {anillo}
          <span className={`num ${s.numero}`}>{desglose.total}</span>
        </span>
        <span className={s.etiqueta}>
          Confianza<span className="sr-only"> {desglose.total} de 100. Ver desglose</span>
        </span>
      </button>
      <div id={id} className={s.popover} data-abierto={abierto || undefined} role="region" aria-label="Desglose de confianza" hidden={!abierto}>
        <p className={s.popTitulo}>
          Confianza <span className="num">{desglose.total}</span>/100
        </p>
        {lista}
      </div>
    </div>
  );
}
