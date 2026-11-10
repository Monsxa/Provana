import { ArrowRight, Clock, PackageCheck, Star, Truck } from "lucide-react";
import Link from "next/link";
import { AnilloConfianza } from "@/components/AnilloConfianza";
import { SelloDemo, SelloMexicano, SelloVerificado, TRAZO } from "@/components/Iconos";
import { Cifra } from "@/components/movimiento/Cifra";
import { EnlaceTransicion } from "@/components/movimiento/EnlaceTransicion";
import { Revelar } from "@/components/movimiento/Revelar";
import {
  catalogoParaSurtido,
  confianzaPorProveedor,
  desgloseConfianza,
  estados,
  productos,
  proveedores,
  tarifas,
} from "@/lib/catalogo";
import { iniciales, pesos } from "@/lib/surtido/formato";
import { resolverSurtido } from "@/lib/surtido/motor";
import { CONFIG_INICIAL } from "@/lib/surtido/tipos";
import h from "./inicio.module.css";

const nombreEstado = (c: string) => estados.find((e) => e.clave === c)?.nombre ?? c;

export default function Inicio() {
  const verificados = proveedores.filter((p) => p.verificacion === "verificado");
  const resenas = verificados.reduce((s, p) => s + p.estadisticas.numResenas, 0);
  const promedio = verificados.reduce((s, p) => s + p.estadisticas.sumaEstrellas, 0) / Math.max(1, resenas);
  const activos = productos.filter((p) => p.estado === "activo").length;

  // El ejemplo de la portada es un cálculo real del motor con los datos de ejemplo.
  const ejemplo = resolverSurtido(
    [
      { tipoId: "vela-soya-200g", cantidad: 40 },
      { tipoId: "bolsa-kraft-mediana", cantidad: 500 },
      { tipoId: "cafe-altura-1kg", cantidad: 10 },
    ],
    "JAL",
    catalogoParaSurtido(),
    CONFIG_INICIAL,
  );

  const destacados = [...verificados]
    .sort((a, b) => (confianzaPorProveedor.get(b.id) ?? 0) - (confianzaPorProveedor.get(a.id) ?? 0))
    .slice(0, 4);

  return (
    <>
      <section className={h.heroBanda}>
        <div className={`${h.heroFondo} greca`} aria-hidden>
          <div className={h.heroVelo} />
        </div>
        <div className={`wrap ${h.hero}`}>
          <div className={h.heroTexto}>
            <h1>Dinos qué necesitas. Te decimos a quién comprárselo.</h1>
            <p className={h.lead}>
              Provana compara proveedores mexicanos verificados por precio de mayoreo, pedido mínimo, envío a tu
              estado y confianza, y arma el surtido que te cuesta menos puesto en tu negocio.
            </p>
            <div className={h.ctas}>
              <Link href="/surtido" className="btn btn-primary">
                Armar mi surtido <ArrowRight strokeWidth={TRAZO} className={h.flecha} aria-hidden />
              </Link>
              <Link href="/catalogo" className="btn btn-ghost">
                Ver catálogo
              </Link>
            </div>
            <dl className={h.cifras}>
              <div>
                <dt>proveedores verificados</dt>
                <dd className="num">{verificados.length}</dd>
              </div>
              <div>
                <dt>calificación promedio</dt>
                <dd className="num">{promedio.toFixed(1)} ★</dd>
              </div>
              <div>
                <dt>productos activos</dt>
                <dd className="num">{activos}</dd>
              </div>
              <div>
                <dt>estados con envío</dt>
                <dd className="num">{estados.length}</dd>
              </div>
            </dl>
            <p className={h.notaCifras}>Cifras de los datos de ejemplo de esta demostración.</p>
          </div>

          <figure className={h.muestra} aria-label="Ejemplo real de un surtido calculado por Provana">
            <div className={h.muestraCabecera}>
              <p>40 velas · 500 bolsas kraft · 10 kg de café</p>
              <p className={h.muestraDestino}>Envío a Jalisco</p>
            </div>
            <ul className={h.muestraGrupos}>
              {ejemplo.grupos.map((g) => (
                <li key={g.proveedorId}>
                  <div>
                    <p className={h.muestraProveedor}>{g.proveedorNombre}</p>
                    <p className={h.muestraLineas}>
                      {g.lineas.map((l) => l.nombre.split(" — ")[0]).join(" + ")} · desde {nombreEstado(g.estadoOrigen)}
                    </p>
                  </div>
                  <p className="num">{pesos(g.total)}</p>
                </li>
              ))}
            </ul>
            <div className={h.muestraTotal}>
              <p>Total con envío e IVA</p>
              <p className="num">{pesos(ejemplo.totales.total)}</p>
            </div>
            {ejemplo.ahorro && ejemplo.ahorro.centavos > 0 && ejemplo.referencia && (
              <p className={h.muestraAhorro}>
                <span className="num">{pesos(ejemplo.ahorro.centavos)}</span> menos que comprar con{" "}
                {ejemplo.referencia.proveedores.join(" y ")}
              </p>
            )}
          </figure>
        </div>
      </section>

      <section id="como-funciona" className={`wrap ${h.seccion}`}>
        <div className={h.seccionCabecera}>
          <h2>De tu lista al pedido, sin cotizar uno por uno</h2>
          <p>Cuatro pasos entre saber qué necesitas y tenerlo en tu negocio.</p>
        </div>
        <Revelar as="ol" className={h.pasos}>
          <li>
            <h3>Escribe tu lista</h3>
            <p>Productos, cantidades y el estado al que te envían. Puedes mezclar categorías.</p>
          </li>
          <li>
            <h3>Comparamos por ti</h3>
            <p>Mayoreo, pedidos mínimos, existencias, envío por paquete y la confianza de cada proveedor.</p>
          </li>
          <li>
            <h3>Ves el porqué</h3>
            <p>Cada producto trae su explicación y cuánto costaría con otro proveedor. Tú decides.</p>
          </li>
          <li>
            <h3>Compras con pago protegido</h3>
            <p>El pago queda retenido hasta que confirmas la entrega. En esta demostración es simulado.</p>
          </li>
        </Revelar>
      </section>

      <section id="proveedores" className={`wrap ${h.seccion}`}>
        <div className={h.seccionCabecera}>
          <h2>Proveedores con historial, no promesas</h2>
          <p>
            Solo aparecen negocios mexicanos verificados. La confianza sale de sus calificaciones, pedidos
            completados, disputas y tiempo de respuesta.
          </p>
        </div>
        <Revelar as="ul" className={h.proveedores}>
          {destacados.map((p) => {
            const e = p.estadisticas;
            const pct = e.pedidosCerrados ? Math.round((e.pedidosCompletados / e.pedidosCerrados) * 100) : 0;
            const anio = new Date(p.desde).getFullYear();
            return (
              <li key={p.id} className={h.proveedor}>
                <div className={h.provCabecera}>
                  <span className={h.avatar} aria-hidden style={{ viewTransitionName: `prov-${p.id}` }}>
                    {iniciales(p.nombre)}
                  </span>
                  <div className={h.provNombre}>
                    <h3>
                      <EnlaceTransicion href={`/proveedores/${p.id}`} className={h.provEnlace}>
                        {p.nombre}
                      </EnlaceTransicion>
                    </h3>
                    <p className={h.provMeta}>
                      {p.ciudad}, {nombreEstado(p.estado)} · desde {anio}
                    </p>
                  </div>
                  <AnilloConfianza desglose={desgloseConfianza(p.id)!} />
                </div>
                <div className={h.sellos}>
                  <SelloVerificado />
                  <SelloMexicano />
                  <SelloDemo />
                </div>
                <dl className={h.provCifras}>
                  <div>
                    <dt>
                      <Star strokeWidth={TRAZO} aria-hidden /> Calificación
                    </dt>
                    <dd className="num">
                      <Cifra valor={e.sumaEstrellas / Math.max(1, e.numResenas)} formato="decimal1" desdeCero /> (
                      {e.numResenas})
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <PackageCheck strokeWidth={TRAZO} aria-hidden /> Completados
                    </dt>
                    <dd className="num">
                      <Cifra valor={pct} formato="porcentaje" desdeCero />
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <Clock strokeWidth={TRAZO} aria-hidden /> Responde en
                    </dt>
                    <dd className="num">~{e.horasRespuesta} h</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </Revelar>
      </section>

      <section id="envios" className={`wrap ${h.seccion}`}>
        <div className={h.seccionCabecera}>
          <h2>Un paquete por proveedor, con tarifa clara</h2>
          <p>
            El envío se cobra una vez por proveedor, por eso juntar productos con uno puede salir más barato.
            Precios sin IVA; cada kilo extra suma según la zona.
          </p>
        </div>
        <div className={h.tablaEnvio} role="region" aria-label="Tarifas de envío por zona" tabIndex={0}>
          <table>
            <thead>
              <tr>
                <th scope="col">Zona</th>
                <th scope="col">Cuándo aplica</th>
                <th scope="col">Tiempo</th>
                <th scope="col">Base</th>
                <th scope="col">Por kg</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["local", "Local", "Mismo estado"],
                  ["regional", "Regional", "Misma región del país"],
                  ["nacional", "Nacional", "Cualquier otro estado"],
                ] as const
              ).map(([z, nombre, cuando]) => (
                <tr key={z}>
                  <th scope="row">{nombre}</th>
                  <td>{cuando}</td>
                  <td>
                    {tarifas.zonas[z].diasMin}–{tarifas.zonas[z].diasMax} días
                  </td>
                  <td className="num">{pesos(tarifas.zonas[z].base)}</td>
                  <td className="num">{pesos(tarifas.zonas[z].porKg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={h.notaTabla}>
            <Truck strokeWidth={TRAZO} className={h.flecha} aria-hidden /> Zona extendida (
            {tarifas.zonaExtendida.estados.map(nombreEstado).join(", ")}): +{pesos(tarifas.zonaExtendida.recargo)} y{" "}
            {tarifas.zonaExtendida.diasExtra} días más. Modo demostración: envíos simulados.
          </p>
        </div>
      </section>

      <section id="vender" className={`wrap ${h.seccion}`}>
        <div className={h.vender}>
          <div>
            <h2>¿Eres proveedor? Vende en Provana</h2>
            <p>
              Llega a emprendedores de todo México que comparan por precio y confianza. Cada pedido completado y
              cada reseña real suben tu confianza y te ponen primero en el surtido.
            </p>
          </div>
          <div className={h.venderNota}>
            <p>Regístrate, sube tu RFC, identificación, comprobante de domicilio y fotos de tu taller. Al verificarte, tus productos aparecen en el catálogo.</p>
            <Link href="/entrar?modo=crear&rol=proveedor" className="btn btn-amber" style={{ marginTop: 16 }}>
              Quiero vender en Provana
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
