"use client";
/** Carrito, avisos y cuenta en la cabecera. */
import { Bell, CircleUser, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { TRAZO } from "@/components/Iconos";
import { carritoDe, usuarioDe, useTienda } from "@/lib/tienda/almacen";

export function CabeceraCuenta() {
  const s = useTienda();
  const u = s ? usuarioDe(s) : null;
  const enCarrito = s ? carritoDe(s).length : 0;
  const sinLeer = s && u ? s.avisos.filter((a) => a.usuarioId === u.id && !a.leido).length : 0;
  const cuenta = !u ? "/entrar" : u.rol === "proveedor" ? "/panel" : u.rol === "admin" ? "/admin" : "/cuenta";
  return (
    <div className="cabecera-cuenta">
      {u && (
        <Link href="/avisos" className="icono-cabecera" aria-label={`Avisos${sinLeer ? `, ${sinLeer} sin leer` : ""}`}>
          <Bell strokeWidth={TRAZO} aria-hidden />
          {sinLeer > 0 && <span className="contador">{sinLeer}</span>}
        </Link>
      )}
      <Link href="/carrito" className="icono-cabecera" aria-label={`Carrito${enCarrito ? `, ${enCarrito} productos` : ", vacío"}`}>
        <ShoppingCart strokeWidth={TRAZO} aria-hidden />
        {enCarrito > 0 && <span className="contador">{enCarrito}</span>}
      </Link>
      <Link href={cuenta} className="icono-cabecera cuenta" aria-label={u ? `Mi cuenta: ${u.nombre}` : "Entrar"}>
        <CircleUser strokeWidth={TRAZO} aria-hidden />
        <span className="cuenta-texto">{u ? u.nombre.split(" ")[0] : "Entrar"}</span>
      </Link>
    </div>
  );
}
