import { describe, expect, it } from "vitest";
import { resolverSurtido } from "../motor";
import type { Catalogo, Oferta, ProveedorSurtido, Renglon } from "../tipos";
import { A, B, C, D, ESTADOS, LISTA, OFERTAS, TARIFAS, catalogoEjemplo, config, oferta, proveedor } from "./fixtures";

const grupoDe = (r: ReturnType<typeof resolverSurtido>, id: string) => r.grupos.find((g) => g.proveedorId === id);
const proveedorDelRenglon = (r: ReturnType<typeof resolverSurtido>, renglon: number) =>
  r.grupos.find((g) => g.lineas.some((l) => l.renglon === renglon))?.proveedorId;

describe("Criterio 1 · ejemplo trabajado (40 velas, 500 bolsas, 10 kg de café a Jalisco)", () => {
  const r = resolverSurtido(LISTA, "JAL", catalogoEjemplo(), config());

  it("elige velas y bolsas con Empaques Sureste y café con Café Rápido", () => {
    expect(proveedorDelRenglon(r, 0)).toBe("B");
    expect(proveedorDelRenglon(r, 1)).toBe("B");
    expect(proveedorDelRenglon(r, 2)).toBe("D");
  });

  it("Empaques Sureste: $3,700 de productos + 20 kg de envío ($359) + IVA = $4,708.44", () => {
    const b = grupoDe(r, "B")!;
    expect(b.productos).toBe(370000);
    expect(b.envio.kgCobrables).toBe(20);
    expect(b.envio.costo).toBe(35900);
    expect(b.ivaProductos).toBe(59200);
    expect(b.envio.iva).toBe(5744);
    expect(b.total).toBe(470844);
  });

  it("Café Rápido: $1,580 + envío local de 10 kg ($139) + IVA = $1,994.04", () => {
    expect(grupoDe(r, "D")!.total).toBe(199404);
  });

  it("total con IVA $6,702.48 (= $5,778.00 + 16 %)", () => {
    expect(r.totales.sinIva).toBe(577800);
    expect(r.totales.total).toBe(670248);
  });

  it("referencia: todo con Aromas del Valle cuesta $7,132.84; ahorro $430.36 (6.0 %)", () => {
    expect(r.referencia).toMatchObject({ tipo: "un-proveedor", proveedores: ["Aromas del Valle"], total: 713284 });
    expect(r.ahorro).toEqual({ centavos: 43036, porcentaje: 6 });
  });

  it("comparando sin IVA da los totales del documento: $5,778.00 contra $6,149.00", () => {
    const s = resolverSurtido(LISTA, "JAL", catalogoEjemplo(), config({ compararConIva: false }));
    expect(s.totales.base).toBe(577800);
    expect(s.referencia!.base).toBe(614900);
    expect(s.ahorro!.centavos).toBe(37100);
  });

  it("usa la búsqueda exhaustiva (12 combinaciones)", () => {
    expect(r.metodo).toBe("exhaustivo");
  });
});

