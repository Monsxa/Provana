# Surtido inteligente — propuesta de algoritmo

> **Estado: aprobado (bitácora, entradas 2 y 3) e implementado** en `src/lib/surtido/`. Pruebas: `src/lib/surtido/__tests__/`.

## Qué resuelve

El emprendedor dice **qué necesita y cuánto** (por ejemplo: 40 velas de soya, 500 bolsas kraft medianas, 10 kg de café) y **a qué estado se lo envían**. Provana arma la combinación de proveedores con el **menor costo total puesto en su puerta**: productos + envíos, cuidando la confianza. También le explica por qué eligió cada proveedor y cuánto ahorra frente a comprarlo todo con uno solo.

## Pieza previa: "tipos de producto"

Para comparar "velas de soya" entre proveedores distintos, cada producto del catálogo se liga a un **tipo de producto** con una ficha mínima. Por ejemplo, *Vela de soya 200 g* o *Bolsa kraft mediana 24×32 cm*. El comprador elige tipos, no productos de una tienda en particular. El proveedor elige el tipo al publicar, y el administrador puede corregirlo.

Se agrega la tabla `product_types (id, category_id, name, spec, unit)` y la columna `products.product_type_id`.

## El algoritmo en palabras sencillas

1. **Leer la lista.** Cada renglón es un tipo de producto, una cantidad y, si quieres, una variante (aroma, talla…).
2. **Juntar candidatos.** Para cada renglón se buscan los productos de ese tipo que cumplan todo esto:
   - el proveedor está **verificado**;
   - el producto está **activo**;
   - el proveedor **envía a tu estado**;
   - hay **existencias** suficientes;
   - si es perecedero, la paquetería llega dentro de su límite de días;
   - la confianza del proveedor no está por debajo del mínimo (configurable; propongo 60/100).
3. **Ponerle precio a cada candidato.** Se aplica el escalón de mayoreo que corresponde a tu cantidad.
   - Si pides menos que el **pedido mínimo**, se sube al mínimo y se avisa ("este proveedor vende mínimo 24; te llevarías 24").
   - Si comprar unas piezas más te baja de escalón y **el total sale más barato**, se te sugiere. Ejemplo: 40 velas a $76 = $3,040, pero 48 a $62 = $2,976. Eso es una sugerencia, no un cambio automático (opción "permitir piezas extra si sale más barato").
4. **Calcular envío por proveedor, no por producto.** Todo lo que compras a un mismo proveedor viaja en **un solo paquete**, así que el envío se paga una vez por proveedor. Por eso a veces conviene juntar productos con un proveedor aunque uno de ellos esté un poco más caro.
   - Peso cobrable = el mayor entre el peso real y el volumétrico (largo × ancho × alto ÷ 5000).
   - El costo sale de una tabla de tarifas por zona (local, regional, nacional, zona extendida), configurable por el administrador.
   - En el checkout se usa la cotización de la paquetería.
5. **Sumar un "costo de riesgo" según la confianza** (fórmula exacta en la sección "Costo de riesgo"). Solo se usa para decidir; nunca se cobra ni aparece en tu total.
   - A un proveedor con menos confianza se le suma un porcentaje virtual: `riesgo = (100 − confianza) / 100 × peso`.
   - Peso según la prioridad que elijas: **Ahorro** 0%, **Equilibrado** 10% (predeterminado), **Confianza** 25%.
   - La **confianza (0–100)** sale de datos reales: calificación con promedio bayesiano, porcentaje de pedidos completados, disputas perdidas y tiempo de respuesta.
6. **Probar combinaciones y quedarse con la mejor.** Se evalúan las combinaciones de proveedores y se elige la de menor **costo efectivo** (precio + envíos + riesgo).
   - Si hay pocos candidatos (≤ 12 proveedores relevantes), se prueban **todas**: resultado exacto.
   - Si hay más, primero se descartan los que no son los mejores para ningún renglón. Después se arma una solución rápida y se mejora probando quitar, agregar o cambiar un proveedor a la vez, hasta que ya no mejore.
   - Empates: gana la que usa **menos proveedores**, luego la de **mayor confianza** y luego la que **llega antes**.
