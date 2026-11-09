import { describe, expect, it } from "vitest";
import {
  catalogoParaSurtido,
  confianzaPorProveedor,
  erroresDeIntegridad,
  productos,
  proveedores,
} from "../catalogo";
import { resolverSurtido } from "../surtido/motor";
import { CONFIG_INICIAL } from "../surtido/tipos";

describe("datos de ejemplo", () => {
  it("cumplen el esquema y no tienen referencias rotas", () => {
    // El esquema se valida al importar catalogo.ts; aquí, la integridad cruzada.
    expect(erroresDeIntegridad()).toEqual([]);
  });

  it("todo está marcado como datos de ejemplo", () => {
    expect(proveedores.every((p) => p.datosDeEjemplo)).toBe(true);
    expect(productos.every((p) => p.datosDeEjemplo)).toBe(true);
  });

  it("incluye casos para demostrar los filtros: uno en revisión y uno con confianza < 60", () => {
    expect(proveedores.some((p) => p.verificacion === "en_revision")).toBe(true);
    expect([...confianzaPorProveedor.values()].some((c) => c < 60)).toBe(true);
  });

  it("el surtido funciona con los datos de ejemplo hacia los 32 estados", () => {
    const cat = catalogoParaSurtido();
    for (const e of cat.estados) {
      const r = resolverSurtido(
        [
          { tipoId: "vela-soya-200g", cantidad: 40 },
          { tipoId: "bolsa-kraft-mediana", cantidad: 500 },
          { tipoId: "cafe-altura-1kg", cantidad: 10 },
        ],
        e.clave,
        cat,
        CONFIG_INICIAL,
      );
      expect(r.sinProveedor).toEqual([]);
      expect(r.totales.total).toBeGreaterThan(0);
      // Ningún proveedor en revisión ni con baja confianza aparece.
      for (const g of r.grupos) {
        expect(g.proveedorId).not.toBe("bordados-los-altos");
        expect(g.confianza).toBeGreaterThanOrEqual(60);
      }
    }
  });
});
