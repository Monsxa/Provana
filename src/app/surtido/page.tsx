import type { Metadata } from "next";
import { categorias, desgloseConfianza, estados, productos, proveedores, tiposProducto, variantesPorTipo } from "@/lib/catalogo";
import { Surtidor, type OpcionesSurtidor } from "./Surtidor";
import s from "./surtido.module.css";

export const metadata: Metadata = {
  title: "Surtido inteligente",
  description:
    "Escribe qué necesitas y cuánto. Provana elige la mejor combinación de proveedores mexicanos por precio de mayoreo, pedido mínimo, envío a tu estado y confianza.",
};

export default function PaginaSurtido() {
  const conOferta = new Set(productos.filter((p) => p.estado === "activo").map((p) => p.tipoId));
  const opciones: OpcionesSurtidor = {
    estados: estados.map((e) => ({ clave: e.clave, nombre: e.nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    grupos: categorias
      .map((c) => ({
        categoria: c.padreId ? `${categorias.find((p) => p.id === c.padreId)?.nombre} · ${c.nombre}` : c.nombre,
        tipos: tiposProducto
          .filter((t) => t.categoriaId === c.id && conOferta.has(t.id))
          .map((t) => ({ id: t.id, nombre: t.nombre, unidad: t.unidad })),
      }))
      .filter((g) => g.tipos.length > 0),
    variantes: variantesPorTipo(),
    confianza: Object.fromEntries(proveedores.map((p) => [p.id, desgloseConfianza(p.id)!])),
  };

  return (
    <div className={`wrap ${s.pagina}`}>
      <header className={s.encabezado}>
        <h1>Surtido inteligente</h1>
        <p>
          Dinos qué necesitas, cuánto y a qué estado. Comparamos el mayoreo, los pedidos mínimos, el
          envío y la confianza de cada proveedor, y armamos la combinación que te cuesta menos puesta
          en tu negocio.
        </p>
      </header>
      <Surtidor opciones={opciones} />
    </div>
  );
}
