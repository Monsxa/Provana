import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Provana · Proveedores mexicanos confiables",
    short_name: "Provana",
    description: "Arma tu surtido con proveedores mexicanos verificados y ve cuánto ahorras.",
    lang: "es-MX",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3f6f2",
    theme_color: "#1d6f52",
    categories: ["business", "shopping"],
    icons: [
      { src: "/iconos/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Armar mi surtido", url: "/surtido", icons: [{ src: "/iconos/icono-192.png", sizes: "192x192" }] }],
  };
}