describe("Costo de riesgo (fórmula del documento)", () => {
  const soloCafe: Renglon[] = [{ tipoId: "cafe", cantidad: 10 }];

  it("Equilibrado, sin IVA: el riesgo de Café Rápido es 1,719 × 0.10 × 0.30 = $51.57", () => {
    const r = resolverSurtido(soloCafe, "JAL", catalogoEjemplo(), config({ prioridad: "equilibrado", compararConIva: false }));
    const d = grupoDe(r, "D")!;
    expect(d.totalSinIva).toBe(171900);
    expect(d.riesgo).toBe(5157);
    expect(r.totales.efectivo).toBe(177057);
  });

  it("con prioridad Confianza (p = 0.25) Café Rápido sigue ganando: $1,847.93 contra $1,947.18", () => {
    const r = resolverSurtido(soloCafe, "JAL", catalogoEjemplo(), config({ prioridad: "confianza", compararConIva: false }));
    expect(proveedorDelRenglon(r, 0)).toBe("D");
    expect(r.totales.efectivo).toBe(184793);
    const c = r.alternativas[0].find((a) => a.proveedorId === "C")!;
    expect(c.totalSiSeElige).toBe(190900 + Math.round(190900 * 0.16));
  });

  it("un proveedor con confianza 95 a $1,760.00 le gana a Café Rápido en Equilibrado, no en Ahorro", () => {
    // 10 kg × $162.10 + envío local $139 = $1,760.00
    const E = proveedor({ id: "E", nombre: "Café Confiable", estado: "JAL", confianza: 95 });
    const cat = catalogoEjemplo({
      proveedores: [A, B, C, D, E],
      ofertas: [...OFERTAS, oferta({ productoId: "E-cafe", proveedorId: "E", tipoId: "cafe", unidad: "kg", precioMenudeo: 17000, escalones: [{ cantidadMinima: 10, precioUnitario: 16210 }], pesoKg: 1 })],
    });
    const eq = resolverSurtido(soloCafe, "JAL", cat, config({ prioridad: "equilibrado", compararConIva: false }));
    expect(proveedorDelRenglon(eq, 0)).toBe("E");
    expect(grupoDe(eq, "E")!.totalSinIva).toBe(176000);
    expect(eq.totales.efectivo).toBe(176880);
    expect(eq.explicaciones[0].texto).toContain("más barato, pero tiene confianza 70/100");
    const ah = resolverSurtido(soloCafe, "JAL", cat, config({ prioridad: "ahorro", compararConIva: false }));
    expect(proveedorDelRenglon(ah, 0)).toBe("D");
  });

  it("el riesgo nunca se suma al total que se paga", () => {
    const r = resolverSurtido(LISTA, "JAL", catalogoEjemplo(), config({ prioridad: "confianza" }));
    const suma = r.grupos.reduce((s, g) => s + g.total, 0);
    expect(r.totales.total).toBe(suma);
    expect(r.totales.efectivo).toBeGreaterThan(r.totales.total);
  });
});

describe("Criterio 2 · pedido mínimo", () => {
  it("si pido 20 velas y solo Empaques Sureste las vende (mínimo 24), se ajusta a 24 con aviso", () => {
    const cat = catalogoEjemplo({ ofertas: OFERTAS.filter((o) => o.productoId !== "A-velas") });
    const r = resolverSurtido([{ tipoId: "vela", cantidad: 20 }], "JAL", cat, config());
    const linea = r.grupos[0].lineas[0];
    expect(linea).toMatchObject({ cantidadPedida: 20, cantidad: 24, ajuste: "minimo", precioUnitario: 7000 });
    expect(r.explicaciones[0].avisos[0]).toBe("Pediste 20 piezas, pero Empaques Sureste vende mínimo 24 piezas.");
  });
});

describe("Criterio 3 · piezas extra", () => {
  const soloA = catalogoEjemplo({ proveedores: [A] });
  it("con la opción activa sugiere 48 velas por $2,976 en vez de 40 por $3,040", () => {
    const r = resolverSurtido([{ tipoId: "vela", cantidad: 40 }], "JAL", soloA, config({ permitirExtra: true }));
    expect(r.grupos[0].lineas[0]).toMatchObject({ cantidad: 48, subtotal: 297600, ajuste: "extra", ahorroPorExtra: 6400 });
    expect(r.explicaciones[0].avisos[0]).toContain("Te conviene pedir 48 piezas en vez de 40 piezas");
  });
  it("sin la opción compra exactamente 40", () => {
    const r = resolverSurtido([{ tipoId: "vela", cantidad: 40 }], "JAL", soloA, config());
    expect(r.grupos[0].lineas[0]).toMatchObject({ cantidad: 40, subtotal: 304000, ajuste: null });
  });
  it("con la opción en la lista completa, Aromas del Valle baja a $6,097 sin IVA pero B + D sigue ganando", () => {
    const r = resolverSurtido(LISTA, "JAL", catalogoEjemplo(), config({ permitirExtra: true, compararConIva: false }));
    expect(r.referencia!.base).toBe(609700);
    expect(r.totales.base).toBe(577800);
  });
});

