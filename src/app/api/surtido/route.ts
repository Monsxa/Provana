import { NextResponse } from "next/server";
import { catalogoParaSurtido } from "@/lib/catalogo";
import { SolicitudSurtidoSchema } from "@/lib/esquemas";
import { ipDe, permitir } from "@/lib/limite";
import { resolverSurtido } from "@/lib/surtido/motor";
import { CONFIG_INICIAL } from "@/lib/surtido/tipos";

/**
 * POST /api/surtido
 * Entrada: SolicitudSurtido (ver esquemas/solicitud-surtido.schema.json)
 * Salida: ResultadoSurtido (ver docs/api.md)
 */
export async function POST(req: Request) {
  if (!permitir(`surtido:${ipDe(req.headers)}`, 30, 60_000)) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Espera un minuto e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo debe ser JSON." }, { status: 400 });
  }

  const datos = SolicitudSurtidoSchema.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      {
        error: "Revisa los datos del surtido.",
        detalles: datos.error.issues.map((i) => ({ campo: i.path.join("."), mensaje: i.message })),
      },
      { status: 400 },
    );
  }

  const catalogo = catalogoParaSurtido();
  const { estadoDestino, prioridad, permitirExtra, renglones } = datos.data;
  if (!catalogo.estados.some((e) => e.clave === estadoDestino)) {
    return NextResponse.json({ error: "Ese estado no existe." }, { status: 400 });
  }

  const resultado = resolverSurtido(renglones, estadoDestino, catalogo, {
    ...CONFIG_INICIAL,
    prioridad,
    permitirExtra,
  });
  return NextResponse.json(resultado);
}
