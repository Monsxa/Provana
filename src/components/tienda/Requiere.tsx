"use client";
/** Muestra el contenido solo con sesión y rol adecuados; si no, invita a entrar. */
import { LogIn } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { TRAZO } from "@/components/Iconos";
import { usuarioDe, useTienda } from "@/lib/tienda/almacen";
import type { EstadoTienda, Rol, Usuario } from "@/lib/tienda/tipos";

export function Cargando() {
  return (
    <div className="pila" aria-busy="true" aria-label="Cargando">
      <span className="esqueleto" style={{ height: 40, width: "40%" }} />
      <span className="esqueleto" style={{ height: 120 }} />
      <span className="esqueleto" style={{ height: 120 }} />
    </div>
  );
}

export function Requiere({ roles, children }: { roles: Rol[]; children: (s: EstadoTienda, u: Usuario) => ReactNode }) {
  const s = useTienda();
  const ruta = usePathname();
  if (!s) return <Cargando />;
  const u = usuarioDe(s);
  if (!u || !roles.includes(u.rol)) {
    return (
      <div className="vacio-estado">
        <span className="icono-grande"><LogIn strokeWidth={TRAZO} aria-hidden /></span>
        <h2>{u ? "Esta sección es para otra cuenta" : "Entra para continuar"}</h2>
        <p>{u ? `Tu cuenta es de ${u.rol}. Entra con una cuenta de ${roles.join(" o ")}.` : "Necesitas iniciar sesión para ver esta página."}</p>
        <Link className="btn btn-primary" href={`/entrar?volver=${encodeURIComponent(ruta)}`}>Entrar</Link>
      </div>
    );
  }
  return <>{children(s, u)}</>;
}
