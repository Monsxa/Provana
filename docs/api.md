# API de Provana

Todas las rutas viven en `src/app/api/`. Las entradas se validan en el servidor con Zod (`src/lib/esquemas.ts`). Su JSON Schema se genera con `npm run esquemas` y queda en `/esquemas`.

Errores: siempre `{ "error": "mensaje en español" }`, a veces con `detalles: [{ campo, mensaje }]`.

---

## `POST /api/surtido`

Arma el surtido inteligente: la combinación de proveedores con el menor costo efectivo para una lista de productos y un estado de destino.

**Límite:** 30 solicitudes por minuto por IP. Si se pasa, responde `429` con el encabezado `Retry-After: 60`. El límite se guarda en memoria de cada instancia; ver `src/lib/limite.ts`.

### Entrada (`application/json`)

Esquema: [`esquemas/solicitud-surtido.schema.json`](../esquemas/solicitud-surtido.schema.json)

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `estadoDestino` | string | sí | Clave del estado, p. ej. `"JAL"`. Las 32 claves están en `src/data/estados.json` |
| `prioridad` | `"ahorro"` · `"equilibrado"` · `"confianza"` | no (`"equilibrado"`) | Peso del costo de riesgo: 0 · 0.10 · 0.25 |
| `permitirExtra` | boolean | no (`false`) | Sugerir piezas extra cuando el siguiente escalón sale más barato |
| `renglones` | arreglo (1–30) | sí | Lo que se necesita |
| `renglones[].tipoId` | string | sí | Tipo de producto, p. ej. `"cafe-altura-1kg"` |
| `renglones[].cantidad` | entero 1–1,000,000 | sí | Cantidad en la unidad del tipo |
| `renglones[].variante` | objeto o null | no | P. ej. `{ "aroma": "lavanda" }` |
| `renglones[].proveedorFijo` | string o null | no | Obliga a comprar ese renglón con ese proveedor |

```json
{
  "estadoDestino": "JAL",
  "prioridad": "equilibrado",
  "renglones": [
    { "tipoId": "vela-soya-200g", "cantidad": 40 },
    { "tipoId": "bolsa-kraft-mediana", "cantidad": 500 },
    { "tipoId": "cafe-altura-1kg", "cantidad": 10 }
  ]
}
```

### Salida `200`

Todos los montos van en **centavos** (enteros).

| Campo | Descripción |
|---|---|
| `metodo` | `"exhaustivo"` · `"subconjuntos"` · `"heuristico"` (cómo se buscó) |
| `grupos[]` | Un grupo por proveedor elegido: `proveedorNombre`, `confianza`, `lineas[]`, `productos`, `ivaProductos`, `envio { zona, kgCobrables, costo, iva, diasMin, diasMax }`, `total`, `riesgo` |
| `grupos[].lineas[]` | `renglon`, `nombre`, `cantidadPedida`, `cantidad`, `ajuste` (`"minimo"`/`"extra"`/`null`), `precioUnitario`, `escalonAplicado`, `subtotal` |
| `totales` | `productos`, `envio`, `iva`, `sinIva`, `total` (lo que se paga), `base` (base de comparación), `efectivo` (base + riesgo) |
| `referencia` | `{ tipo: "un-proveedor" \| "menos-proveedores", proveedores[], total }` |
| `ahorro` | `{ centavos, porcentaje }` frente a la referencia (puede ser negativo con prioridad Confianza) |
| `explicaciones[]` | Por renglón: `texto`, `alternativa { proveedorNombre, diferencia }`, `avisos[]` |
| `alternativas` | Por renglón: cada proveedor posible con `totalSiSeElige` (total de toda la lista si ese renglón se compra con él) |
| `sinProveedor[]` | Renglones que nadie puede surtir, con `motivo` |

### Errores

| Código | Cuándo |
|---|---|
| `400` | JSON inválido, datos que no cumplen el esquema o estado inexistente |
| `429` | Más de 30 solicitudes por minuto desde la misma IP |

### Prueba rápida

```bash
curl -s -X POST http://localhost:3000/api/surtido -H 'content-type: application/json' -d '{"estadoDestino":"JAL","renglones":[{"tipoId":"cafe-altura-1kg","cantidad":10}]}'
```

---

## Capa de datos de la tienda (modo demostración)

La tienda no usa endpoints HTTP: las pantallas llaman funciones de `src/lib/tienda/almacen.ts`, que guardan en el navegador y revisan permisos. Al conectar Supabase, cada función se vuelve una ruta o una consulta con RLS, con la misma firma.

| Función | Quién | Entrada | Efecto / salida |
|---|---|---|---|
| `registrar` | cualquiera | nombre, email, clave, rol, negocio? | Crea usuario (y proveedor en revisión); aviso para confirmar correo |
| `entrar` / `salir` | cualquiera | email, clave | Sesión; une el carrito anónimo |
| `pedirRecuperacion` / `restablecerClave` | cualquiera | email, código, nueva clave | Código de 6 dígitos en avisos |
| `agregarAlCarrito` / `cambiarCantidad` / `quitarDelCarrito` | cualquiera | productoId, cantidad | Valida disponibilidad y existencias; devuelve el texto del aviso |
| `comprar` | comprador | dirección, envíos, cupones, método, tarjeta?, factura | Un pedido por proveedor, pago retenido o pendiente, reserva inventario |
| `simularPagoRecibido` | comprador | grupoCompra | Acredita OXXO/SPEI (demo) |
| `accionPedido` | según actor | pedidoId, acción, nota | preparar, enviar (genera guía), marcar_entregado, confirmar_entrega, cancelar, abrir_disputa |
| `resolverDisputa` | admin | disputaId, resolución, monto | Libera, reembolsa total o parcial |
| `resenar` / `responderResena` / `reportarResena` / `moderarResena` | comprador / proveedor / cualquiera / admin | — | Reglas de reseñas |
| `enviarMensaje` | comprador o proveedor del hilo | hilo, texto | Chat + aviso |
| `solicitarCotizacion` / `responderCotizacion` | comprador / proveedor | — | Cotizaciones y muestras |
| `guardarProducto` / `cambiarEstadoProducto` / `importarCsv` | proveedor dueño | datos del producto / CSV | Valida escalones y permisos sanitarios; avisa bajadas de precio |
| `subirDocumento` / `subirFactura` / `guardarCupon` / `guardarTienda` | proveedor | — | Verificación, CFDI, cupones, datos de la tienda |
| `verificarProveedor` / `guardarAjustes` / `adelantarReloj` | admin | — | Verificación, comisión y reglas, reloj simulado |
