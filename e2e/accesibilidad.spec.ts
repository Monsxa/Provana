import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function sinViolacionesGraves(page: Page, contexto: string) {
  // Recorre la página como lo haría una persona para que la entrada escalonada muestre todo.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const graves = r.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  const resumen = graves.map((v) => `${v.id}: ${v.nodes.length} nodo(s) — ${v.nodes[0]?.target}`).join("\n");
  expect(graves, `${contexto}\n${resumen}`).toEqual([]);
}

for (const esquema of ["light", "dark"] as const) {
  test.describe(`axe · modo ${esquema === "light" ? "claro" : "oscuro"}`, () => {
    test.use({ colorScheme: esquema });

    test("portada", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(400);
      await sinViolacionesGraves(page, "portada");
    });

    test("surtido con resultado y desglose de confianza abierto", async ({ page }) => {
      await page.goto("/surtido");
      await sinViolacionesGraves(page, "surtido vacío");
      await page.getByRole("button", { name: "Probar con un ejemplo" }).click();
      await expect(page.getByText("Ahorras")).toBeVisible();
      await page.waitForTimeout(700);
      await page.getByRole("button", { name: /Confianza/ }).first().click();
      await sinViolacionesGraves(page, "surtido con resultado");
    });

    test("ficha de proveedor", async ({ page }) => {
      await page.goto("/proveedores/aromas-del-valle");
      await sinViolacionesGraves(page, "ficha de proveedor");
    });

    test("búsqueda abierta", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await page.keyboard.press("Control+k");
      await page.keyboard.type("vela");
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.waitForTimeout(300);
      await sinViolacionesGraves(page, "búsqueda");
    });
  });
}

test.describe("Movimiento reducido", () => {
  test.use({ reducedMotion: "reduce" });

  test("las cifras muestran su valor final sin contar y nada queda oculto", async ({ page }) => {
    await page.goto("/surtido");
    await page.getByRole("button", { name: "Probar con un ejemplo" }).click();
    const total = page.locator('[data-prueba="total"]');
    await expect(total).toBeVisible();
    // Sin animación: la cifra visible es igual a la accesible desde el primer cuadro.
    const visible = await total.locator('[aria-hidden="true"]').textContent();
    const final = await total.locator(".sr-only").textContent();
    expect(visible).toBe(final);
    await page.goto("/");
    const ocultos = await page.locator('[data-revelar="listo"]').count();
    expect(ocultos).toBe(0);
  });

  test("el video de fondo no se reproduce ni se descarga", async ({ page }) => {
    const pedidos: string[] = [];
    page.on("request", (r) => r.url().includes("/videos/") && pedidos.push(r.url()));
    await page.goto("/");
    await page.waitForTimeout(1500);
    expect(pedidos).toEqual([]);
    expect(await page.locator("video").first().evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
  });

  test("la búsqueda abre solo con desvanecido (sin escala)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.keyboard.press("Control+k");
    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible();
    const transform = await panel.evaluate((el) => getComputedStyle(el).transform);
    expect(transform === "none" || transform === "matrix(1, 0, 0, 1, 0, 0)").toBe(true);
  });
});
