"use client";
/**
 * Búsqueda global con ⌘K / Ctrl+K: productos (tipos), proveedores y categorías.
 * - Flechas ↑↓ mueven la selección al instante (sin animación: acción frecuente de teclado).
 * - Enter: producto → lo agrega al surtido; proveedor → abre su ficha; categoría → filtra sus productos.
 * - Abre con escala 0.97 + opacidad en 200 ms y cierra en 150 ms (salida más rápida).
 * - Esc cierra y devuelve el foco a donde estaba.
 */
import { Boxes, CornerDownLeft, Search, Store, Tag, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { TRAZO } from "@/components/Iconos";
import { normalizar } from "@/lib/surtido/formato";
import s from "./Busqueda.module.css";

export interface IndiceBusqueda {
  tipos: { id: string; nombre: string; categoriaId: string; categoria: string }[];
  proveedores: { id: string; nombre: string; lugar: string }[];
  categorias: { id: string; nombre: string; numTipos: number }[];
}

type Resultado =
  | { tipo: "producto"; id: string; titulo: string; sub: string }
  | { tipo: "proveedor"; id: string; titulo: string; sub: string }
  | { tipo: "categoria"; id: string; titulo: string; sub: string };

export const abrirBusqueda = () => window.dispatchEvent(new Event("provana:buscar"));

function coincide(texto: string, consulta: string): number {
  const t = normalizar(texto);
  if (!consulta) return 1;
  if (t.startsWith(consulta)) return 3;
  if (t.split(/\s+/).some((p) => p.startsWith(consulta))) return 2;
  return t.includes(consulta) ? 1 : 0;
}

export function Busqueda({ indice }: { indice: IndiceBusqueda }) {
  const [abierta, setAbierta] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [categoria, setCategoria] = useState<{ id: string; nombre: string } | null>(null);
  const [activo, setActivo] = useState(0);
  const entrada = useRef<HTMLInputElement>(null);
  const previo = useRef<HTMLElement | null>(null);
  const router = useRouter();
  const ruta = usePathname();
  const idLista = useId();

  const abrir = useCallback(() => {
    previo.current = document.activeElement as HTMLElement;
    setCerrando(false);
    setAbierta(true);
    setConsulta("");
    setCategoria(null);
    setActivo(0);
  }, []);

  const cerrar = useCallback(() => {
    setCerrando(true);
    window.setTimeout(() => {
      setAbierta(false);
      setCerrando(false);
      previo.current?.focus?.();
    }, 150);
  }, []);

  useEffect(() => {
    const teclas = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (abierta) cerrar();
        else abrir();
      }
    };
    const evento = () => abrir();
    window.addEventListener("keydown", teclas);
    window.addEventListener("provana:buscar", evento);
    return () => {
      window.removeEventListener("keydown", teclas);
      window.removeEventListener("provana:buscar", evento);
    };
  }, [abierta, abrir, cerrar]);

  useEffect(() => {
    if (abierta) requestAnimationFrame(() => entrada.current?.focus());
  }, [abierta]);

  const resultados = useMemo<Resultado[]>(() => {
    const q = normalizar(consulta);
    const puntuar = <T extends Resultado>(r: T, ...textos: string[]) => ({ r, p: Math.max(...textos.map((t) => coincide(t, q))) });
    let lista: { r: Resultado; p: number }[] = [];
    const tipos = indice.tipos.filter((t) => !categoria || t.categoriaId === categoria.id);
    lista.push(
      ...tipos.map((t) => puntuar({ tipo: "producto", id: t.id, titulo: t.nombre, sub: t.categoria }, t.nombre, t.categoria)),
    );
    if (!categoria) {
      lista.push(
        ...indice.categorias.map((c) =>
          puntuar({ tipo: "categoria", id: c.id, titulo: c.nombre, sub: `${c.numTipos} productos` }, c.nombre),
        ),
        ...indice.proveedores.map((p) =>
          puntuar({ tipo: "proveedor", id: p.id, titulo: p.nombre, sub: p.lugar }, p.nombre, p.lugar),
        ),
      );
    }
    lista = lista.filter((x) => x.p > 0);
    const orden = { categoria: 0, producto: 1, proveedor: 2 };
    lista.sort((a, b) => b.p - a.p || orden[a.r.tipo] - orden[b.r.tipo] || a.r.titulo.localeCompare(b.r.titulo, "es"));
    return lista.slice(0, 12).map((x) => x.r);
  }, [consulta, categoria, indice]);

  useEffect(() => setActivo(0), [consulta, categoria]);

  const elegir = (r: Resultado) => {
    if (r.tipo === "categoria") {
      setCategoria({ id: r.id, nombre: r.titulo });
      setConsulta("");
      entrada.current?.focus();
      return;
    }
    if (r.tipo === "proveedor") {
      cerrar();
      router.push(`/proveedores/${r.id}`);
      return;
    }
    cerrar();
    if (ruta === "/surtido") window.dispatchEvent(new CustomEvent("provana:agregar", { detail: r.id }));
    else router.push(`/surtido?agregar=${encodeURIComponent(r.id)}`);
  };

  if (!abierta) return null;

  const idActivo = resultados[activo] ? `${idLista}-${activo}` : undefined;
  const Icono = { producto: Boxes, proveedor: Store, categoria: Tag };
  const accion = { producto: "Agregar al surtido", proveedor: "Ver ficha", categoria: "Ver productos" };

  return (
    <div className={s.capa} data-cerrando={cerrando || undefined} onMouseDown={(e) => e.target === e.currentTarget && cerrar()}>
      <div className={s.panel} role="dialog" aria-modal="true" aria-label="Buscar en Provana" data-fundido>
        <div className={s.barra}>
          <Search strokeWidth={TRAZO} className={s.lupa} aria-hidden />
          {categoria && (
            <button type="button" className={s.chip} onClick={() => setCategoria(null)} aria-label={`Quitar filtro ${categoria.nombre}`}>
              {categoria.nombre} <X strokeWidth={TRAZO} aria-hidden />
            </button>
          )}
          <input
            ref={entrada}
            className={s.entrada}
            role="combobox"
            aria-expanded="true"
            aria-controls={idLista}
            aria-activedescendant={idActivo}
            aria-autocomplete="list"
            aria-label="Busca productos, proveedores o categorías"
            placeholder={categoria ? `Productos de ${categoria.nombre}…` : "Velas, café, Jalisco, empaque…"}
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActivo((a) => Math.min(resultados.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActivo((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter" && resultados[activo]) {
                e.preventDefault();
                elegir(resultados[activo]);
              } else if (e.key === "Escape") {
                e.preventDefault();
                cerrar();
              } else if (e.key === "Backspace" && !consulta && categoria) {
                setCategoria(null);
              } else if (e.key === "Tab") {
                e.preventDefault();
              }
            }}
          />
          <kbd className={s.tecla}>Esc</kbd>
        </div>
        <ul id={idLista} role="listbox" className={s.lista} aria-label="Resultados">
          {resultados.map((r, i) => {
            const I = Icono[r.tipo];
            return (
              <li
                key={`${r.tipo}-${r.id}`}
                id={`${idLista}-${i}`}
                role="option"
                aria-selected={i === activo}
                className={s.opcion}
                onMouseMove={() => i !== activo && setActivo(i)}
                onClick={() => elegir(r)}
              >
                <span className={s.icono}>
                  <I strokeWidth={TRAZO} aria-hidden />
                </span>
                <span className={s.texto}>
                  <span className={s.titulo}>{r.titulo}</span>
                  <span className={s.sub}>{r.sub}</span>
                </span>
                <span className={s.accion}>
                  {accion[r.tipo]} <CornerDownLeft strokeWidth={TRAZO} aria-hidden />
                </span>
              </li>
            );
          })}
          {resultados.length === 0 && <li className={s.vacio}>Sin resultados para “{consulta}”. Prueba con otra palabra.</li>}
        </ul>
        <p className={s.pie}>
          <kbd className={s.tecla}>↑</kbd> <kbd className={s.tecla}>↓</kbd> para moverte · <kbd className={s.tecla}>Enter</kbd>{" "}
          para elegir
        </p>
      </div>
    </div>
  );
}
