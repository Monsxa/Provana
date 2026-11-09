# Especificaciones por funcionalidad

Cada funcionalidad se descompone en pasos concretos y criterios de aceptación verificables **antes** de programarla. Cada criterio apunta a la prueba automática que lo verifica.

Estado: ✅ probado · ⏳ pendiente

---

## 1. Surtido inteligente (función estrella) ✅

Especificación completa, fórmula del costo de riesgo y ejemplo trabajado: [`surtido-inteligente.md`](surtido-inteligente.md).

| # | Criterio | Prueba |
|---|---|---|
| 1 | 40 velas, 500 bolsas y 10 kg de café a Jalisco: total $5,778.00 sin IVA ($6,702.48 con IVA); referencia $6,149.00; ahorro $371.00 ($430.36 con IVA) | `motor.test.ts` › Criterio 1 |
| 2 | 20 velas con mínimo de 24 → se ajusta a 24 con aviso | › Criterio 2 |
| 3 | Con piezas extra: 48 velas por $2,976 en vez de 40 por $3,040 | › Criterio 3 |
| 4 | Un proveedor que no envía a mi estado nunca aparece | › Criterios 4 y 5 |
| 5 | No verificado, pausado o sin existencias: nunca aparecen | › Criterios 4 y 5 |
| 6 | Renglón imposible: se marca con motivo y el resto se resuelve | › Criterio 6 |
| 7 | Confianza < 60: excluido aunque sea más barato | › Criterio 7 |
| 8 | Empate: gana la de menos proveedores | › Criterio 8 |
| 9 | 12 × 10 y 40 × 15 en < 1 s; búsqueda aproximada contra exacta en 150 casos | › Criterio 9 |
| 10 | Sumas exactas al centavo | › Criterio 10 |
| 11 | Explicación por renglón con escalón, comparación y confianza | › Criterio 11 |
| 12 | "Agregar todo al carrito" | ⏳ bloque de carrito |

Pruebas en navegador (`e2e/surtido.spec.ts`, celular y escritorio): validación del formulario, cálculo completo, cambio de proveedor de un renglón, ejemplo con ahorro, motivos sin proveedor y rechazo de datos inválidos.

### Algoritmo: precio por cantidad

1. Ordenar escalones por cantidad mínima.
2. Precio = el del escalón más alto con `cantidadMinima ≤ cantidad`; si ninguno aplica, menudeo.
3. Si `cantidad < pedidoMinimo`, comprar `pedidoMinimo` (ajuste "minimo").
4. Con piezas extra permitidas: por cada escalón superior con existencias, si `precio × cantidadMinima` es menor que el subtotal actual, comprar esa cantidad (ajuste "extra").
5. Validación al guardar: cada escalón pide más piezas y cuesta menos que el anterior; el primero cuesta menos que el menudeo.

Código: `src/lib/surtido/precios.ts` · Pruebas: `precios.test.ts`.

### Algoritmo: cálculo de envío (simulado)

1. Zona: **local** (mismo estado), **regional** (misma región), **nacional** (otro caso).
2. Kg cobrables por paquete = `max(1, ⌈max(peso real, peso volumétrico)⌉)`, con peso volumétrico = largo × ancho × alto ÷ 5000.
3. Costo = base de la zona + costo por kg × kg cobrables (+ recargo de zona extendida).
4. Días = días de la zona (+ días extra en zona extendida) + días de preparación del proveedor.
5. IVA del envío: 16 % siempre.

Tarifas en `src/data/tarifas.json` · Código: `src/lib/surtido/envio.ts`.

### Algoritmo: confianza del proveedor (0–100)

`confianza = 100 × (0.50·Q + 0.30·K + 0.10·D + 0.10·R)`, con calificación bayesiana (peso 10 reseñas), cumplimiento con previa de 90 %, disputas perdidas y mediana de respuesta. Detalle en `surtido-inteligente.md`. Código: `src/lib/surtido/confianza.ts`.

### Algoritmo: flujo de estados del pedido

⏳ Se especifica en el bloque de pedidos. Diagrama propuesto en el README.

---

## 2. Cuentas, catálogo y carrito ⏳

Se especifica al iniciar el bloque.
