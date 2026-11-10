/**
 * Flujo completo sobre la capa de datos (sin interfaz):
 * registro y verificación de proveedor → publicación → compra a dos proveedores →
 * pago retenido → envío → entrega → liberación con comisión → reseña → disputa que detiene el pago.
 */
import { beforeAll, describe, expect, it } from "vitest";
import * as t from "../almacen";

let estado: import("../tipos").EstadoTienda;
const snap = () => JSON.parse(JSON.stringify(globalThis.__provana)) as import("../tipos").EstadoTienda;
declare global {
  var __provana: unknown;
}

beforeAll(async () => {
  await t.reiniciarDemo();
});

describe("flujo completo en modo demostración", () => {
  it("un proveedor se registra, queda en revisión y el admin lo verifica", async () => {
    await t.registrar({
      nombre: "Rosa Pérez",
      email: "rosa@velasrosa.mx",
      clave: "segura1234",
      rol: "proveedor",
      negocio: { nombre: "Velas Rosa", rfc: "VRO240101AB1", estado: "PUE", ciudad: "Puebla", diasPreparacion: 1, enviaA: ["JAL", "PUE", "CDMX"], cobraIva: true, descripcion: "Velas de soya" },
    });
    for (const tipo of ["rfc", "identificacion", "domicilio", "taller"] as const) t.subirDocumento(tipo, `${tipo}.pdf`);
    estado = snap();
    expect(estado.proveedores.find((p) => p.id === "velas-rosa")?.verificacion).toBe("en_revision");
    // Un proveedor no puede aprobarse a sí mismo.
    expect(() => t.verificarProveedor("velas-rosa", true)).toThrow("permiso");
    t.salir();
    await t.entrar("admin@demo.provana.mx", t.CLAVE_DEMO);
    expect(() => t.verificarProveedor("velas-rosa", false, "corto")).toThrow("motivo");
    t.verificarProveedor("velas-rosa", true);
    expect(snap().proveedores.find((p) => p.id === "velas-rosa")?.verificacion).toBe("verificado");
    t.salir();
  });

  it("publica un producto con escalones y rechaza escalones mal hechos", async () => {
    await t.entrar("rosa@velasrosa.mx", "segura1234");
    const base = {
      nombre: "Vela de soya — rosa",
      tipoId: "vela-soya-200g",
      descripcion: "",
      unidad: "pieza" as const,
      variante: { aroma: "rosa" },
      precioMenudeo: 8000,
      escalones: [{ cantidadMinima: 24, precioUnitario: 6800 }, { cantidadMinima: 48, precioUnitario: 7000 }],
      pedidoMinimo: 6,
      existencias: 200,
      pesoKg: 0.3,
      medidas: null,
      maxDiasTransito: null,
      permisoSanitario: null,
      fotos: [],
    };
    expect(() => t.guardarProducto(base)).toThrow("más barato que el anterior");
    const id = t.guardarProducto({ ...base, escalones: [{ cantidadMinima: 24, precioUnitario: 6800 }, { cantidadMinima: 48, precioUnitario: 5900 }] });
    expect(snap().productos.find((p) => p.id === id)?.estado).toBe("activo");
    t.salir();
  });

  it("el comprador arma un carrito anónimo, entra y compra a dos proveedores con tarjeta de prueba", async () => {
    const rosa = snap().productos.find((p) => p.proveedorId === "velas-rosa")!;
    expect(t.agregarAlCarrito(rosa.id, 48)).toBe(`Agregamos 48 piezas de ${rosa.nombre} a tu carrito.`);
    await t.entrar("comprador@demo.provana.mx", t.CLAVE_DEMO);
    t.agregarAlCarrito("flc-cafe", 10);
    estado = snap();
    const grupos = t.agruparCarrito(estado);
    expect(grupos.map((g) => g.proveedor.id).sort()).toEqual(["finca-los-cerros", "velas-rosa"]);
    // 48 velas → escalón de $59: $2,832.00
    expect(grupos.find((g) => g.proveedor.id === "velas-rosa")!.productos).toBe(283200);
    const dir = estado.usuarios.find((u) => u.email === "comprador@demo.provana.mx")!.direcciones[0];
    expect(() =>
      t.comprar({ direccion: dir, envios: {}, cupones: {}, metodo: "tarjeta", tarjeta: { numero: "4111111111111111", vencimiento: "12/30", cvv: "123", titular: "X" }, factura: { solicitada: false } }),
    ).toThrow("No uses tarjetas reales");
    const r = t.comprar({
      direccion: dir,
      envios: { "velas-rosa": "expres" },
      cupones: {},
      metodo: "tarjeta",
      tarjeta: { numero: "4242 4242 4242 4242", vencimiento: "12/30", cvv: "123", titular: "Monse" },
      factura: { solicitada: true, rfc: "XAXX010101000", razonSocial: "Público en general", usoCfdi: "G03" },
    });
    expect(r.pedidos).toHaveLength(2);
    estado = snap();
    const pedidos = estado.pedidos.filter((p) => p.grupoCompra === r.grupoCompra);
    expect(pedidos.every((p) => p.estado === "confirmado" && p.pago.estado === "retenido")).toBe(true);
    // Inventario reservado.
    expect(estado.productos.find((p) => p.id === rosa.id)!.existencias).toBe(152);
    expect(estado.carritos[estado.sesion!]).toEqual([]);
    // Comisión 8 % solo sobre productos.
    const pRosa = pedidos.find((p) => p.proveedorId === "velas-rosa")!;
    expect(pRosa.comision).toBe(Math.round(283200 * 0.08));
    expect(pRosa.montoProveedor).toBe(283200 + Math.round(283200 * 0.16) - Math.round(283200 * 0.08));
    expect(pRosa.envio.servicio).toBe("Exprés");
  });

  it("el proveedor prepara y envía con guía; el comprador confirma y se libera el pago menos la comisión", async () => {
    const pRosa = snap().pedidos.find((p) => p.proveedorId === "velas-rosa")!;
    expect(() => t.accionPedido(pRosa.id, "preparar")).toThrow(); // el comprador no puede preparar
    t.salir();
    await t.entrar("rosa@velasrosa.mx", "segura1234");
    t.accionPedido(pRosa.id, "preparar");
    t.accionPedido(pRosa.id, "enviar");
    t.accionPedido(pRosa.id, "marcar_entregado");
    t.subirFactura(pRosa.id, "factura.xml", "factura.pdf");
    t.salir();
    await t.entrar("comprador@demo.provana.mx", t.CLAVE_DEMO);
    t.accionPedido(pRosa.id, "confirmar_entrega");
    const p = snap().pedidos.find((x) => x.id === pRosa.id)!;
    expect([p.estado, p.pago.estado]).toEqual(["completado", "liberado"]);
    expect(p.envio.guia).toMatch(/^PRV\d{10}MX$/);
    expect(p.factura.xml).toBe("factura.xml");
    expect(p.eventos.map((e) => e.estado)).toEqual(["pendiente_pago", "confirmado", "preparando", "enviado", "entregado", "completado"]);
  });

  it("solo quien completó un pedido puede reseñar, una vez", async () => {
    const pRosa = snap().pedidos.find((p) => p.proveedorId === "velas-rosa")!;
    const pCafe = snap().pedidos.find((p) => p.proveedorId === "finca-los-cerros")!;
    expect(() => t.resenar(pCafe.id, 5, "Excelente café, llegó bien.", [])).toThrow("completados");
    t.resenar(pRosa.id, 5, "Llegaron rápido y bien empacadas.", []);
    expect(() => t.resenar(pRosa.id, 4, "Otra reseña del mismo pedido", [])).toThrow();
    expect(snap().resenas[0]).toMatchObject({ estrellas: 5, proveedorId: "velas-rosa" });
  });

  it("una disputa detiene el pago y el admin reembolsa una parte", async () => {
    const pCafe = snap().pedidos.find((p) => p.proveedorId === "finca-los-cerros")!;
    t.salir();
    await t.entrar("admin@demo.provana.mx", t.CLAVE_DEMO);
    // El admin no envía por el proveedor.
    expect(() => t.accionPedido(pCafe.id, "preparar")).toThrow();
    t.salir();
    await t.entrar("finca-los-cerros@demo.provana.mx", t.CLAVE_DEMO);
    t.accionPedido(pCafe.id, "preparar");
    t.accionPedido(pCafe.id, "enviar");
    t.salir();
    await t.entrar("comprador@demo.provana.mx", t.CLAVE_DEMO);
    t.accionPedido(pCafe.id, "abrir_disputa", "Llegaron 2 bolsas rotas");
    let p = snap().pedidos.find((x) => x.id === pCafe.id)!;
    expect([p.estado, p.pago.estado]).toEqual(["en_disputa", "detenido"]);
    expect(() => t.accionPedido(pCafe.id, "confirmar_entrega")).toThrow();
    t.salir();
    await t.entrar("admin@demo.provana.mx", t.CLAVE_DEMO);
    const d = snap().disputas.find((x) => x.pedidoId === pCafe.id)!;
    t.resolverDisputa(d.id, "reembolso_parcial", 40000, "Se reembolsan las 2 bolsas dañadas.");
    p = snap().pedidos.find((x) => x.id === pCafe.id)!;
    expect([p.estado, p.pago.estado, p.pago.reembolsado]).toEqual(["reembolsado", "reembolso_parcial", 40000]);
    expect(snap().disputas.find((x) => x.id === d.id)!.historial).toHaveLength(2);
  });

  it("la liberación automática ocurre a los 5 días si el comprador no confirma", async () => {
    t.salir();
    await t.entrar("comprador@demo.provana.mx", t.CLAVE_DEMO);
    t.agregarAlCarrito("mo-jabon", 50);
    const dir = snap().usuarios.find((u) => u.email === "comprador@demo.provana.mx")!.direcciones[0];
    const r = t.comprar({ direccion: dir, envios: {}, cupones: {}, metodo: "oxxo", factura: { solicitada: false } });
    expect(r.pendiente?.referencia).toMatch(/^OXXO/);
    expect(snap().pedidos.find((x) => x.id === r.pedidos[0])!.estado).toBe("pendiente_pago");
    t.simularPagoRecibido(r.grupoCompra);
    t.salir();
    await t.entrar("manos-de-oaxaca@demo.provana.mx", t.CLAVE_DEMO);
    for (const a of ["preparar", "enviar", "marcar_entregado"] as const) t.accionPedido(r.pedidos[0], a);
    t.salir();
    await t.entrar("admin@demo.provana.mx", t.CLAVE_DEMO);
    expect(t.adelantarReloj(4)).toBe(0);
    expect(t.adelantarReloj(1)).toBe(1);
    expect(snap().pedidos.find((x) => x.id === r.pedidos[0])!.pago.estado).toBe("liberado");
  });

  it("los avisos (correos simulados) llegaron a cada parte", () => {
    const s = snap();
    const de = (email: string) => s.avisos.filter((a) => a.usuarioId === s.usuarios.find((u) => u.email === email)!.id).map((a) => a.asunto);
    expect(de("rosa@velasrosa.mx").join(" | ")).toMatch(/verificada.*|Nuevo pedido/);
    expect(de("comprador@demo.provana.mx").some((a) => a.startsWith("Recibimos tu pedido"))).toBe(true);
    expect(de("comprador@demo.provana.mx").some((a) => a.includes("va en camino"))).toBe(true);
    expect(de("admin@demo.provana.mx").some((a) => a.startsWith("Nuevo proveedor en revisión"))).toBe(true);
  });
});
