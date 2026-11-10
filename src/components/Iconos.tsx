/**
 * Íconos: un solo juego (Lucide, trazo 1.75). Aquí solo viven las marcas propias:
 * el logo y la marca del sello "Negocio mexicano" (greca escalonada).
 */
import { BadgeCheck } from "lucide-react";

export const TRAZO = 1.75;

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none" aria-hidden>
      <path d="M15 1.6 27.5 8.6V21.4L15 28.4 2.5 21.4V8.6L15 1.6Z" fill="var(--accent)" />
      <path
        d="M9.5 15.2 13.2 19l7.3-7.8"
        stroke="var(--accent-on)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Marca de greca escalonada para el sello "Negocio mexicano". */
export function MarcaGreca({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M3 20h4V8h10v8h-5v-4h-2v6h9V4H3v16"
        stroke="currentColor"
        strokeWidth={TRAZO}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Sellos con la misma familia visual: verificado y negocio mexicano. */
export function SelloVerificado() {
  return (
    <span className="sello sello-verificado">
      <BadgeCheck strokeWidth={TRAZO} aria-hidden /> Verificado
    </span>
  );
}

export function SelloMexicano() {
  return (
    <span className="sello sello-mx">
      <MarcaGreca /> Negocio mexicano
    </span>
  );
}

export function SelloDemo() {
  return <span className="sello sello-demo">Datos de ejemplo</span>;
}