describe("Criterios 4 y 5 · filtros", () => {
  it("un proveedor que no envía a mi estado nunca aparece", () => {
    const cat = catalogoEjemplo({ proveedores: [A, B, C, { ...D, enviaA: ["YUC", "VER"] }] });
    const r = resolverSurtido(LISTA, "JAL", cat, config());
    expect(r.grupos.map((g) => g.proveedorId)).not.toContain("D");
    expect(Object.values(r.alternativas).flat().map((a) => a.proveedorId)).not.toContain("D");
  });

  it("proveedor no verificado, producto pausado o sin existencias: nunca aparecen", () => {
    const cat = catalogoEjemplo({
      proveedores: [A, { ...B, verificado: false }, C, D],
      ofertas: OFERTAS.map((o) =>
        o.productoId === "D-cafe" ? { ...o, activo: false } : o.productoId === "C-cafe" ? { ...o, existencias: 5 } : o,
      ),
    });
    const r = resolverSurtido(LISTA, "JAL", cat, config());
    expect(r.grupos.map((g) => g.proveedorId)).toEqual(["A"]);
  });

  it("perecedero: si la paquetería tarda más de lo que aguanta, se excluye", () => {
    const cat = catalogoEjemplo({
      ofertas: OFERTAS.map((o) => (o.tipoId === "cafe" ? { ...o, maxDiasTransito: 2 } : o)),
    });
    const r = resolverSurtido([{ tipoId: "cafe", cantidad: 10 }], "JAL", cat, config());
    // C (Veracruz, nacional 3–5 días) queda fuera; A y D son locales (1–2 días).
    expect(r.alternativas[0].map((a) => a.proveedorId).sort()).toEqual(["A", "D"]);
  });
});

describe("Criterio 6 · renglones sin proveedor", () => {
  it("marca el renglón imposible con su motivo y resuelve el resto", () => {
    const r = resolverSurtido([...LISTA, { tipoId: "jabon", cantidad: 50 }], "JAL", catalogoEjemplo(), config());
    expect(r.sinProveedor).toEqual([
      { renglon: 3, tipoId: "jabon", cantidad: 50, motivo: "Todavía no hay productos de este tipo en Provana." },
    ]);
    expect(r.totales.total).toBe(670248);
  });

  it("explica cuando nadie envía al estado", () => {
    const cat = catalogoEjemplo({ proveedores: [A, B, C, D].map((p) => ({ ...p, enviaA: ["JAL"] })) });
    const r = resolverSurtido([{ tipoId: "cafe", cantidad: 10 }], "YUC", cat, config());
    expect(r.sinProveedor[0].motivo).toBe("Ningún proveedor de este producto envía a Yucatán.");
    expect(r.grupos).toEqual([]);
  });

  it("explica cuando falta existencia", () => {
    const r = resolverSurtido([{ tipoId: "cafe", cantidad: 1_000_000 }], "JAL", catalogoEjemplo(), config());
    expect(r.sinProveedor[0].motivo).toBe("Ningún proveedor tiene existencias para 1,000,000 kg.");
  });
});

describe("Criterio 7 · confianza mínima", () => {
  it("un proveedor con confianza menor a 60 no se usa aunque sea más barato", () => {
    const cat = catalogoEjemplo({ proveedores: [A, B, C, { ...D, confianza: 55 }] });
    const r = resolverSurtido(LISTA, "JAL", cat, config({ prioridad: "confianza" }));
    expect(r.grupos.map((g) => g.proveedorId)).not.toContain("D");
    // Sin D, el café va con Aromas del Valle (local, $1,889) y no con Finca Los Cerros ($1,909):
    // B $4,059 + A $1,889 = $5,948 sin IVA.
    expect(r.grupos.find((g) => g.lineas.some((l) => l.renglon === 2))!.proveedorId).toBe("A");
    expect(r.totales.sinIva).toBe(594800);
  });
});

describe("Criterio 8 · empates", () => {
  it("con el mismo costo gana la combinación con menos proveedores", () => {
    const gratis = { base: 0, porKg: 0, diasMin: 1, diasMax: 2 };
    const cat: Catalogo = {
      estados: ESTADOS,
      tarifas: { ...TARIFAS, zonas: { local: gratis, regional: gratis, nacional: gratis } },
      proveedores: [proveedor({ id: "Y", estado: "JAL" }), proveedor({ id: "X", estado: "JAL" })],
      ofertas: [
        oferta({ productoId: "Y1", proveedorId: "Y", tipoId: "t1", precioMenudeo: 1000 }),
        oferta({ productoId: "X1", proveedorId: "X", tipoId: "t1", precioMenudeo: 1000 }),
        oferta({ productoId: "X2", proveedorId: "X", tipoId: "t2", precioMenudeo: 1000 }),
      ],
    };
    const r = resolverSurtido([{ tipoId: "t1", cantidad: 1 }, { tipoId: "t2", cantidad: 1 }], "JAL", cat, config());
    expect(r.grupos.map((g) => g.proveedorId)).toEqual(["X"]);
  });
});

