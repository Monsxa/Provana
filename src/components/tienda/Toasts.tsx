"use client";
/** Avisos flotantes cortos y específicos ("Agregamos 48 velas a tu carrito"). Entrada 250 ms, salida 150 ms. */
import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { TRAZO } from "@/components/Iconos";

interface Toast {
  id: number;
  texto: string;
  enlace?: { href: string; texto: string };
  saliendo?: boolean;
}
let siguiente = 1;
let lista: Toast[] = [];
const oyentes = new Set<(t: Toast[]) => void>();
const emitir = () => oyentes.forEach((o) => o([...lista]));

export function mostrarAviso(texto: string, enlace?: Toast["enlace"]) {
  const t = { id: siguiente++, texto, enlace };
  lista = [...lista.slice(-2), t];
  emitir();
  window.setTimeout(() => {
    lista = lista.map((x) => (x.id === t.id ? { ...x, saliendo: true } : x));
    emitir();
    window.setTimeout(() => {
      lista = lista.filter((x) => x.id !== t.id);
      emitir();
    }, 150);
  }, 3800);
}

export function Toasts() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    oyentes.add(setItems);
    return () => {
      oyentes.delete(setItems);
    };
  }, []);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="toast" data-saliendo={t.saliendo || undefined} data-fundido>
          <CircleCheck strokeWidth={TRAZO} aria-hidden />
          <p>
            {t.texto}{" "}
            {t.enlace && <Link href={t.enlace.href}>{t.enlace.texto}</Link>}
          </p>
        </div>
      ))}
    </div>
  );
}
