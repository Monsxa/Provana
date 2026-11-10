"use client";
import { Scale, X } from "lucide-react";
import Link from "next/link";
import { TRAZO } from "@/components/Iconos";
import { alternarComparar, useComparar } from "@/components/tienda/comparar";
import { Cargando } from "@/components/tienda/Requiere";
import { mostrarAviso } from "@/components/tienda/Toasts";
import { estados, tarifas } from "@/lib/catalogo";
import { cotizarEnvio } from "@/lib/surtido/envio";
import { pesos, unidades } from "@/lib/surtido/formato";
import { confianza, estadisticas, usuarioDe, useTienda } from "@/lib/tienda/almacen";

export default function Comparar() {
  const s = useTienda();
  const ids = useComparar();
  if (!s) return <div className="wrap pagina"><Cargando /></div>;
  const prods = ids.map((id) => s.productos.find((p) => p.id === id)).filter((p) => !!p);
  const destino = usuarioDe(s)?.direcciones[0]?.estado ?? "CDMX";

  if (prods.length === 0) {
    return (
      <div className="wrap pagina">
        <div className="vacio-estado greca">
          <span className="icono-grande"><Scale strokeWidth={TRAZO} aria-hidden /></span>
          <h1 style={{ fontSize: 26 }}>Elige hasta 3 productos para comparar</h1>
          <p>En el catálogo, toca el ícono de balanza en cada producto.</p>
          <Link className="btn btn-primary" href="/catalogo">Ir al catálogo</Link>
        </div>
      </div>
    );
  }

  const filas = prods.map((p) => {
    const prov = s.proveedores.find((x) => x.id === p.proveedorId)!;
    const est = estadisticas(s, prov.id);
    const envio = prov.enviaA.includes(destino) ? cotizarEnvio(prov.estado, destino, 1, tarifas, estados) : null;
    return {
      p,
      prov,
      menudeo: p.precioMenudeo,
      mayoreo: p.escalones.at(-1)?.precioUnitario ?? p.precioMenudeo,
      minimo: p.pedidoMinimo,
      calif: est.numResenas ? est.sumaEstrellas / est.numResenas : 0,
      confianza: confianza(s, prov.id),
      entrega: envio ? envio.diasMax + prov.diasPreparacion : Infinity,
    };
  });
  // Lo mejor de cada fila: menor en precios, mínimo y entrega; mayor en calificación y confianza.
  const mejor = (k: keyof (typeof filas)[0], mayor = false) => {
    const vals = filas.map((f) => f[k] as number);
    return mayor ? Math.max(...vals) : Math.min(...vals);
  };
  const filasTabla: { nombre: string; k: keyof (typeof filas)[0]; mayor?: boolean; fmt: (f: (typeof filas)[0]) => string }[] = [
    { nombre: "Precio de menudeo (+ IVA)", k: "menudeo", fmt: (f) => pesos(f.menudeo) },
    { nombre: "Mejor precio de mayoreo", k: "mayoreo", fmt: (f) => pesos(f.mayoreo) },
    { nombre: "Pedido mínimo", k: "minimo", fmt: (f) => unidades(f.minimo, f.p.unidad) },
    { nombre: "Calificación", k: "calif", mayor: true, fmt: (f) => `${f.calif.toFixed(1)} ★` },
    { nombre: "Confianza", k: "confianza", mayor: true, fmt: (f) => `${f.confianza}/100` },
    { nombre: `Entrega a ${estados.find((e) => e.clave === destino)?.nombre}`, k: "entrega", fmt: (f) => (f.entrega === Infinity ? "No envía" : `hasta ${f.entrega} días`) },
  ];

  return (
    <div className="wrap pagina">
      <div className="pagina-cabecera">
        <div>
          <h1>Comparar</h1>
          <p>Marcamos con ✓ lo mejor de cada fila.</p>
        </div>
      </div>
      <div className="tarjeta tabla-envoltura" role="region" aria-label="Tabla comparativa" tabIndex={0}>
        <table className="tabla" style={{ minWidth: 560 }}>
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Concepto</span></th>
              {filas.map((f) => (
                <th key={f.p.id} scope="col">
                  <div className="pila" style={{ gap: 4 }}>
                    <Link href={`/producto/${f.p.id}`} style={{ color: "var(--ink)", fontSize: 15 }}>{f.p.nombre}</Link>
                    <span className="chico suave" style={{ fontWeight: 400 }}>{f.prov.nombre}</span>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => mostrarAviso(alternarComparar(f.p.id, f.p.nombre))}>
                      <X strokeWidth={TRAZO} width={14} height={14} aria-hidden /> Quitar
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filasTabla.map((fila) => {
              const m = mejor(fila.k, fila.mayor);
              return (
                <tr key={fila.nombre}>
                  <th scope="row" className="suave" style={{ fontWeight: 600 }}>{fila.nombre}</th>
                  {filas.map((f) => {
                    const gana = filas.length > 1 && (f[fila.k] as number) === m && m !== Infinity;
                    return (
                      <td key={f.p.id} className="num" style={gana ? { color: "var(--accent)", fontWeight: 700 } : undefined}>
                        {fila.fmt(f)} {gana && <span aria-label="mejor de la fila">✓</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
