import { Star } from "lucide-react";

export function Estrellas({ valor, tam = 16 }: { valor: number; tam?: number }) {
  return (
    <span className="estrellas" role="img" aria-label={`${valor.toFixed(1)} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} strokeWidth={1.75} width={tam} height={tam} data-llena={valor >= n - 0.25 || undefined} aria-hidden />
      ))}
    </span>
  );
}