7. **Calcular la comparación "todo con uno".** Se busca el proveedor que puede surtir **toda** la lista, con el menor total. Si ninguno puede, se compara contra la combinación con **el menor número de proveedores posible**.
   - Ahorro = total de esa referencia − total elegido. Se muestra en pesos y en porcentaje.
8. **Explicar cada decisión.** Por cada renglón: proveedor elegido, escalón aplicado, cuánto cuesta frente a la siguiente mejor opción, si comparte envío y su confianza. Ejemplo: *"Café con Café Rápido: $158/kg y envío local de $139. Finca Los Cerros cobra $165/kg más $259 de envío desde Veracruz (+$170 en total). Ojo: Café Rápido tiene confianza 70/100."*
9. **Mandar al carrito.** Con un botón se agrega todo al carrito, ya agrupado por proveedor. Se puede cambiar el proveedor de cualquier renglón y el total se recalcula en el momento.

Todo el dinero se maneja en **centavos enteros** y los precios incluyen IVA (desglosado en pantalla).

## Costo de riesgo: fórmula exacta

Para cada proveedor `s` dentro de una combinación:

```
subtotal_s       = productos_s + envío_s                       (lo que pagarías a ese proveedor)
riesgo_s         = subtotal_s × p × (100 − confianza_s) / 100
costo_efectivo   = Σ_s (subtotal_s + riesgo_s)                 (solo para decidir)
total_mostrado   = Σ_s subtotal_s                              (lo que realmente pagas)
```

- `p` = peso de la prioridad: **Ahorro 0.00 · Equilibrado 0.10 · Confianza 0.25** (valores iniciales, configurables por el administrador).
- `confianza_s` entre 0 y 100. Si es **menor a 60** (configurable), el proveedor queda fuera antes de calcular.
- Todo en centavos enteros. `riesgo_s` se redondea al centavo (mitad hacia arriba).
- Se gana la combinación con menor `costo_efectivo`; el `riesgo` **nunca** aparece en el total que pagas.

### Confianza (0–100), calculada con datos reales

```
confianza = 100 × (0.50·Q + 0.30·K + 0.10·D + 0.10·R)
```

| Componente | Fórmula | Lectura |
|---|---|---|
| Q · calificación | `(bayes − 1) / 4`, con `bayes = (10·m + Σ estrellas) / (10 + n)` y `m` = promedio de la plataforma | 5★ → 1, 1★ → 0 |
| K · cumplimiento | `(completados + 10·0.90) / (pedidos_cerrados + 10)` | pedidos completados entre pedidos cerrados, con previa de 90% |
| D · disputas | `max(0, 1 − 10 × disputas_perdidas / pedidos_cerrados)` | 10% de disputas perdidas → 0 |
| R · respuesta | `min(1, max(0, (48 − h) / 46))`, `h` = mediana de horas para la primera respuesta | ≤ 2 h → 1, ≥ 48 h → 0; sin datos → 0.5 |

### Ejemplo numérico

Café de la lista (10 kg a Jalisco), prioridad **Equilibrado** (`p = 0.10`):

| Proveedor | Subtotal (café + envío) | Confianza | Riesgo | Costo efectivo |
|---|---|---|---|---|
| D · Café Rápido | $1,580 + $139 = **$1,719.00** | 70 | 1,719 × 0.10 × 0.30 = **$51.57** | **$1,770.57** ✓ |
| C · Finca Los Cerros | $1,650 + $259 = **$1,909.00** | 92 | 1,909 × 0.10 × 0.08 = **$15.27** | $1,924.27 |

Gana D: es $190 más barato y el riesgo solo le suma $51.57. Con prioridad **Confianza** (`p = 0.25`): D = 1,719 + 128.93 = $1,847.93; C = 1,909 + 38.18 = $1,947.18; sigue ganando D. C solo ganaría con `p > 0.52`.

Caso donde la confianza **sí cambia** la decisión: un tercer proveedor E con confianza 95 que cobra $1,760.00 en total.
- D: 1,719 + 51.57 = **$1,770.57**
- E: 1,760 + 1,760 × 0.10 × 0.05 = 1,760 + 8.80 = **$1,768.80** ✓

En Equilibrado gana E: pagas $41 más por 25 puntos más de confianza. Regla práctica: con `p = 0.10`, la confianza decide cuando los precios están a menos de ~2.5% de diferencia por cada 25 puntos de confianza.

