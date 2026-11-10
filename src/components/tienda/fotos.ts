"use client";
/** Reduce una imagen a máximo `lado` px y la devuelve como data URL JPEG (para guardarla en la demo). */
export async function reducirImagen(archivo: File, lado = 640): Promise<string> {
  if (!archivo.type.startsWith("image/")) throw new Error("Sube una imagen (JPG, PNG o WebP).");
  if (archivo.size > 8 * 1024 * 1024) throw new Error("La imagen pesa más de 8 MB.");
  const bmp = await createImageBitmap(archivo);
  const escala = Math.min(1, lado / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * escala);
  c.height = Math.round(bmp.height * escala);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.72);
}
