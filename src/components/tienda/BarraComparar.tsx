"use client";
import Link from "next/link";
import { useTienda } from "@/lib/tienda/almacen";
import { limpiarComparar, useComparar } from "./comparar";

/** Barra flotante del comparador: aparece al elegir el primer producto. */
export function BarraComparar() {
  const ids = useComparar();
  const s = useTienda();
  if (!s || ids.length === 0) return null;
  return (
    <div className="comparador-barra" role="region" aria-label="Comparador" data-fundido>
      <span>
        {ids.length} de 3 para comparar
      </span>
      <button type="button" className="btn btn-sm" style={{ color: "var(--panel-ink)" }} onClick={limpiarComparar}>
        Limpiar
      </button>
      <Link href="/comparar" className="btn btn-amber btn-sm">
        Comparar
      </Link>
    </div>
  );
}
