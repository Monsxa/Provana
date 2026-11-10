/**
 * Permisos por rol. En esta demostración se aplican en la capa de datos (almacen.ts),
 * no solo en la pantalla: cada acción revisa quién la pide antes de cambiar algo.
 * Con Supabase, estas mismas reglas pasan a políticas de seguridad por fila (RLS).
 */
import type { Pedido, Rol, Usuario } from "./tipos";

export type Actor = "comprador" | "proveedor" | "admin" | "sistema";

export class SinPermiso extends Error {}

export function exigirRol(usuario: Usuario | null, ...roles: Rol[]): asserts usuario is Usuario {
  if (!usuario) throw new SinPermiso("Inicia sesión para continuar.");
  if (!roles.includes(usuario.rol)) throw new SinPermiso("Tu cuenta no tiene permiso para esto.");
}

/** ¿Este usuario puede ver este pedido? Comprador: los suyos. Proveedor: los de su tienda. Admin: todos. */
export function puedeVerPedido(usuario: Usuario | null, pedido: Pedido): boolean {
  if (!usuario) return false;
  if (usuario.rol === "admin") return true;
  if (usuario.rol === "proveedor") return usuario.proveedorId === pedido.proveedorId;
  return usuario.id === pedido.compradorId;
}

/** Actor de un usuario frente a un pedido, o null si no tiene relación. */
export function actorEn(usuario: Usuario | null, pedido: Pedido): Actor | null {
  if (!usuario) return null;
  if (usuario.rol === "admin") return "admin";
  if (usuario.rol === "proveedor" && usuario.proveedorId === pedido.proveedorId) return "proveedor";
  if (usuario.id === pedido.compradorId) return "comprador";
  return null;
}
