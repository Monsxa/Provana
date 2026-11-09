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
import { Logo } from "@/components/Iconos";
import { NavEnlace } from "@/components/NavEnlace";

const urlSitio = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(urlSitio),
  title: {
    default: "Provana · Proveedores mexicanos confiables",
    template: "%s · Provana",
  },
  description:
    "Provana arma tu surtido con proveedores mexicanos verificados: compara mayoreo, pedidos mínimos, envío a tu estado y confianza, y te dice cuánto ahorras.",
  openGraph: { locale: "es_MX", siteName: "Provana", type: "website" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f6f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1512" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX">
      <body>
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>
        <p className="aviso-demo">
          Versión de demostración: proveedores, productos y precios son datos de ejemplo.
        </p>
        <header className="cabecera">
          <div className="wrap cabecera-in">
            <Link href="/" className="marca" aria-label="Provana, inicio">
              <Logo />
              <span>Provana</span>
            </Link>
            <nav className="nav" aria-label="Principal">
              <NavEnlace href="/#como-funciona" className="nav-sec">
                Cómo funciona
              </NavEnlace>
              <NavEnlace href="/#proveedores" className="nav-sec">
                Proveedores
              </NavEnlace>
              <Link href="/surtido" className="btn btn-primary btn-sm">
                Armar mi surtido
              </Link>
            </nav>
          </div>
        </header>
        <main id="contenido">{children}</main>
        <footer className="pie">
          <div className="wrap pie-in">
            <p>
              Provana conecta emprendedores con proveedores mexicanos verificados. Solo México, solo
              pesos mexicanos.
            </p>
            <p>
              Proyecto de curso. Los proveedores, productos, precios y calificaciones de este sitio son
              datos de ejemplo; los envíos y pagos son simulados.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
