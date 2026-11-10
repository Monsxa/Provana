/**
 * Flujo completo en el navegador (modo demostración), como comprador, proveedor y administración.
 */
import { expect, test, type Page } from "@playwright/test";

const CLAVE = "provana123";

async function entrar(page: Page, email: string, clave = CLAVE) {
  await page.goto("/entrar");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(clave);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));
}

async function salir(page: Page) {
  await page.goto("/cuenta");
  await page.getByRole("button", { name: "Salir" }).click();
  await page.waitForURL("/");
}

const archivo = (nombre: string) => ({ name: nombre, mimeType: nombre.endsWith(".pdf") ? "application/pdf" : "image/jpeg", buffer: Buffer.from("demo") });

test("comprador, proveedor y administración: de la verificación a la reseña y la disputa", async ({ page }) => {
  test.setTimeout(180_000);
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(e.message));

  // 1. Un proveedor nuevo se registra y sube sus documentos.
  await page.goto("/entrar?modo=crear&rol=proveedor");
  await page.getByLabel("Tu nombre").fill("Rosa Pérez");
  await page.getByLabel("Correo").fill("rosa@velasrosa.mx");
  await page.getByLabel("Contraseña", { exact: true }).fill("segura1234");
  await page.getByLabel("Nombre del negocio").fill("Velas Rosa");
  await page.getByLabel("RFC").fill("VRO240101AB1");
  await page.getByLabel("Estado de origen").selectOption("PUE");
  await page.getByLabel("Ciudad", { exact: true }).fill("Puebla");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await page.waitForURL("**/panel/verificacion");
  await expect(page.getByText("En revisión").first()).toBeVisible();
  for (const [doc, nombre] of [["Constancia", "rfc.pdf"], ["Identificación", "ine.jpg"], ["Comprobante", "recibo.pdf"], ["Fotos del taller", "taller.jpg"]] as const) {
    await page.getByLabel(new RegExp(`Subir ${doc}`)).setInputFiles(archivo(nombre));
  }
  await expect(page.getByText("taller.jpg · subido")).toBeVisible();
  await salir(page);

  // 2. Administración lo verifica.
  await entrar(page, "admin@demo.provana.mx");
  await page.getByRole("tab", { name: /Verificaciones/ }).click();
  const tarjeta = page.locator("section", { has: page.getByRole("heading", { name: "Velas Rosa" }) });
  await expect(tarjeta.getByText("ine.jpg")).toBeVisible();
  await tarjeta.getByRole("button", { name: "Aprobar" }).click();
  await expect(page.getByText("Verificamos a Velas Rosa")).toBeVisible();
  await salir(page);

  // 3. El proveedor publica un producto con escalones (y el formulario rechaza un escalón caro).
  await entrar(page, "rosa@velasrosa.mx", "segura1234");
  await page.goto("/panel/productos");
  await page.getByRole("button", { name: "Nuevo producto" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Vela de soya — rosa");
  await page.getByLabel("Tipo de producto").selectOption("vela-soya-200g");
  await page.getByLabel(/Precio de menudeo/).fill("80");
  await page.getByRole("button", { name: "Agregar escalón" }).click();
  await page.getByLabel("Desde (cantidad)").fill("24");
  await page.getByLabel("Precio c/u ($)").fill("90");
  await expect(page.getByText("El escalón 1 debe ser más barato que el anterior.")).toBeVisible();
  await page.getByLabel("Precio c/u ($)").fill("62");
  await page.getByLabel("Pedido mínimo").fill("6");
  await page.getByLabel("Existencias").fill("300");
  await page.getByRole("button", { name: "Publicar producto" }).click();
  await expect(page.getByRole("link", { name: "Vela de soya — rosa" })).toBeVisible();
  await salir(page);

  // 4. El comprador busca sin acentos, compara y compra a dos proveedores.
  await entrar(page, "comprador@demo.provana.mx");
  await page.goto("/catalogo?q=vela%20rosa");
  await page.getByRole("button", { name: "Comparar Vela de soya — rosa" }).click();
  await page.goto("/catalogo?q=cafe");
  await page.getByRole("button", { name: /^Comparar Café de altura/ }).click();
  await page.getByRole("link", { name: "Comparar", exact: true }).click();
  await expect(page.getByRole("region", { name: "Tabla comparativa" })).toContainText("Mejor precio de mayoreo");

  await page.goto("/catalogo?q=vela%20rosa");
  await page.getByRole("link", { name: "Vela de soya — rosa" }).click();
  await page.getByLabel(/^Cantidad/).fill("20");
  await expect(page.getByText(/Te faltan 4 piezas para pagar/)).toBeVisible();
  await page.getByLabel(/^Cantidad/).fill("24");
  await expect(page.getByText("Ya tienes el mejor precio de mayoreo.")).toBeVisible();
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await expect(page.getByText("Agregamos 24 piezas de Vela de soya — rosa a tu carrito.")).toBeVisible();

  await page.goto("/producto/flc-cafe");
  await page.getByLabel(/^Cantidad/).fill("10");
  await page.getByRole("button", { name: "Agregar al carrito" }).click();
  await page.goto("/carrito");
  await expect(page.getByRole("heading", { name: "Velas Rosa" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Finca Los Cerros" })).toBeVisible();
  await page.getByRole("link", { name: "Continuar al pago" }).click();

  await expect(page.getByText("Modo demostración: no uses tarjetas reales.")).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click(); // dirección guardada
  await expect(page.getByText("Más barata").first()).toBeVisible();
  await page.getByRole("button", { name: "Continuar" }).click(); // envío
  await page.getByLabel("Número de tarjeta de prueba").fill("4111 1111 1111 1111");
  await page.getByLabel("Vencimiento (MM/AA)").fill("12/30");
  await page.getByLabel("Código de seguridad").fill("123");
  await page.getByRole("button", { name: /^Pagar/ }).click();
  await expect(page.getByText(/No uses tarjetas reales/).last()).toBeVisible();
  await page.getByLabel("Número de tarjeta de prueba").fill("4242 4242 4242 4242");
  await page.getByRole("button", { name: /^Pagar/ }).click();
  await page.waitForURL("**/pedidos?compra=*");
  await expect(page.getByRole("heading", { name: "Comprobante de compra" })).toBeVisible();
  await expect(page.getByText("•••• 4242")).toBeVisible();
  await expect(page.getByText("Pago retenido por Provana")).toHaveCount(2);
  const enlaceRosa = page.getByRole("link", { name: /· Velas Rosa/ });
  const urlRosa = await enlaceRosa.getAttribute("href");
  const urlCafe = await page.getByRole("link", { name: /· Finca Los Cerros/ }).getAttribute("href");
  await salir(page);

  // 5. Los proveedores preparan y envían (la entrega la simula la paquetería).
  await entrar(page, "rosa@velasrosa.mx", "segura1234");
  await page.goto("/panel/pedidos");
  await page.getByRole("button", { name: "Empezar a preparar" }).click();
  await page.getByRole("button", { name: "Generar guía y enviar" }).click();
  await expect(page.getByText(/guía PRV\d{10}MX/)).toBeVisible();
  await page.getByRole("button", { name: "Simular entrega de la paquetería" }).click();
  await salir(page);
  await entrar(page, "finca-los-cerros@demo.provana.mx");
  await page.goto("/panel/pedidos");
  await page.getByRole("button", { name: "Empezar a preparar" }).click();
  await page.getByRole("button", { name: "Generar guía y enviar" }).click();
  await salir(page);

  // 6. El comprador confirma la entrega (se libera el pago) y deja una reseña; abre disputa del otro.
  await entrar(page, "comprador@demo.provana.mx");
  await page.goto(urlRosa!);
  await page.getByRole("button", { name: "Confirmar que recibí todo bien" }).click();
  await expect(page.getByText("Pago liberado al proveedor")).toBeVisible();
  await page.getByRole("radio", { name: "5 estrellas" }).check({ force: true });
  await page.getByLabel("Tu experiencia").fill("Llegaron rápido y muy bien empacadas.");
  await page.getByRole("button", { name: "Publicar reseña" }).click();
  await expect(page.getByRole("heading", { name: "Tu reseña" })).toBeVisible();

  await page.goto(urlCafe!);
  await expect(page.getByRole("button", { name: "Cancelar pedido" })).toHaveCount(0);
  await page.getByRole("button", { name: "Tuve un problema con mi pedido" }).click();
  await page.getByLabel("¿Qué pasó?").fill("Llegaron 2 bolsas de café rotas.");
  await page.getByRole("button", { name: "Enviar reporte" }).click();
  await expect(page.getByText("Pago detenido por disputa")).toBeVisible();

  await page.goto("/avisos");
  await expect(page.getByText(/va en camino/).first()).toBeVisible();
  await expect(page.getByText(/Abrimos tu reporte/)).toBeVisible();
  await salir(page);

  // 7. Administración resuelve con reembolso parcial y ve la comisión.
  await entrar(page, "admin@demo.provana.mx");
  await page.getByRole("tab", { name: /Disputas/ }).click();
  await page.getByLabel(/Monto del reembolso parcial/).fill("150");
  await page.getByRole("button", { name: "Reembolso parcial" }).click();
  await expect(page.getByText(/Resolvimos la disputa/)).toBeVisible();
  await page.getByRole("tab", { name: "Resumen" }).click();
  await expect(page.getByText("Comisiones cobradas (liberadas)")).toBeVisible();
  await page.getByRole("tab", { name: "Pedidos" }).click();
  await expect(page.getByText("Reembolsado")).toBeVisible();

  // La reseña ya aparece en la ficha pública del proveedor.
  await page.goto("/proveedores/velas-rosa");
  await expect(page.getByText("Llegaron rápido y muy bien empacadas.")).toBeVisible();

  expect(errores).toEqual([]);
});
