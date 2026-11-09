/**
 * Límite de peticiones por IP (ventana deslizante en memoria).
 * Limitación conocida: en Vercel cada instancia tiene su propia memoria, así que el
 * límite es por instancia. Para un límite global se cambia por Upstash Redis.
 */
const ventanas = new Map<string, number[]>();

export function permitir(clave: string, maximo: number, ventanaMs: number, ahora = Date.now()): boolean {
  const desde = ahora - ventanaMs;
  const lista = (ventanas.get(clave) ?? []).filter((t) => t > desde);
  if (lista.length >= maximo) {
    ventanas.set(clave, lista);
    return false;
  }
  lista.push(ahora);
  ventanas.set(clave, lista);
  if (ventanas.size > 5000) {
    // Limpieza simple para que el mapa no crezca sin fin.
    for (const [k, v] of ventanas) if (v.every((t) => t <= desde)) ventanas.delete(k);
  }
  return true;
}

export function ipDe(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
}
