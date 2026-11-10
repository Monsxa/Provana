import { expect, test } from "@playwright/test";

test.describe("Surtido inteligente", () => {
  test("la portada muestra un surtido calculado y lleva al formulario", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Dinos qué necesitas");
    await expect(page.getByLabel("Ejemplo real de un surtido calculado por Provana")).toContainText("Total con envío e IVA");
    await page.getByRole("link", { name: /Armar mi surtido/ }).first().click();
    await expect(page).toHaveURL(/\/surtido$/);
  });

  test("valida antes de calcular", async ({ page }) => {
    await page.goto("/surtido");
    await page.getByRole("button", { name: "Armar mi surtido" }).click();
    await expect(page.getByText("Elige el estado al que te envían.")).toBeVisible();
    await expect(page.getByText("Agrega al menos un producto con su cantidad.")).toBeVisible();
  });

  test("arma un surtido, explica cada elección y permite cambiar de proveedor", async ({ page }) => {
    await page.goto("/surtido");
    await page.getByLabel("Producto", { exact: true }).selectOption("cafe-altura-1kg");
    await page.getByLabel("Cantidad").fill("10");
    await page.getByRole("button", { name: "Agregar producto" }).click();
    await page.getByLabel("Producto 2", { exact: true }).selectOption("vela-soya-200g");
    await page.getByLabel("Cantidad").nth(1).fill("40");
    await page.getByLabel("Estado").selectOption("JAL");
    await page.getByRole("button", { name: "Armar mi surtido" }).click();

    const resultados = page.getByRole("region", { name: "Resultado del surtido" });
    await expect(resultados).toContainText("Total con envío e IVA a Jalisco");
    await expect(resultados).toContainText("Café Rápido");
    await expect(resultados).toContainText("precio de mayoreo desde 10 kg");
    await expect(resultados.getByText("Negocio mexicano").first()).toBeVisible();

    // Cambiar el café a Finca Los Cerros recalcula el total.
    const total = resultados.locator('[data-prueba="total"] .sr-only');
    const totalAntes = await total.textContent();
    const selector = resultados.getByLabel("Comprar con otro proveedor").first();
    const opcion = await selector.locator("option", { hasText: "Finca Los Cerros" }).getAttribute("value");
    await selector.selectOption(opcion!);
    await expect(resultados).toContainText("Finca Los Cerros");
    await expect(resultados.getByRole("button", { name: "Volver a la recomendación" })).toBeVisible();
    await expect(total).not.toHaveText(totalAntes!);
  });

  test("el ejemplo muestra el ahorro frente a la referencia", async ({ page }) => {
    await page.goto("/surtido");
    await page.getByRole("button", { name: "Probar con un ejemplo" }).click();
    const resultados = page.getByRole("region", { name: "Resultado del surtido" });
    await expect(resultados).toContainText("Ahorras");
    await expect(resultados).toContainText("La combinación de Provana");
  });

  test("avisa cuando un producto no tiene proveedor que envíe al estado", async ({ request }) => {
    const res = await request.post("/api/surtido", {
      data: { estadoDestino: "YUC", renglones: [{ tipoId: "tote-manta", cantidad: 10, variante: { color: "rojo" } }] },
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.sinProveedor[0].motivo).toBe("Ningún proveedor ofrece esa variante.");
  });

  test("la API rechaza datos inválidos con 400", async ({ request }) => {
    const res = await request.post("/api/surtido", { data: { estadoDestino: "JAL", renglones: [{ tipoId: "cafe-altura-1kg", cantidad: -3 }] } });
    expect(res.status()).toBe(400);
  });
});
