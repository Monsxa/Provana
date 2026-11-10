/**
 * Capa de pagos intercambiable. Hoy solo existe el proveedor SIMULADO:
 * no cobra nada, no guarda números de tarjeta y solo acepta tarjetas de prueba.
 * Para conectar uno real (Stripe Connect, Mercado Pago) se implementa `ProveedorPagos`
 * con la misma interfaz y se cambia `pagos` al final de este archivo.
 */
import type { MetodoPago } from "./tipos";

export interface DatosTarjeta {
  numero: string;
  vencimiento: string; // MM/AA
  cvv: string;
  titular: string;
}

export type ResultadoCobro =
  | { ok: true; estado: "aprobado"; referencia: string; ultimos4: string }
  | { ok: true; estado: "pendiente"; referencia: string; instrucciones: string; venceEn: string }
  | { ok: false; error: string };

export interface ProveedorPagos {
  nombre: string;
  modoDemostracion: boolean;
  cobrar(metodo: MetodoPago, monto: number, datos: { tarjeta?: DatosTarjeta; folio: string; ahora: Date }): ResultadoCobro;
}

/** Tarjetas de prueba aceptadas (las mismas que usan los procesadores en modo sandbox). */
export const TARJETAS_PRUEBA: Record<string, "aprobada" | "rechazada"> = {
  "4242424242424242": "aprobada",
  "5555555555554444": "aprobada",
  "4000000000000002": "rechazada",
};

export function luhn(numero: string): boolean {
  const d = numero.replace(/\D/g, "");
  if (d.length < 13 || d.length > 19) return false;
  let suma = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    suma += n;
  }
  return suma % 10 === 0;
}

function referencia(prefijo: string, folio: string): string {
  let h = 7;
  for (const c of folio) h = (h * 33 + c.charCodeAt(0)) >>> 0;
  return `${prefijo}${String(h).padStart(10, "0")}`;
}

export const pagosSimulados: ProveedorPagos = {
  nombre: "Simulado",
  modoDemostracion: true,
  cobrar(metodo, monto, { tarjeta, folio, ahora }) {
    if (!Number.isInteger(monto) || monto <= 0) return { ok: false, error: "El monto no es válido." };
    if (metodo === "tarjeta") {
      if (!tarjeta) return { ok: false, error: "Faltan los datos de la tarjeta." };
      const numero = tarjeta.numero.replace(/\D/g, "");
      if (!luhn(numero)) return { ok: false, error: "El número de tarjeta no es válido." };
      const tipo = TARJETAS_PRUEBA[numero];
      if (!tipo)
        return {
          ok: false,
          error: "Modo demostración: solo aceptamos tarjetas de prueba, como 4242 4242 4242 4242. No uses tarjetas reales.",
        };
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(tarjeta.vencimiento)) return { ok: false, error: "Usa el formato MM/AA." };
      const [mm, aa] = tarjeta.vencimiento.split("/").map(Number);
      if (new Date(2000 + aa, mm, 1) <= ahora) return { ok: false, error: "La tarjeta está vencida." };
      if (!/^\d{3,4}$/.test(tarjeta.cvv)) return { ok: false, error: "El código de seguridad tiene 3 o 4 dígitos." };
      if (tipo === "rechazada") return { ok: false, error: "El banco rechazó la tarjeta de prueba. Prueba con otra." };
      return { ok: true, estado: "aprobado", referencia: referencia("TAR", folio), ultimos4: numero.slice(-4) };
    }
    const vence = new Date(ahora.getTime() + 3 * 86_400_000).toISOString();
    if (metodo === "oxxo") {
      return {
        ok: true,
        estado: "pendiente",
        referencia: referencia("OXXO", folio),
        instrucciones: "Paga en cualquier tienda de conveniencia con esta referencia. Tienes 3 días.",
        venceEn: vence,
      };
    }
    return {
      ok: true,
      estado: "pendiente",
      referencia: `646180${referencia("", folio).padStart(12, "0").slice(-12)}`, // CLABE de 18 dígitos
      instrucciones: "Transfiere por SPEI a esta CLABE de demostración desde tu banca en línea.",
      venceEn: vence,
    };
  },
};

/** Proveedor activo. Cambiarlo aquí cuando exista uno real. */
export const pagos: ProveedorPagos = pagosSimulados;
