import { describe, expect, it } from "vitest";
import { elegirCantidad, faltaParaSiguienteEscalon, precioPorCantidad, validarEscalones } from "../precios";
import { cotizarEnvio, kgCobrables, zonaEnvio } from "../envio";
import { calcularConfianza } from "../confianza";
import { ESTADOS, TARIFAS } from "./fixtures";

const velas = {
  precioMenudeo: 8900,
  escalones: [
    { cantidadMinima: 12, precioUnitario: 7600 },
    { cantidadMinima: 48, precioUnitario: 6200 },
  ],
  pedidoMinimo: 6,
  existencias: 1000,
};

describe("precio por cantidad (escalones de mayoreo)", () => {
  it("usa menudeo debajo del primer escalón", () => {
    expect(precioPorCantidad(velas, 11)).toEqual({ precioUnitario: 8900, escalonAplicado: null });
  });
  it("si compro 48 velas, el precio unitario baja a $62 y el total es $2,976.00", () => {
    const p = precioPorCantidad(velas, 48);
    expect(p.precioUnitario).toBe(6200);
    expect(p.precioUnitario * 48).toBe(297600);
  });
  it("con 40 velas faltan 8 para el siguiente escalón de $62", () => {
    expect(faltaParaSiguienteEscalon(velas, 40)).toEqual({ faltan: 8, precioUnitario: 6200, cantidadMinima: 48 });
    expect(faltaParaSiguienteEscalon(velas, 48)).toBeNull();
  });
});

describe("validación de escalones", () => {
  it("acepta escalones crecientes en cantidad y decrecientes en precio", () => {
    expect(validarEscalones(8900, velas.escalones)).toEqual([]);
  });
  it("rechaza un escalón que no es más barato que el anterior", () => {
    const errores = validarEscalones(8900, [
      { cantidadMinima: 12, precioUnitario: 7600 },
      { cantidadMinima: 48, precioUnitario: 7600 },
    ]);
    expect(errores).toContain("El escalón 2 debe ser más barato que el anterior.");
  });
  it("rechaza un escalón más caro que el menudeo y cantidades que no crecen", () => {
    const errores = validarEscalones(8900, [
      { cantidadMinima: 12, precioUnitario: 9000 },
      { cantidadMinima: 10, precioUnitario: 5000 },
    ]);
    expect(errores).toContain("El escalón 1 debe ser más barato que el anterior.");
    expect(errores).toContain("El escalón 2 debe pedir más de 12 piezas.");
  });
});

describe("cantidad a comprar", () => {
  it("sube al pedido mínimo y lo marca", () => {
    const e = elegirCantidad({ ...velas, pedidoMinimo: 24 }, 20, false)!;
    expect(e.cantidad).toBe(24);
    expect(e.ajuste).toBe("minimo");
  });
  it("con piezas extra permitidas sugiere 48 por $2,976 en vez de 40 por $3,040", () => {
    const sin = elegirCantidad(velas, 40, false)!;
    expect(sin.subtotal).toBe(304000);
    const con = elegirCantidad(velas, 40, true)!;
    expect(con).toMatchObject({ cantidad: 48, subtotal: 297600, ajuste: "extra", ahorroPorExtra: 6400 });
  });
  it("no sugiere piezas extra si no hay existencias", () => {
    expect(elegirCantidad({ ...velas, existencias: 45 }, 40, true)!.cantidad).toBe(40);
  });
  it("devuelve null si no hay existencias suficientes", () => {
    expect(elegirCantidad({ ...velas, existencias: 30 }, 40, false)).toBeNull();
  });
});

describe("envío simulado", () => {
  it("zonas: mismo estado, misma región, nacional", () => {
    expect(zonaEnvio("JAL", "JAL", ESTADOS)).toBe("local");
    expect(zonaEnvio("JAL", "COL", ESTADOS)).toBe("regional");
    expect(zonaEnvio("YUC", "JAL", ESTADOS)).toBe("nacional");
  });
  it("kg cobrables: mayor entre real y volumétrico, hacia arriba, mínimo 1", () => {
    expect(kgCobrables(10, 2)).toBe(10);
    expect(kgCobrables(9.2, 2)).toBe(10);
    expect(kgCobrables(0.3, 0)).toBe(1);
    expect(kgCobrables(2, 6.5)).toBe(7);
    expect(kgCobrables(0.25 * 40, 0)).toBe(10);
  });
  it("20 kg de Yucatán a Jalisco cuestan $159 + 20 × $10 = $359", () => {
    expect(cotizarEnvio("YUC", "JAL", 20, TARIFAS, ESTADOS).costo).toBe(35900);
  });
  it("zona extendida suma recargo y días", () => {
    const c = cotizarEnvio("JAL", "BCS", 1, TARIFAS, ESTADOS);
    expect(c.costo).toBe(15900 + 1000 + 9000);
    expect(c.diasMax).toBe(7);
  });
});

describe("confianza 0–100", () => {
  it("proveedor sin historial: Q=0.9 (promedio 4.6), K=0.9, D=1, R=0.5 → 87", () => {
    expect(
      calcularConfianza(
        { sumaEstrellas: 0, numResenas: 0, pedidosCerrados: 0, pedidosCompletados: 0, disputasPerdidas: 0, horasRespuesta: null },
        4.6,
      ),
    ).toBe(87);
  });
  it("proveedor con buen historial sube; con disputas y respuestas lentas baja", () => {
    const bueno = calcularConfianza(
      { sumaEstrellas: 312 * 4.9, numResenas: 312, pedidosCerrados: 1200, pedidosCompletados: 1170, disputasPerdidas: 2, horasRespuesta: 2 },
      4.6,
    );
    const malo = calcularConfianza(
      { sumaEstrellas: 40 * 3.2, numResenas: 40, pedidosCerrados: 100, pedidosCompletados: 80, disputasPerdidas: 10, horasRespuesta: 30 },
      4.6,
    );
    expect(bueno).toBeGreaterThanOrEqual(95);
    expect(malo).toBeLessThan(60);
  });
});
