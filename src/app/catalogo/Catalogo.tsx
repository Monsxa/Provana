"use client";
import { SearchX, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { TRAZO } from "@/components/Iconos";
import { BarraComparar } from "@/components/tienda/BarraComparar";
import { Cargando } from "@/components/tienda/Requiere";
import { TarjetaProducto } from "@/components/tienda/TarjetaProducto";
import { categorias, estados, tarifas, tiposProducto } from "@/lib/catalogo";
import { cotizarEnvio } from "@/lib/surtido/envio";
import { normalizar } from "@/lib/surtido/formato";
import { estadisticas, productosVisibles, useTienda } from "@/lib/tienda/almacen";

const ORDENES = {
  relevancia: "Más relevantes",
  menudeo: "Menor precio de menudeo",
  mayoreo: "Menor precio de mayoreo",
  calificacion: "Mejor calificación",
  descuento: "Mayor descuento por volumen",
  pedidos: "Más pedidos",
} as const;

export function Catalogo() {
  const s = useTienda();
  const params = useSearchParams();
  const router = useRouter();
  const ruta = usePathname();
  const [abiertos, setAbiertos] = useState(false);
  const p = (k: string) => params.get(k) ?? "";

  const poner = (k: string, v: string) => {
    const n = new URLSearchParams(params.toString());
    if (v) n.set(k, v);
    else n.delete(k);
    router.replace(`${ruta}?${n.toString()}`, { scroll: false });
  };

  const resultado = useMemo(() => {
    if (!s) return [];
    const q = normalizar(p("q"));
    const cat = p("categoria");
    const origen = p("origen");
    const destino = p("destino");
    const min = p("min") ? Number(p("min")) * 100 : 0;
    const max = p("max") ? Number(p("max")) * 100 : Infinity;
    const calif = Number(p("calificacion") || 0);
    const minimoMax = p("minimo") ? Number(p("minimo")) : Infinity;
    const entrega = p("entrega") ? Number(p("entrega")) : Infinity;
    const lista = productosVisibles(s).map((x) => {
      const prov = s.proveedores.find((v) => v.id === x.proveedorId)!;
      const est = estadisticas(s, prov.id);
      const tipo = tiposProducto.find((t) => t.id === x.tipoId)!;
      const catProd = categorias.find((c) => c.id === tipo.categoriaId)!;
      const texto = normalizar([x.nombre, x.descripcion, prov.nombre, prov.ciudad, tipo.nombre, catProd.nombre, Object.values(x.variante ?? {}).join(" ")].join(" "));
      const mayoreo = x.escalones.at(-1)?.precioUnitario ?? x.precioMenudeo;
      const dias = destino ? cotizarEnvio(prov.estado, destino, 1, tarifas, estados).diasMax + prov.diasPreparacion : 0;
      return {
        x,
        prov,
        texto,
        mayoreo,
        calif: est.numResenas ? est.sumaEstrellas / est.numResenas : 0,
        pedidos: est.pedidosTotales,
        descuento: 1 - mayoreo / x.precioMenudeo,
        dias,
        cat: catProd,
      };
    });
    const filtrada = lista.filter(
      (r) =>
        (!q || q.split(/\s+/).every((w) => r.texto.includes(w))) &&
        (!cat || r.cat.id === cat || r.cat.padreId === cat) &&
        (!origen || r.prov.estado === origen) &&
        (!destino || r.prov.enviaA.includes(destino)) &&
        r.x.precioMenudeo >= min &&
        r.x.precioMenudeo <= max &&
        r.calif >= calif &&
        r.x.pedidoMinimo <= minimoMax &&
        (!destino || r.dias <= entrega),
    );
    const orden = (p("orden") || "relevancia") as keyof typeof ORDENES;
    const cmp: Record<keyof typeof ORDENES, (a: (typeof lista)[0], b: (typeof lista)[0]) => number> = {
      relevancia: (a, b) => (q ? (b.texto.indexOf(q) === -1 ? 0 : 1) - (a.texto.indexOf(q) === -1 ? 0 : 1) : 0) || b.calif - a.calif,
      menudeo: (a, b) => a.x.precioMenudeo - b.x.precioMenudeo,
      mayoreo: (a, b) => a.mayoreo - b.mayoreo,
      calificacion: (a, b) => b.calif - a.calif,
      descuento: (a, b) => b.descuento - a.descuento,
      pedidos: (a, b) => b.pedidos - a.pedidos,
    };
    return filtrada.sort(cmp[orden] ?? cmp.relevancia);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, params]);

  if (!s) return <Cargando />;
  const activos = ["categoria", "origen", "destino", "min", "max", "calificacion", "minimo", "entrega"].filter((k) => p(k)).length;

  return (
    <>
      <div className="pagina-cabecera">
        <div>
          <h1>Catálogo</h1>
          <p>Solo productos de proveedores mexicanos verificados. Precios sin IVA.</p>
        </div>
      </div>

      <div className="tarjeta" style={{ gap: 12 }}>
        <div className="fila" style={{ alignItems: "end" }}>
          <div className="campo" style={{ flex: "1 1 260px" }}>
            <label htmlFor="q">Buscar</label>
            <input id="q" type="search" defaultValue={p("q")} placeholder="Velas, cafe, bolsa kraft, Oaxaca…" onChange={(e) => poner("q", e.target.value)} />
          </div>
          <div className="campo" style={{ flex: "1 1 200px" }}>
            <label htmlFor="orden">Ordenar por</label>
            <select id="orden" value={p("orden") || "relevancia"} onChange={(e) => poner("orden", e.target.value === "relevancia" ? "" : e.target.value)}>
              {Object.entries(ORDENES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <button type="button" className="btn btn-ghost" aria-expanded={abiertos} aria-controls="filtros" onClick={() => setAbiertos((a) => !a)}>
            <SlidersHorizontal strokeWidth={TRAZO} width={18} height={18} aria-hidden /> Filtros{activos ? ` (${activos})` : ""}
          </button>
        </div>
        <div id="filtros" hidden={!abiertos} className="campos-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
          <div className="campo">
            <label htmlFor="f-cat">Categoría</label>
            <select id="f-cat" value={p("categoria")} onChange={(e) => poner("categoria", e.target.value)}>
              <option value="">Todas</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.padreId ? `— ${c.nombre}` : c.nombre}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="f-destino">Envía a mi estado</label>
            <select id="f-destino" value={p("destino")} onChange={(e) => poner("destino", e.target.value)}>
              <option value="">Cualquiera</option>
              {estados.map((e) => <option key={e.clave} value={e.clave}>{e.nombre}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="f-origen">Estado del proveedor</label>
            <select id="f-origen" value={p("origen")} onChange={(e) => poner("origen", e.target.value)}>
              <option value="">Cualquiera</option>
              {estados.map((e) => <option key={e.clave} value={e.clave}>{e.nombre}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="f-min">Precio desde ($)</label>
            <input id="f-min" inputMode="decimal" defaultValue={p("min")} onChange={(e) => poner("min", e.target.value.replace(/[^\d.]/g, ""))} />
          </div>
          <div className="campo">
            <label htmlFor="f-max">Precio hasta ($)</label>
            <input id="f-max" inputMode="decimal" defaultValue={p("max")} onChange={(e) => poner("max", e.target.value.replace(/[^\d.]/g, ""))} />
          </div>
          <div className="campo">
            <label htmlFor="f-calif">Calificación</label>
            <select id="f-calif" value={p("calificacion")} onChange={(e) => poner("calificacion", e.target.value)}>
              <option value="">Cualquiera</option>
              <option value="4.5">4.5 ★ o más</option>
              <option value="4">4 ★ o más</option>
            </select>
          </div>
          <div className="campo">
            <label htmlFor="f-minimo">Pedido mínimo hasta</label>
            <input id="f-minimo" inputMode="numeric" defaultValue={p("minimo")} onChange={(e) => poner("minimo", e.target.value.replace(/\D/g, ""))} />
          </div>
          <div className="campo">
            <label htmlFor="f-entrega">Llega en máximo (días)</label>
            <input id="f-entrega" inputMode="numeric" defaultValue={p("entrega")} disabled={!p("destino")} onChange={(e) => poner("entrega", e.target.value.replace(/\D/g, ""))} />
            {!p("destino") && <p className="ayuda">Elige primero tu estado.</p>}
          </div>
          {activos > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: "end" }} onClick={() => router.replace(ruta + (p("q") ? `?q=${encodeURIComponent(p("q"))}` : ""))}>
              Quitar filtros
            </button>
          )}
        </div>
      </div>

      <p className="suave chico" aria-live="polite">
        {resultado.length === 1 ? "1 producto" : `${resultado.length} productos`}
      </p>

      {resultado.length === 0 ? (
        <div className="vacio-estado greca">
          <span className="icono-grande"><SearchX strokeWidth={TRAZO} aria-hidden /></span>
          <h2>No encontramos productos con esos filtros</h2>
          <p>Prueba con otra palabra o quita algún filtro. También puedes pedirle a Provana que te arme el surtido.</p>
          <a className="btn btn-primary" href="/catalogo">Ver todo el catálogo</a>
        </div>
      ) : (
        <ul className="rejilla-productos">
          {resultado.map((r, i) => (
            <TarjetaProducto key={r.x.id} p={r.x} s={s} indice={i} />
          ))}
        </ul>
      )}
      <BarraComparar />
    </>
  );
}
