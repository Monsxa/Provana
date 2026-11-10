import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Doc = { titulo: string; secciones: [string, string][] };

const DOCS: Record<string, Doc> = {
  terminos: {
    titulo: "Términos de uso",
    secciones: [
      ["Qué es Provana", "Provana es un mercado en línea que conecta a emprendedores (compradores) con proveedores y productores mexicanos. Provana no fabrica ni vende los productos: cada proveedor es responsable de lo que publica y vende."],
      ["Quién puede usarlo", "Personas mayores de edad y negocios con domicilio en México. Los proveedores deben tener RFC vigente y pasar la verificación de identidad, domicilio y operación antes de aparecer en el catálogo."],
      ["Precios y moneda", "Todos los precios están en pesos mexicanos (MXN). Los proveedores capturan precios sin IVA e indican si cobran IVA (16 %); el total a pagar se muestra desglosado antes de confirmar."],
      ["Pago protegido", "El pago se retiene hasta que el comprador confirma la entrega o hasta que pasan los días de liberación definidos por Provana después de la entrega. Si el comprador reporta un problema, el pago se detiene hasta que administración resuelve."],
      ["Comisión", "Provana cobra al proveedor una comisión por venta sobre el valor de los productos, sin incluir envío. El porcentaje vigente se muestra en el panel del proveedor."],
      ["Cancelaciones", "El comprador puede cancelar sin costo mientras el proveedor no haya empezado a preparar el pedido. Después, aplica la política de devoluciones."],
      ["Conducta", "Está prohibido publicar productos ilegales, falsificados o sin los permisos sanitarios que exige la ley, manipular reseñas o intentar cerrar ventas fuera de la plataforma para evitar la protección del pago."],
      ["Modo demostración", "Esta versión es una demostración académica: no se procesan pagos reales, los envíos son simulados y los proveedores mostrados son datos de ejemplo."],
    ],
  },
  privacidad: {
    titulo: "Aviso de privacidad",
    secciones: [
      ["Responsable", "Provana es responsable del tratamiento de los datos personales que nos proporcionas, conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares."],
      ["Datos que tratamos", "Nombre, correo, teléfono, direcciones de envío, RFC y datos de facturación. De los proveedores, además: identificación oficial, comprobante de domicilio y fotos del taller para verificar el negocio. No guardamos números completos de tarjeta."],
      ["Para qué los usamos", "Crear y administrar tu cuenta, verificar proveedores, procesar pedidos, envíos y facturas, prevenir fraude, atender disputas y enviarte avisos de tus pedidos. Con tu permiso, avisos de bajadas de precio."],
      ["Con quién los compartimos", "Con el proveedor al que le compras (datos de envío y facturación), con paqueterías y procesadores de pago cuando estén conectados, y con autoridades cuando la ley lo exija."],
      ["Tus derechos ARCO", "Puedes acceder, rectificar, cancelar u oponerte al uso de tus datos, y revocar tu consentimiento, escribiendo a privacidad@provana.example. Responderemos en los plazos que marca la ley."],
      ["Documentos privados", "Los documentos de verificación de proveedores son privados: solo los ve administración y no aparecen en la tienda pública."],
      ["Cookies y almacenamiento", "Usamos almacenamiento del navegador solo para que la app funcione (sesión, carrito, preferencias). No usamos cookies de publicidad. En la demostración, todo se guarda únicamente en tu navegador."],
    ],
  },
  envios: {
    titulo: "Política de envíos",
    secciones: [
      ["Cobertura", "Enviamos dentro de los 32 estados de México. Cada proveedor elige a qué estados envía; si no envía a tu estado, no podrás comprarle. No hacemos envíos internacionales."],
      ["Un envío por proveedor", "Cada proveedor arma su propio paquete. Si compras a dos proveedores, recibes dos paquetes con dos guías."],
      ["Costo", "Se calcula con el peso cobrable (el mayor entre peso real y volumétrico: largo × ancho × alto ÷ 5000) y la zona: local, regional o nacional. Algunos destinos son zona extendida y tienen un recargo y días extra."],
      ["Tiempos", "Días hábiles de preparación del proveedor más el tiempo de la paquetería. Las fechas que mostramos son estimadas."],
      ["Perecederos", "Los productos perecederos solo se ofrecen cuando la paquetería llega dentro del tiempo máximo que aguantan."],
      ["Seguimiento", "Cuando el proveedor genera la guía, la verás en tu pedido. En la demostración, las guías y entregas son simuladas."],
    ],
  },
  devoluciones: {
    titulo: "Política de devoluciones",
    secciones: [
      ["Antes de la preparación", "Puedes cancelar sin costo y recibes el reembolso completo."],
      ["Si algo llega mal", "Usa “Tuve un problema con mi pedido” dentro de tu pedido antes de confirmar la entrega. Detenemos el pago al proveedor y administración revisa el caso con ambas partes."],
      ["Resolución", "Administración puede liberar el pago al proveedor, ordenar un reembolso parcial (por ejemplo, por piezas dañadas) o un reembolso total."],
      ["Plazos", "Si no reportas nada ni confirmas, el pago se libera automáticamente a los días de liberación vigentes después de la entrega."],
      ["Productos personalizados o perecederos", "Pueden tener condiciones especiales que el proveedor indica en su ficha. Siempre aplican si el producto llega dañado o distinto a lo publicado."],
    ],
  },
  antifraude: {
    titulo: "Reglas contra fraude",
    secciones: [
      ["Paga siempre dentro de Provana", "Solo así tu dinero queda protegido. Nadie de Provana te pedirá pagar por transferencia directa a un proveedor."],
      ["Verificación de proveedores", "Revisamos RFC, identificación oficial, comprobante de domicilio en México y fotos del lugar de trabajo antes de publicar una tienda."],
      ["Reseñas reales", "Solo puede reseñar quien completó un pedido con ese proveedor, una vez por pedido. Las reseñas se pueden reportar y administración puede ocultarlas si violan las reglas."],
      ["Tarjetas", "No guardamos el número completo de tu tarjeta. En la demostración solo se aceptan tarjetas de prueba: no uses tarjetas reales."],
      ["Límites de uso", "Limitamos el número de solicitudes por minuto para evitar abusos."],
      ["Reporta", "Si algo te parece sospechoso, escribe a seguridad@provana.example o usa “Reportar” en la reseña o “Tuve un problema” en tu pedido."],
    ],
  },
};

type Props = { params: Promise<{ doc: string }> };

export function generateStaticParams() {
  return Object.keys(DOCS).map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = DOCS[(await params).doc];
  return d ? { title: d.titulo } : {};
}

export default async function Legal({ params }: Props) {
  const { doc } = await params;
  const d = DOCS[doc];
  if (!d) notFound();
  return (
    <article className="wrap pagina" style={{ maxWidth: 760 }}>
      <div className="pagina-cabecera">
        <div>
          <h1>{d.titulo}</h1>
          <p>Texto base para revisión legal. No es asesoría jurídica; debe revisarlo un abogado antes de operar.</p>
        </div>
      </div>
      {d.secciones.map(([t, c]) => (
        <section key={t} className="pila" style={{ gap: 6 }}>
          <h2 style={{ fontSize: 21 }}>{t}</h2>
          <p style={{ color: "var(--ink-soft)" }}>{c}</p>
        </section>
      ))}
      <nav aria-label="Otros documentos" className="fila chico">
        {Object.entries(DOCS).filter(([k]) => k !== doc).map(([k, v]) => <Link key={k} href={`/legal/${k}`}>{v.titulo}</Link>)}
      </nav>
    </article>
  );
}
