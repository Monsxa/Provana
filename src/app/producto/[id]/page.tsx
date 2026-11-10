import type { Metadata } from "next";
import { productos, proveedores, tiposProducto } from "@/lib/catalogo";
import { FichaProducto } from "./FichaProducto";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return productos.map((p) => ({ id: p.id }));
}
// Los productos nuevos de proveedores se crean en la demo y se muestran del lado del navegador.
export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = productos.find((x) => x.id === id);
  if (!p) return { title: "Producto" };
  const prov = proveedores.find((x) => x.id === p.proveedorId);
  return {
    title: p.nombre,
    description: `${p.nombre} de ${prov?.nombre}, proveedor mexicano verificado. Desde $${(p.precioMenudeo / 100).toFixed(2)} + IVA, mayoreo disponible.`,
  };
}

export default async function Pagina({ params }: Props) {
  const { id } = await params;
  const p = productos.find((x) => x.id === id);
  const prov = p && proveedores.find((x) => x.id === p.proveedorId);
  const tipo = p && tiposProducto.find((t) => t.id === p.tipoId);
  // Datos estructurados de producto (schema.org) para buscadores.
  const jsonLd =
    p && prov
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: p.nombre,
          description: p.descripcion || tipo?.descripcion,
          category: tipo?.nombre,
          brand: { "@type": "Brand", name: prov.nombre },
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "MXN",
            lowPrice: ((p.escalones.at(-1)?.precioUnitario ?? p.precioMenudeo) / 100).toFixed(2),
            highPrice: (p.precioMenudeo / 100).toFixed(2),
            availability: p.existencias > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            seller: { "@type": "Organization", name: prov.nombre, address: { "@type": "PostalAddress", addressRegion: prov.estado, addressCountry: "MX" } },
          },
          aggregateRating: prov.estadisticas.numResenas
            ? { "@type": "AggregateRating", ratingValue: (prov.estadisticas.sumaEstrellas / prov.estadisticas.numResenas).toFixed(1), reviewCount: prov.estadisticas.numResenas }
            : undefined,
        }
      : null;
  return (
    <div className="wrap pagina">
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      <FichaProducto id={id} nombreInicial={p?.nombre} />
    </div>
  );
}
