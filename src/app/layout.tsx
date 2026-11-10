import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "@fontsource-variable/fraunces";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";
import "./ui.css";
import { Busqueda, type IndiceBusqueda } from "@/components/Busqueda";
import { Logo, MarcaGreca } from "@/components/Iconos";
import { OyenteTransiciones } from "@/components/movimiento/EnlaceTransicion";
import { NavEnlace } from "@/components/NavEnlace";
import { BotonBuscar, NavInferior } from "@/components/Navegacion";
import { RegistrarSW } from "@/components/RegistrarSW";
import { CabeceraCuenta } from "@/components/tienda/CabeceraCuenta";
import { Toasts } from "@/components/tienda/Toasts";
import { categorias, estados, productos, proveedores, tiposProducto } from "@/lib/catalogo";

const urlSitio =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(urlSitio),
  title: {
    default: "Provana · Proveedores mexicanos confiables",
    template: "%s · Provana",
  },
  description:
    "Provana arma tu surtido con proveedores mexicanos verificados: compara mayoreo, pedidos mínimos, envío a tu estado y confianza, y te dice cuánto ahorras.",
  applicationName: "Provana",
  appleWebApp: { capable: true, title: "Provana", statusBarStyle: "default" },
  openGraph: {
    locale: "es_MX",
    siteName: "Provana",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Provana: proveedores mexicanos confiables" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1712" },
  ],
  viewportFit: "cover",
};

function indiceBusqueda(): IndiceBusqueda {
  const conOferta = new Set(productos.filter((p) => p.estado === "activo").map((p) => p.tipoId));
  const nombreCat = (id: string) => {
    const c = categorias.find((x) => x.id === id);
    const padre = c?.padreId ? categorias.find((x) => x.id === c.padreId) : null;
    return padre ? `${padre.nombre} · ${c!.nombre}` : (c?.nombre ?? id);
  };
  const tipos = tiposProducto
    .filter((t) => conOferta.has(t.id))
    .map((t) => ({ id: t.id, nombre: t.nombre, categoriaId: t.categoriaId, categoria: nombreCat(t.categoriaId) }));
  return {
    tipos,
    categorias: categorias
      .map((c) => ({ id: c.id, nombre: nombreCat(c.id), numTipos: tipos.filter((t) => t.categoriaId === c.id).length }))
      .filter((c) => c.numTipos > 0),
    proveedores: proveedores
      .filter((p) => p.verificacion === "verificado")
      .map((p) => ({
        id: p.id,
        nombre: p.nombre,
        lugar: `${p.ciudad}, ${estados.find((e) => e.clave === p.estado)?.nombre ?? p.estado}`,
      })),
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX">
      <body>
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>
        <p className="aviso-demo">
          <strong>Modo demostración.</strong> Proveedores, productos y precios son datos de ejemplo; envíos y pagos
          son simulados.
        </p>
        <header className="cabecera">
          <div className="wrap cabecera-in">
            <Link href="/" className="marca" aria-label="Provana, inicio">
              <Logo />
              <span>Provana</span>
            </Link>
            <nav className="nav" aria-label="Principal">
              <NavEnlace href="/catalogo" className="nav-sec">
                Catálogo
              </NavEnlace>
              <NavEnlace href="/proveedores" className="nav-sec">
                Proveedores
              </NavEnlace>
              <NavEnlace href="/surtido" className="nav-sec">
                Surtido
              </NavEnlace>
              <BotonBuscar className="boton-buscar" />
              <CabeceraCuenta />
            </nav>
          </div>
        </header>
        <main id="contenido">{children}</main>
        <footer className="pie">
          <div className="greca-borde" aria-hidden />
          <div className="wrap pie-in">
            <div className="pie-marca">
              <MarcaGreca className="pie-greca" />
              <p>
                Provana conecta emprendedores con proveedores mexicanos verificados. Solo México, solo pesos
                mexicanos.
              </p>
            </div>
            <nav aria-label="Legal" className="pie-legal">
              <Link href="/legal/terminos">Términos de uso</Link>
              <Link href="/legal/privacidad">Aviso de privacidad</Link>
              <Link href="/legal/envios">Política de envíos</Link>
              <Link href="/legal/devoluciones">Devoluciones</Link>
              <Link href="/legal/antifraude">Reglas contra fraude</Link>
            </nav>
            <p>
              Proyecto de curso en modo demostración. Los proveedores, productos, precios y calificaciones son
              datos de ejemplo; los envíos y pagos son simulados.
            </p>
          </div>
        </footer>
        <NavInferior />
        <Busqueda indice={indiceBusqueda()} />
        <OyenteTransiciones />
        <Toasts />
        <RegistrarSW />
      </body>
    </html>
  );
}
