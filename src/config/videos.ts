/**
 * Videos de Provana. Para reemplazar un video de demostración:
 * 1. Copia los archivos a public/videos/ (MP4 H.264 y WebM VP9, sin audio para los de fondo).
 * 2. Cambia aquí `mp4`, `webm` y `poster` (imagen de respaldo: primer cuadro en WebP, ~1280×720).
 * 3. Respeta el presupuesto: < 2 MB en la portada.
 * Si `mp4` y `webm` son null, solo se muestra el poster.
 */
export interface Video {
  mp4: string | null;
  webm: string | null;
  poster: string;
  /** Descripción para lectores de pantalla (vacía si es decorativo). */
  descripcion: string;
  duracionSeg: number;
}

export const VIDEOS = {
  /** Fondo de la portada: silenciado, en bucle, 5–8 s. Patrón de greca (demostración). */
  portada: {
    mp4: "/videos/portada.mp4",
    webm: "/videos/portada.webm",
    poster: "/posters/portada.webp",
    descripcion: "",
    duracionSeg: 8,
  },
  /** Ficha de producto: clip de 10–15 s con controles. Aún no hay ficha de producto ni clip real. */
  producto: {
    mp4: null,
    webm: null,
    poster: "/posters/producto.svg",
    descripcion: "Video del producto",
    duracionSeg: 12,
  },
  /** Ficha de proveedor: clip de 10–20 s del taller. Se puede definir uno por proveedor en `proveedores`. */
  proveedor: {
    mp4: null,
    webm: null,
    poster: "/posters/proveedor.svg",
    descripcion: "Video del taller del proveedor",
    duracionSeg: 15,
  },
} satisfies Record<string, Video>;

/** Videos propios por proveedor (id → video). Vacío en la demostración. */
export const VIDEOS_PROVEEDOR: Record<string, Video> = {};
