/** Iconos SVG propios, trazo de 1.8 px, heredan el color del texto. */
type P = { className?: string; title?: string };

const base = (title?: string) =>
  title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const };

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

export function Escudo({ className, title }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...base(title)}>
      <path d="M12 2 21 6.5V13c0 5-3.6 8.2-9 9-5.4-.8-9-4-9-9V6.5L12 2Z" fill="currentColor" />
      <path d="M8.2 12.3 11 15l5-6" stroke="var(--surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Bandera({ className, title }: P) {
  // Tres franjas verticales, sin escudo: identifica "Negocio mexicano".
  return (
    <svg viewBox="0 0 24 24" className={className} {...base(title)}>
      <rect x="2" y="5" width="20" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3" y="6" width="6" height="12" fill="#1d6f52" />
      <rect x="15" y="6" width="6" height="12" fill="#c8312b" />
    </svg>
  );
}

export function Mas({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Quitar({ className, title }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} {...base(title)}>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Camion({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3.5 3.5v2.5h-7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="6.5" cy="17" r="1.8" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17" cy="17" r="1.8" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function Alerta({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 3.5 22 20H2L12 3.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 10v4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="17.3" r="1" fill="currentColor" />
    </svg>
  );
}

export function Flecha({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
