"use client";
/**
 * Video con carga diferida.
 * - No descarga nada hasta que el video entra en pantalla (sin <source> en el HTML inicial).
 * - Fondo: silenciado, en bucle, se pausa fuera de pantalla.
 * - No carga con ahorro de datos (Save-Data) ni con conexión 2G.
 * - Con movimiento reducido no se reproduce solo: queda el poster.
 * - Clip con controles: se carga al entrar en pantalla y solo se reproduce si la persona lo pide.
 */
import { useEffect, useRef, useState } from "react";
import type { Video } from "@/config/videos";

type Conexion = { saveData?: boolean; effectiveType?: string };

function conexionLimitada(): boolean {
  const c = (navigator as Navigator & { connection?: Conexion }).connection;
  return !!c && (c.saveData === true || c.effectiveType === "2g" || c.effectiveType === "slow-2g");
}

export function VideoDiferido({
  video,
  modo,
  className,
}: {
  video: Video;
  modo: "fondo" | "clip";
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [cargar, setCargar] = useState(false);
  const hayFuente = !!(video.mp4 || video.webm);

  useEffect(() => {
    const el = ref.current;
    if (!el || !hayFuente || !("IntersectionObserver" in window)) return;
    if (conexionLimitada()) return;
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (modo === "fondo" && reducido) return;

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setCargar(true);
          if (modo === "fondo") el.play().catch(() => {});
        } else if (modo === "fondo") {
          el.pause();
        }
      },
      { threshold: 0.15 },
    );
    // El fondo de la portada espera a que la página termine de cargar para no competir con lo importante.
    const iniciar = () => io.observe(el);
    if (modo === "fondo" && document.readyState !== "complete") {
      window.addEventListener("load", iniciar, { once: true });
    } else iniciar();
    return () => {
      io.disconnect();
      window.removeEventListener("load", iniciar);
    };
  }, [hayFuente, modo]);

  // Al agregar las fuentes hay que llamar load() para que el navegador las tome.
  useEffect(() => {
    const el = ref.current;
    if (!cargar || !el) return;
    el.load();
    if (modo === "fondo") el.play().catch(() => {});
  }, [cargar, modo]);

  const decorativo = modo === "fondo";
  return (
    <video
      ref={ref}
      className={className}
      poster={video.poster}
      muted={decorativo}
      loop={decorativo}
      playsInline
      preload="none"
      controls={!decorativo && hayFuente}
      aria-hidden={decorativo || undefined}
      aria-label={decorativo ? undefined : video.descripcion}
      tabIndex={decorativo ? -1 : undefined}
      data-cargado={cargar || undefined}
    >
      {cargar && video.webm && <source src={video.webm} type="video/webm" />}
      {cargar && video.mp4 && <source src={video.mp4} type="video/mp4" />}
    </video>
  );
}
