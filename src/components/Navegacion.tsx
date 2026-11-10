"use client";
/** Botón de búsqueda (cabecera) y barra de navegación inferior para celular. */
import { House, LayoutGrid, ListChecks, Search, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { TRAZO } from "@/components/Iconos";
import { abrirBusqueda } from "./Busqueda";

export function BotonBuscar({ className }: { className?: string }) {
  const [mac, setMac] = useState(false);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);
  return (
    <button type="button" className={className} onClick={abrirBusqueda} aria-keyshortcuts="Control+K Meta+K">
      <Search strokeWidth={TRAZO} aria-hidden />
      <span>Buscar</span>
      <kbd>{mac ? "⌘K" : "Ctrl K"}</kbd>
    </button>
  );
}

export function NavInferior() {
  const ruta = usePathname();
  const items = [
    { href: "/", nombre: "Inicio", Icono: House, activo: ruta === "/" },
    { href: "/surtido", nombre: "Surtido", Icono: ListChecks, activo: ruta.startsWith("/surtido") },
    { href: "/catalogo", nombre: "Catálogo", Icono: LayoutGrid, activo: ruta.startsWith("/catalogo") || ruta.startsWith("/producto") },
    { href: "/carrito", nombre: "Carrito", Icono: ShoppingCart, activo: ruta.startsWith("/carrito") || ruta.startsWith("/checkout") },
  ];
  return (
    <nav className="nav-inferior" aria-label="Navegación inferior">
      {items.map(({ href, nombre, Icono, activo }) => (
        <Link key={nombre} href={href} aria-current={activo ? "page" : undefined}>
          <Icono strokeWidth={TRAZO} aria-hidden />
          {nombre}
        </Link>
      ))}
      <button type="button" onClick={abrirBusqueda}>
        <Search strokeWidth={TRAZO} aria-hidden />
        Buscar
      </button>
    </nav>
  );
}
