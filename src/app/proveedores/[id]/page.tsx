import { ArrowLeft, CalendarDays, Clock, MapPin, PackageCheck, Plus, Star, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnilloConfianza } from "@/components/AnilloConfianza";
import { SelloDemo, SelloMexicano, SelloVerificado, TRAZO } from "@/components/Iconos";
import { Cifra } from "@/components/movimiento/Cifra";
import { Revelar } from "@/components/movimiento/Revelar";
import { VideoDiferido } from "@/components/VideoDiferido";
import { VIDEOS, VIDEOS_PROVEEDOR } from "@/config/videos";
import { desgloseConfianza, estados, productos, proveedores } from "@/lib/catalogo";
import { iniciales, pesos, unidades } from "@/lib/surtido/formato";
import f from "./ficha.module.css";

type Props = { params: Promise<{ id: string }> };

const verificado = (id: string) => proveedores.find((p) => p.id === id && p.verificacion === "verificado");
const nombreEstado = (c: string) => estados.find((e) => e.clave === c)?.nombre ?? c;

export function generateStaticParams() {
  return proveedores.filter((p) => p.verificacion === "verificado").map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = verificado((await params).id);
  if (!p) return {};
  return {
    title: p.nombre,
    description: `${p.nombre}: ${p.descripcion} Proveedor verificado en ${p.ciudad}, ${nombreEstado(p.estado)}.`,
  };
}

export default async function FichaProveedor({ params }: Props) {
  const p = verificado((await params).id);
  if (!p) notFound();
  const e = p.estadisticas;
  const desglose = desgloseConfianza(p.id)!;
  const suyos = productos.filter((x) => x.proveedorId === p.id && x.estado === "activo");
  const pct = e.pedidosCerrados ? Math.round((e.pedidosCompletados / e.pedidosCerrados) * 100) : 0;
  const video = VIDEOS_PROVEEDOR[p.id] ?? VIDEOS.proveedor;
  const anios = Math.max(0, new Date().getFullYear() - new Date(p.desde).getFullYear());

  return (
    <div className={`wrap ${f.pagina}`}>
      <Link href="/#proveedores" className={f.volver}>
        <ArrowLeft strokeWidth={TRAZO} aria-hidden /> Proveedores
      </Link>

      <header className={f.cabecera}>
        <span className={f.avatar} aria-hidden style={{ viewTransitionName: `prov-${p.id}` }}>
          {iniciales(p.nombre)}
        </span>
        <div className={f.titulo}>
          <h1>{p.nombre}</h1>
          <p className={f.lugar}>
            <MapPin strokeWidth={TRAZO} aria-hidden /> {p.ciudad}, {nombreEstado(p.estado)}
          </p>
          <div className={f.sellos}>
            <SelloVerificado />
            <SelloMexicano />
            <SelloDemo />
          </div>
        </div>
      </header>

      <p className={f.descripcion}>{p.descripcion}</p>

      <div className={f.rejilla}>
        <section className={f.tarjeta} aria-labelledby="t-confianza">
          <h2 id="t-confianza">Confianza</h2>
          <AnilloConfianza desglose={desglose} tam="lg" abierto />
        </section>

        <section className={f.tarjeta} aria-labelledby="t-cifras">
          <h2 id="t-cifras">En números</h2>
          <dl className={f.cifras}>
            <div>
              <dt>
                <Star strokeWidth={TRAZO} aria-hidden /> Calificación
              </dt>
              <dd className="num">
                <Cifra valor={e.numResenas ? e.sumaEstrellas / e.numResenas : 0} formato="decimal1" desdeCero />
                <small> · {e.numResenas} reseñas</small>
              </dd>
            </div>
            <div>
              <dt>
                <PackageCheck strokeWidth={TRAZO} aria-hidden /> Pedidos completados
              </dt>
              <dd className="num">
                <Cifra valor={pct} formato="porcentaje" desdeCero />
                <small> · de {e.pedidosCerrados.toLocaleString("es-MX")}</small>
              </dd>
            </div>
            <div>
              <dt>
                <Clock strokeWidth={TRAZO} aria-hidden /> Responde en
              </dt>
              <dd>{e.horasRespuesta === null ? "Sin datos" : `~${e.horasRespuesta} h`}</dd>
            </div>
            <div>
              <dt>
                <Truck strokeWidth={TRAZO} aria-hidden /> Prepara en
              </dt>
              <dd>
                {p.diasPreparacion} {p.diasPreparacion === 1 ? "día" : "días"} · envía a {p.enviaA.length} estados
              </dd>
            </div>
            <div>
              <dt>
                <CalendarDays strokeWidth={TRAZO} aria-hidden /> En Provana
              </dt>
              <dd>{anios === 0 ? "Desde este año" : `${anios} ${anios === 1 ? "año" : "años"}`}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className={f.seccion} aria-labelledby="t-video">
        <h2 id="t-video">El taller</h2>
        <div className={f.video}>
          <VideoDiferido video={video} modo="clip" className={f.videoEl} />
          {!video.mp4 && !video.webm && (
            <p className={f.videoNota}>Modo demostración: aquí va un clip de 10 a 20 s del taller del proveedor.</p>
          )}
        </div>
      </section>

      <section className={f.seccion} aria-labelledby="t-productos">
        <h2 id="t-productos">Productos ({suyos.length})</h2>
        <Revelar as="ul" className={f.productos}>
          {suyos.map((x) => (
            <li key={x.id} className={f.producto}>
              <div className={f.prodCabecera}>
                <h3>{x.nombre}</h3>
                <p className={`num ${f.precio}`}>
                  {pesos(x.precioMenudeo)} <small>+ IVA / {x.unidad}</small>
                </p>
              </div>
              {x.escalones.length > 0 && (
                <table className={f.escalones}>
                  <caption className="sr-only">Precios de mayoreo</caption>
                  <tbody>
                    {x.escalones.map((esc) => (
                      <tr key={esc.cantidadMinima}>
                        <th scope="row">Desde {unidades(esc.cantidadMinima, x.unidad)}</th>
                        <td className="num">{pesos(esc.precioUnitario)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className={f.prodPie}>
                <span>
                  Mínimo {unidades(x.pedidoMinimo, x.unidad)} · {x.existencias.toLocaleString("es-MX")} disponibles
                </span>
                <Link href={`/surtido?agregar=${x.tipoId}`} className="btn btn-ghost btn-sm">
                  <Plus strokeWidth={TRAZO} aria-hidden className={f.iconoBtn} /> Agregar al surtido
                </Link>
              </div>
            </li>
          ))}
        </Revelar>
      </section>
    </div>
  );
}
