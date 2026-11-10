"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Mensajes } from "@/components/tienda/Mensajes";
import { Requiere } from "@/components/tienda/Requiere";

function Contenido() {
  const proveedor = useSearchParams().get("proveedor");
  return <Requiere roles={["comprador", "proveedor"]}>{(s, u) => <Mensajes s={s} u={u} inicial={proveedor} />}</Requiere>;
}

export default function Pagina() {
  return (
    <div className="wrap pagina">
      <div className="pagina-cabecera"><div><h1>Mensajes</h1><p>Habla con el proveedor sin salir de Provana. Te avisamos cuando te respondan.</p></div></div>
      <Suspense><Contenido /></Suspense>
    </div>
  );
}