## Ejemplo trabajado (servirá como prueba automática)

Destino: **Jalisco**. Prioridad: **Ahorro**. Sin piezas extra.

| Necesito | Cantidad | Peso unitario |
|---|---|---|
| Vela de soya 200 g | 40 | 0.25 kg |
| Bolsa kraft mediana | 500 | 0.02 kg |
| Café de altura 1 kg | 10 | 1 kg |

| Proveedor | Estado | Confianza | Ofrece |
|---|---|---|---|
| A · Aromas del Valle | Jal. | 95 | Velas $89 / 12+ $76 / 48+ $62 (mín. 6) · Bolsas $3.00 / 500+ $2.20 (mín. 100) · Café $190 / 10+ $175 (mín. 5) |
| B · Empaques Sureste | Yuc. | 88 | Velas $80 / 24+ $70 (mín. 24) · Bolsas $2.40 / 500+ $1.80 / 2000+ $1.35 (mín. 200) |
| C · Finca Los Cerros | Ver. | 92 | Café $185 / 10+ $165 / 50+ $148 (mín. 5) |
| D · Café Rápido | Jal. | 70 | Café $170 / 10+ $158 (mín. 5) |

Tarifa de prueba: mismo estado $79 + $6 por kg; otro estado lejano $159 + $10 por kg (kg redondeados hacia arriba).

**Resultado esperado** (sin IVA, como se aprobó; la prueba también verifica la versión con IVA: total **$6,702.48**, referencia **$7,132.84**, ahorro **$430.36 · 6.0 %**):
- Velas y bolsas con **B**: $2,800 + $900 + envío de 20 kg $359 = **$4,059**.
- Café con **D**: $1,580 + envío de 10 kg $139 = **$1,719**.
- **Total: $5,778.00 MXN.**
- Referencia "todo con uno" (**A** es el único que tiene los tres): $3,040 + $1,100 + $1,750 + envío de 30 kg $259 = **$6,149.00**.
- **Ahorro: $371.00 (6.0 %).**
- Con la opción "piezas extra" activada, A bajaría a $6,097 (48 velas), pero la combinación B + D sigue ganando con $5,778.

## Criterios de aceptación (cada uno será una prueba automática)

1. Con el ejemplo anterior, el total es exactamente **$5,778.00**, la referencia **$6,149.00** y el ahorro **$371.00**.
2. Si pido 20 velas a B (mínimo 24), el renglón se ajusta a 24 piezas y se muestra el aviso.
3. Con "piezas extra" activa y 40 velas solo disponibles con A, se sugiere comprar 48 por **$2,976** en lugar de 40 por $3,040.
4. Un proveedor que **no envía** a mi estado nunca aparece en la solución.
5. Un proveedor **no verificado**, un producto **pausado** o sin existencias suficientes nunca aparece.
6. Si ningún proveedor puede surtir un renglón, ese renglón se marca "sin proveedor disponible" y el resto se resuelve igual.
7. Con prioridad **Confianza**, un proveedor con confianza menor al mínimo configurado no se usa aunque sea más barato.
8. Dos combinaciones con el mismo costo: gana la de menos proveedores.
9. Con 12 proveedores y 10 renglones, la búsqueda exacta responde en menos de 1 segundo. Con 40 proveedores, la búsqueda aproximada responde en menos de 1 segundo y su resultado se compara contra la búsqueda exacta en casos aleatorios pequeños.
10. La suma de los renglones + envíos siempre es igual al total mostrado (sin errores de centavos).
11. Cada renglón trae una explicación con proveedor, escalón, comparación con la segunda mejor opción y confianza.
12. "Agregar todo al carrito" deja en el carrito exactamente los productos, variantes y cantidades de la solución.

## Lista en texto libre con IA (opcional, después)

Primero funciona eligiendo tipos y cantidades. Si se aprueba, se agrega una caja de texto ("necesito 40 velas de lavanda y medio millar de bolsas kraft"). Un modelo de Claude convierte el texto en renglones `{tipo, cantidad, variante}` validados contra el catálogo. **El comprador revisa y confirma los renglones antes de calcular**, para que un error de la IA nunca termine en una compra.
