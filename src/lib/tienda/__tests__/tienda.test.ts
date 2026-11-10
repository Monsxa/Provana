import { describe, expect, it } from "vitest";
import { tiposProducto } from "@/lib/catalogo";
import { estados, tarifas } from "@/lib/catalogo";
import { cpAEstado, rfcValido } from "../cp";
import { PLANTILLA_CSV, parsearCsv, validarCsv } from "../csv";
import { fechaLlegada, opcionesEnvio } from "../envios";
import { pagosSimulados, luhn } from "../pagos";
import { aplicar, debeLiberarse, liquidar, puede, TransicionInvalida } from "../pedidos";
import type { Pedido } from "../tipos";

const ahora = new Date("2026-11-10T12:00:00Z");

function pedido(p: Partial<Pedido> = {}): Pedido {
  return {
    id: "p1",
    folio: "PV-10001",
    grupoCompra: "g1",
    compradorId: "c1",
    proveedorId: "aromas-del-valle",
    lineas: [],
    productos: 304000,
    descuento: 0,
    ivaProductos: 48640,
    envio: { servicio: "Estándar", costo: 14900, iva: 2384, diasMin: 3, diasMax: 5 },
    total: 369924,
    comisionTasa: 0.08,
    comision: 24320,
    montoProveedor: 328320,
    pago: { metodo: "tarjeta", estado: "pendiente", referencia: "x" },
    estado: "pendiente_pago",
    eventos: [],
    direccion: { id: "d", alias: "", nombre: "", calle: "", colonia: "", cp: "44100", ciudad: "", estado: "JAL", telefono: "" },
    factura: { solicitada: false },
    creado: ahora.toISOString(),
    ...p,
  };
}

describe("estados del pedido", () => {
  it("recorre el flujo completo y el pago queda retenido hasta confirmar la entrega", () => {
    const f = ahora.toISOString();
    let p = aplicar(pedido(), "acreditar_pago", "sistema", f);
    expect([p.estado, p.pago.estado]).toEqual(["confirmado", "retenido"]);
    p = aplicar(p, "preparar", "proveedor", f);
    p = aplicar(p, "enviar", "proveedor", f, "", { guia: "PRV123", paqueteria: "Estándar" });
    expect(p.envio.guia).toBe("PRV123");
    p = aplicar(p, "marcar_entregado", "sistema", f);
    expect(p.pago.estado).toBe("retenido");
    p = aplicar(p, "confirmar_entrega", "comprador", f);
    expect([p.estado, p.pago.estado]).toEqual(["completado", "liberado"]);
    expect(p.eventos.map((e) => e.estado)).toEqual(["confirmado", "preparando", "enviado", "entregado", "completado"]);
  });

  it("cancelación gratis solo antes de 'preparando'", () => {
    const f = ahora.toISOString();
    const confirmado = aplicar(pedido(), "acreditar_pago", "sistema", f);
    expect(puede(confirmado, "cancelar", "comprador")).toBe(true);
    expect(aplicar(confirmado, "cancelar", "comprador", f).pago.estado).toBe("reembolsado");
    const preparando = aplicar(confirmado, "preparar", "proveedor", f);
    expect(puede(preparando, "cancelar", "comprador")).toBe(false);
    expect(() => aplicar(preparando, "cancelar", "comprador", f)).toThrow(TransicionInvalida);
  });

  it("cada acción solo la puede hacer su actor", () => {
    const confirmado = aplicar(pedido(), "acreditar_pago", "sistema", ahora.toISOString());
    expect(puede(confirmado, "preparar", "comprador")).toBe(false);
    expect(puede(confirmado, "preparar", "proveedor")).toBe(true);
    expect(puede(confirmado, "resolver_reembolso", "proveedor")).toBe(false);
  });

  it("una disputa detiene el pago y el admin resuelve con reembolso parcial", () => {
    const f = ahora.toISOString();
    let p = aplicar(pedido(), "acreditar_pago", "sistema", f);
    p = aplicar(aplicar(p, "preparar", "proveedor", f), "enviar", "proveedor", f);
    p = aplicar(p, "abrir_disputa", "comprador", f);
    expect([p.estado, p.pago.estado]).toEqual(["en_disputa", "detenido"]);
    expect(puede(p, "confirmar_entrega", "comprador")).toBe(false);
    const r = aplicar(p, "resolver_reembolso", "admin", f, "", { reembolso: 50000 });
    expect([r.estado, r.pago.estado, r.pago.reembolsado]).toEqual(["reembolsado", "reembolso_parcial", 50000]);
    expect(() => aplicar(p, "resolver_reembolso", "admin", f, "", { reembolso: p.total + 1 })).toThrow();
  });

  it("se libera solo a los 5 días de entregado", () => {
    const entregado = pedido({ estado: "entregado", eventos: [{ estado: "entregado", fecha: "2026-11-01T12:00:00Z", nota: "" }] });
    expect(debeLiberarse(entregado, new Date("2026-11-05T12:00:00Z"), 5)).toBe(false);
    expect(debeLiberarse(entregado, new Date("2026-11-06T12:00:00Z"), 5)).toBe(true);
    expect(debeLiberarse({ ...entregado, estado: "en_disputa" }, new Date("2026-12-01"), 5)).toBe(false);
  });
});

