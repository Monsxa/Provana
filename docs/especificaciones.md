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

```
pendiente_pago → confirmado → preparando → enviado → entregado → completado
pendiente_pago | confirmado → cancelado            (cancelación gratis antes de "preparando")
enviado | entregado → en_disputa → completado | reembolsado
```

1. Cada acción tiene estados de origen, estado destino y quién puede hacerla (`REGLAS` en `src/lib/tienda/pedidos.ts`).
2. Si el estado actual o el actor no coinciden, se rechaza con un mensaje claro.
3. El pago acompaña al pedido: `pendiente → retenido` al acreditar, `liberado` al completar, `detenido` en disputa, `reembolsado` o `reembolso_parcial` al resolver.
4. Liquidación: comisión = redondeo(8 % × (productos − descuento)); el proveedor recibe productos − descuento + IVA de productos − comisión. El envío se usa para pagar la guía.
5. Liberación automática: si un pedido lleva `diasLiberacion` días entregado sin confirmar ni disputa, pasa a completado.

Pruebas: `src/lib/tienda/__tests__/tienda.test.ts` y `flujo.test.ts`.

---

## 2. Tienda en modo demostración ✅

| Criterio | Prueba |
|---|---|
| Un proveedor se registra, sube RFC, identificación, domicilio y taller; queda en revisión y no aparece en el catálogo | `flujo.test.ts`, `e2e/flujo-completo.spec.ts` |
| Solo administración verifica o rechaza (con motivo de al menos 10 caracteres) | idem |
| Un escalón más caro que el anterior se rechaza al publicar | idem |
| 24 velas con escalón desde 24 a $62: "Ya tienes el mejor precio"; con 20 avisa "Te faltan 4 piezas" | `e2e/flujo-completo.spec.ts` |
| El carrito anónimo se une al entrar; se agrupa por proveedor; valida mínimos y existencias | `flujo.test.ts` |
| Una tarjeta real (4111…) se rechaza; la de prueba 4242 se aprueba y solo se guardan los últimos 4 dígitos | `tienda.test.ts`, e2e |
| Al pagar se reserva inventario; al cancelar se devuelve | `flujo.test.ts` |
| Cancelar solo antes de "preparando" | `tienda.test.ts`, e2e |
| Confirmar la entrega libera el pago menos 8 % de comisión sobre productos | `tienda.test.ts`, `flujo.test.ts` |
| Solo quien completó el pedido reseña, una vez | `flujo.test.ts` |
| Una disputa detiene el pago; administración reembolsa una parte | `tienda.test.ts`, `flujo.test.ts`, e2e |
| 5 días después de entregado sin confirmar, se libera solo | `flujo.test.ts` |
| CSV: la plantilla se importa; las filas con error se reportan con número de fila | `tienda.test.ts` |
| CP 44100 → Jalisco, 06700 → CDMX | `tienda.test.ts` |
| Cada pantalla pasa axe (claro y oscuro) | `e2e/accesibilidad.spec.ts` |
