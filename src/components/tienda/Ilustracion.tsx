/** Ilustración por categoría mientras el proveedor no sube fotos (íconos Lucide, sin fotos falsas). */
import { Coffee, Flame, Leaf, Package, Shirt, Sparkles } from "lucide-react";
import { TRAZO } from "@/components/Iconos";
import { categorias, tiposProducto } from "@/lib/catalogo";

const ICONOS = { hogar: Flame, empaque: Package, "empaque-sostenible": Leaf, alimentos: Coffee, textiles: Shirt, cuidado: Sparkles };

export function Ilustracion({ tipoId, fotos, nombre, className }: { tipoId: string; fotos?: string[]; nombre: string; className?: string }) {
  if (fotos?.length) {
    // eslint-disable-next-line @next/next/no-img-element
    return <div className={`ilustracion ${className ?? ""}`}><img src={fotos[0]} alt={nombre} /></div>;
  }
  const cat = tiposProducto.find((t) => t.id === tipoId)?.categoriaId ?? "empaque";
  const I = ICONOS[cat as keyof typeof ICONOS] ?? Package;
  const nombreCat = categorias.find((c) => c.id === cat)?.nombre ?? "";
  return (
    <div className={`ilustracion greca ${className ?? ""}`} role="img" aria-label={`${nombreCat}: sin foto todavía`}>
      <I strokeWidth={1.25} aria-hidden />
    </div>
  );
}
void TRAZO;