describe("Criterio 9 · velocidad y calidad de la búsqueda", () => {
  function aleatorio(semilla: number) {
    let s = semilla;
    return () => {
      s = (s * 1103515245 + 12345) % 2147483648;
      return s / 2147483648;
    };
  }
  const claves = ["JAL", "COL", "YUC", "VER", "BCS"];

  function catalogoAleatorio(nProv: number, nTipos: number, semilla: number, pesado = false): Catalogo {
    const rnd = aleatorio(semilla);
    const proveedores: ProveedorSurtido[] = [];
    const ofertas: Oferta[] = [];
    for (let p = 0; p < nProv; p++) {
      const id = `P${p}`;
      proveedores.push(proveedor({ id, estado: claves[Math.floor(rnd() * claves.length)], confianza: 60 + Math.floor(rnd() * 40), cobraIva: rnd() > 0.2 }));
      for (let t = 0; t < nTipos; t++) {
        if (rnd() < 0.55) {
          const precio = pesado ? 300 + Math.floor(rnd() * 2000) : 1000 + Math.floor(rnd() * 9000);
          ofertas.push(
            oferta({
              productoId: `${id}-${t}`,
              proveedorId: id,
              tipoId: `t${t}`,
              precioMenudeo: precio,
              escalones: [{ cantidadMinima: 20, precioUnitario: Math.floor(precio * (0.7 + rnd() * 0.25)) }],
              pedidoMinimo: 1 + Math.floor(rnd() * 15),
              pesoKg: pesado ? 0.5 + rnd() * 4 : 0.1 + rnd() * 2,
            }),
          );
        }
      }
    }
    return { proveedores, ofertas, estados: ESTADOS, tarifas: TARIFAS };
  }

  const listaDe = (nTipos: number, rnd: () => number): Renglon[] =>
    Array.from({ length: nTipos }, (_, t) => ({ tipoId: `t${t}`, cantidad: 5 + Math.floor(rnd() * 40) }));

  it("12 proveedores × 10 renglones responde en menos de 1 segundo", () => {
    const cat = catalogoAleatorio(12, 10, 7);
    const t0 = performance.now();
    const r = resolverSurtido(listaDe(10, aleatorio(1)), "JAL", cat, config({ prioridad: "equilibrado" }));
    const ms = performance.now() - t0;
    expect(r.grupos.length).toBeGreaterThan(0);
    expect(ms).toBeLessThan(1000);
  });

  it("40 proveedores × 15 renglones responde en menos de 1 segundo", () => {
    const cat = catalogoAleatorio(40, 15, 11);
    const t0 = performance.now();
    const r = resolverSurtido(listaDe(15, aleatorio(2)), "JAL", cat, config({ prioridad: "equilibrado" }));
    const ms = performance.now() - t0;
    expect(r.grupos.length).toBeGreaterThan(0);
    expect(ms).toBeLessThan(1000);
  });

  it("subconjuntos y heurística contra la búsqueda exhaustiva en 150 casos aleatorios", () => {
    let igualesSub = 0;
    let igualesHeur = 0;
    let peorBrecha = 0;
    const casos = 150;
    for (let k = 0; k < casos; k++) {
      const rnd = aleatorio(1000 + k);
      // La mitad de los casos con envío caro frente al precio: ahí juntar paquetes importa más.
      const cat = catalogoAleatorio(7, 6, 5000 + k, k % 2 === 0);
      const lista = listaDe(6, rnd);
      const cfg = config({ prioridad: k % 2 ? "equilibrado" : "ahorro" });
      const exacto = resolverSurtido(lista, "JAL", cat, { ...cfg, forzarMetodo: "exhaustivo" });
      if (exacto.grupos.length === 0) continue;
      const sub = resolverSurtido(lista, "JAL", cat, { ...cfg, forzarMetodo: "subconjuntos" });
      const heur = resolverSurtido(lista, "JAL", cat, { ...cfg, forzarMetodo: "heuristico" });
      expect(sub.totales.efectivo).toBeGreaterThanOrEqual(exacto.totales.efectivo);
      expect(heur.totales.efectivo).toBeGreaterThanOrEqual(exacto.totales.efectivo);
      if (sub.totales.efectivo === exacto.totales.efectivo) igualesSub++;
      if (heur.totales.efectivo === exacto.totales.efectivo) igualesHeur++;
      peorBrecha = Math.max(
        peorBrecha,
        (sub.totales.efectivo - exacto.totales.efectivo) / exacto.totales.efectivo,
        (heur.totales.efectivo - exacto.totales.efectivo) / exacto.totales.efectivo,
      );
    }
    console.log(
      `Subconjuntos óptimos: ${igualesSub}/${casos} · heurística óptima: ${igualesHeur}/${casos} · peor brecha: ${(peorBrecha * 100).toFixed(2)} %`,
    );
    expect(igualesSub / casos).toBeGreaterThanOrEqual(0.95);
    expect(igualesHeur / casos).toBeGreaterThanOrEqual(0.9);
    expect(peorBrecha).toBeLessThan(0.02);
  });
});

