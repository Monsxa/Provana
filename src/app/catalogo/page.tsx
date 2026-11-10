import type { Metadata } from "next";
import { Suspense } from "react";
import { Catalogo } from "./Catalogo";

export const metadata: Metadata = {
  title: "Catálogo de proveedores mexicanos",
  description: "Busca y compara productos de proveedores mexicanos verificados: precio de mayoreo, pedido mínimo, envío a tu estado y calificación.",
};

export default function Pagina() {
  return (
    <div className="wrap pagina">
      <Suspense>
        <Catalogo />
      </Suspense>
    </div>
  );
}
