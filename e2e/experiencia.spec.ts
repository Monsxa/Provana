import { expect, test } from "@playwright/test";

test.describe("Búsqueda ⌘K", () => {
  test("Ctrl+K abre, las flechas mueven y Enter agrega el producto al surtido", async ({ page }) => {
    await page.goto("/surtido");
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("Control+k");
    const dialogo = page.getByRole("dialog", { name: "Buscar en Provana" });
    await expect(dialogo).toBeVisible();
    await page.keyboard.type("jabon");
    const opciones = dialogo.getByRole("option");
    await expect(opciones.first()).toContainText("Jabón artesanal de avena");
    await expect(opciones.first()).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Enter");
    await expect(dialogo).toBeHidden();
    await expect(page.getByLabel("Producto", { exact: true })).toHaveValue("jabon-avena-100g");
    await expect(page.getByText("Agregamos Jabón artesanal de avena 100 g a tu lista.")).toBeVisible();
    await expect(page.getByLabel("Cantidad")).toBeFocused();
  });

  test("busca sin acentos, filtra por categoría y abre proveedores", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("Control+k");
    const dialogo = page.getByRole("dialog", { name: "Buscar en Provana" });
    await page.keyboard.type("cuidado");
    await expect(dialogo.getByRole("option").first()).toContainText("Cuidado personal");
    await page.keyboard.press("Enter");
    await expect(dialogo.getByRole("button", { name: "Quitar filtro Cuidado personal" })).toBeVisible();
    await expect(dialogo.getByRole("option")).toHaveCount(2);
    await page.keyboard.press("Backspace");
    await page.keyboard.type("mrida");
    await page.keyboard.press("Control+a");
    await page.keyboard.type("merida");
    await expect(dialogo.getByRole("option").first()).toContainText("Empaques Sureste");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/proveedores\/empaques-sureste$/);
  });

  test("Esc cierra y devuelve el foco", async ({ page, isMobile }) => {
    test.skip(isMobile, "En celular se abre desde la barra inferior");
    await page.goto("/");
    const boton = page.getByRole("button", { name: /Buscar/ }).first();
    await boton.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(boton).toBeFocused();
  });
});

test.describe("Confianza y ficha de proveedor", () => {
  test("el anillo abre su desglose y la tarjeta lleva a la ficha", async ({ page }) => {
    await page.goto("/");
    const tarjeta = page.locator("#proveedores li").first();
    await tarjeta.scrollIntoViewIfNeeded();
    await tarjeta.getByRole("button", { name: /Confianza/ }).click();
    const desglose = tarjeta.getByRole("region", { name: "Desglose de confianza" });
    await expect(desglose).toContainText("Pedidos completados");
    await page.keyboard.press("Escape");
    await expect(desglose).toBeHidden();
    await tarjeta.getByRole("link", { name: "Aromas del Valle" }).click();
    await expect(page).toHaveURL(/\/proveedores\/aromas-del-valle$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aromas del Valle");
    await expect(page.getByRole("img", { name: "Confianza 98 de 100" })).toBeVisible();
    await expect(page.getByText("Negocio mexicano").first()).toBeVisible();
  });

  test("Agregar al surtido desde la ficha llena el formulario", async ({ page }) => {
    await page.goto("/proveedores/finca-los-cerros");
    await page.getByRole("link", { name: "Agregar al surtido" }).first().click();
    await expect(page).toHaveURL(/\/surtido\?agregar=/);
    await expect(page.getByLabel("Producto", { exact: true })).not.toHaveValue("");
  });

  test("un proveedor en revisión no tiene ficha", async ({ page }) => {
    const r = await page.goto("/proveedores/bordados-los-altos");
    expect(r?.status()).toBe(404);
  });
});

test.describe("Celular", () => {
  test("barra de navegación inferior con áreas de 44 px o más", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Solo en celular");
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Navegación inferior" });
    await expect(nav).toBeVisible();
    for (const el of await nav.locator("a, button").all()) {
      const caja = await el.boundingBox();
      expect(caja!.height).toBeGreaterThanOrEqual(44);
    }
    await nav.getByRole("link", { name: "Surtido" }).click();
    await expect(page).toHaveURL(/\/surtido$/);
    await expect(nav.getByRole("link", { name: "Surtido" })).toHaveAttribute("aria-current", "page");
  });
});

test.describe("PWA", () => {
  test("manifiesto, íconos e imagen para compartir", async ({ page, request }) => {
    await page.goto("/");
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    const m = await (await request.get(href!)).json();
    expect(m.lang).toBe("es-MX");
    expect(m.display).toBe("standalone");
    for (const i of m.icons) expect((await request.get(i.src)).status()).toBe(200);
    const og = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(og).toContain("/og.png");
  });
});