describe("liquidación con comisión de 8 % solo sobre productos", () => {
  it("40 velas a $76 ($3,040): comisión $243.20; el proveedor recibe $3,040 + IVA $486.40 − $243.20 = $3,283.20", () => {
    expect(liquidar(304000, 0, 48640, 0.08)).toEqual({ comision: 24320, montoProveedor: 328320 });
  });
  it("con cupón de 10 % la comisión se calcula sobre el precio con descuento", () => {
    expect(liquidar(304000, 30400, 43776, 0.08).comision).toBe(21888);
  });
});

describe("pago simulado", () => {
  it("acepta la tarjeta de prueba 4242 y guarda solo los últimos 4 dígitos", () => {
    const r = pagosSimulados.cobrar("tarjeta", 1000, {
      folio: "PV-1",
      ahora,
      tarjeta: { numero: "4242 4242 4242 4242", vencimiento: "12/30", cvv: "123", titular: "Prueba" },
    });
    expect(r).toMatchObject({ ok: true, estado: "aprobado", ultimos4: "4242" });
    expect(JSON.stringify(r)).not.toContain("4242424242424242");
  });
  it("rechaza tarjetas reales (número válido que no es de prueba)", () => {
    expect(luhn("4111111111111111")).toBe(true);
    const r = pagosSimulados.cobrar("tarjeta", 1000, {
      folio: "PV-1",
      ahora,
      tarjeta: { numero: "4111111111111111", vencimiento: "12/30", cvv: "123", titular: "X" },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("No uses tarjetas reales");
  });
  it("la tarjeta de prueba 4000…0002 es rechazada y la vencida también", () => {
    const base = { folio: "PV-1", ahora };
    expect(pagosSimulados.cobrar("tarjeta", 1000, { ...base, tarjeta: { numero: "4000000000000002", vencimiento: "12/30", cvv: "123", titular: "X" } }).ok).toBe(false);
    expect(pagosSimulados.cobrar("tarjeta", 1000, { ...base, tarjeta: { numero: "4242424242424242", vencimiento: "01/26", cvv: "123", titular: "X" } }).ok).toBe(false);
  });
  it("OXXO y SPEI quedan pendientes con referencia", () => {
    expect(pagosSimulados.cobrar("oxxo", 1000, { folio: "PV-1", ahora })).toMatchObject({ ok: true, estado: "pendiente" });
    const spei = pagosSimulados.cobrar("spei", 1000, { folio: "PV-1", ahora });
    expect(spei.ok && spei.estado === "pendiente" && spei.referencia).toMatch(/^646180\d{12}$/);
  });
});

describe("envíos simulados", () => {
  it("marca la más barata, la más rápida y la recomendada", () => {
    const ops = opcionesEnvio("JAL", "JAL", [{ cantidad: 40, pesoKg: 0.3, medidas: null }], 2, tarifas, estados);
    expect(ops.find((o) => o.etiquetas.includes("Más barata"))!.id).toBe("sucursal");
    expect(ops.find((o) => o.etiquetas.includes("Más rápida"))!.id).toBe("expres");
    // 12 kg locales: $79 + 12 × $6 = $151
    expect(ops.find((o) => o.id === "estandar")!.costo).toBe(15100);
  });
  it("cuenta días hábiles (sin fin de semana)", () => {
    // Viernes 13 nov 2026 + 1 día hábil = lunes 16
    expect(fechaLlegada(new Date("2026-11-13T12:00:00"), 1).getDate()).toBe(16);
  });
});

describe("código postal y RFC", () => {
  it("44100 es Jalisco y 06700 es Ciudad de México", () => {
    expect(cpAEstado("44100")).toEqual({ estado: "JAL", ciudad: "Guadalajara" });
    expect(cpAEstado("06700")?.estado).toBe("CDMX");
    expect(cpAEstado("97000")?.estado).toBe("YUC");
    expect(cpAEstado("4410")).toBeNull();
  });
  it("valida la forma del RFC", () => {
    expect(rfcValido("AVA230314AB1")).toBe(true);
    expect(rfcValido("GODE561231GR8")).toBe(true);
    expect(rfcValido("ABC")).toBe(false);
  });
});

describe("carga masiva CSV", () => {
  const tipos = new Set(tiposProducto.map((t) => t.id));
  it("la plantilla se importa sin errores", () => {
    const r = validarCsv(PLANTILLA_CSV, tipos);
    expect(r.errores).toEqual([]);
    expect(r.validas).toHaveLength(2);
    expect(r.validas[0]).toMatchObject({ precioMenudeo: 8500, escalones: [{ cantidadMinima: 12, precioUnitario: 7200 }, { cantidadMinima: 48, precioUnitario: 6000 }], variante: { aroma: "mandarina" } });
  });
  it("reporta errores por fila y sigue con las demás", () => {
    const csv =
      PLANTILLA_CSV.split("\n")[0] +
      "\nBien,cafe-altura-1kg,,kg,180,10:160,5,100,1,22,13,8,\nX,no-existe,,pieza,10,5:12,1,10,1,,,,\nEscalón caro,cafe-altura-1kg,,kg,100,10:120,1,10,1,,,,\n";
    const r = validarCsv(csv, tipos);
    expect(r.validas.map((v) => v.fila)).toEqual([2]);
    expect(r.errores.map((e) => e.fila)).toEqual([3, 4]);
    expect(r.errores[0].mensajes.join(" ")).toContain('El tipo "no-existe" no existe');
    expect(r.errores[1].mensajes).toContain("El escalón 1 debe ser más barato que el anterior.");
  });
  it("respeta comillas y comas dentro de un campo", () => {
    expect(parsearCsv('a,"b, c","d ""e"""\n')).toEqual([["a", "b, c", 'd "e"']]);
  });
});