describe("Criterio 10 · sumas exactas al centavo", () => {
  it("renglones + envíos + IVA = total, en cada proveedor y en el total general", () => {
    for (const prioridad of ["ahorro", "equilibrado", "confianza"] as const) {
      const r = resolverSurtido(LISTA, "JAL", catalogoEjemplo(), config({ prioridad, permitirExtra: true }));
      for (const g of r.grupos) {
        expect(g.lineas.reduce((s, l) => s + l.subtotal, 0)).toBe(g.productos);
        expect(g.productos + g.envio.costo + g.ivaProductos + g.envio.iva).toBe(g.total);
        g.lineas.forEach((l) => expect(l.precioUnitario * l.cantidad).toBe(l.subtotal));
      }
      expect(r.totales.productos + r.totales.envio + r.totales.iva).toBe(r.totales.total);
      expect(r.grupos.reduce((s, g) => s + g.total, 0)).toBe(r.totales.total);
    }
  });

  it("un proveedor que no cobra IVA no suma IVA a sus productos (el envío sí lleva IVA)", () => {
    const cat = catalogoEjemplo({ proveedores: [A, B, C, { ...D, cobraIva: false }] });
    const r = resolverSurtido([{ tipoId: "cafe", cantidad: 10 }], "JAL", cat, config());
    const d = grupoDe(r, "D")!;
    expect(d.ivaProductos).toBe(0);
    expect(d.envio.iva).toBe(2224);
    expect(d.total).toBe(158000 + 13900 + 2224);
  });
});

describe("Criterio 11 · explicaciones", () => {
  const r = resolverSurtido(LISTA, "JAL", catalogoEjemplo(), config());
  it("hay una explicación por renglón con proveedor, escalón y comparación", () => {
    expect(r.explicaciones).toHaveLength(3);
    const cafe = r.explicaciones.find((e) => e.renglon === 2)!;
    expect(cafe.proveedorId).toBe("D");
    expect(cafe.texto).toContain("10 kg a $158.00 c/u + IVA: precio de mayoreo desde 10 kg.");
    expect(cafe.alternativa!.diferencia).toBeGreaterThan(0);
    expect(cafe.avisos).toContain("Confianza 70/100: revisa sus reseñas antes de comprar.");
  });
  it("menciona el envío compartido", () => {
    const velas = r.explicaciones.find((e) => e.renglon === 0)!;
    expect(velas.texto).toContain("Comparte un solo envío con 1 producto más de Empaques Sureste.");
  });
  it("las alternativas de cada renglón dicen cuánto costaría toda la lista con cada proveedor", () => {
    const alts = r.alternativas[2];
    expect(alts.find((a) => a.elegido)!.totalSiSeElige).toBe(670248);
    expect(alts.map((a) => a.proveedorId).sort()).toEqual(["A", "C", "D"]);
  });
});

describe("Cambiar el proveedor de un renglón", () => {
  it("fijar Finca Los Cerros para el café recalcula el total y coincide con la alternativa anunciada", () => {
    const base = resolverSurtido(LISTA, "JAL", catalogoEjemplo(), config());
    const anunciado = base.alternativas[2].find((a) => a.proveedorId === "C")!.totalSiSeElige;
    const fijo = resolverSurtido(
      LISTA.map((r, i) => (i === 2 ? { ...r, proveedorFijo: "C" } : r)),
      "JAL",
      catalogoEjemplo(),
      config(),
    );
    expect(proveedorDelRenglon(fijo, 2)).toBe("C");
    expect(fijo.totales.total).toBe(anunciado);
    // La referencia no cambia al fijar.
    expect(fijo.referencia!.total).toBe(base.referencia!.total);
  });
});

// Criterio 12 · "Agregar todo al carrito": se prueba en el navegador (e2e/surtido.spec.ts),
// porque usa la capa de datos de la tienda.
