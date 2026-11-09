# Wireframes de Provana

Baja fidelidad, **celular primero** (columna de ~375 px). En escritorio cada pantalla se abre a 2 o 3 columnas; se indica al pie de cada una. El estilo visual final parte de la landing actual: verde `#1D6F52`, ámbar `#D98A2B` para acentos, Fraunces en títulos, IBM Plex Sans en texto e IBM Plex Mono en precios y cifras.

Leyenda: `[Botón]` · `( ) opción` · `[x] casilla` · `▸` navega · `★` calificación · `🛡` sello verificado · `🇲🇽` sello "Negocio mexicano".

---

## 1. Inicio

```
┌─────────────────────────────┐
│ ⬡ Provana          🔍  🛒 2 │
├─────────────────────────────┤
│ [ Busca velas, café, bolsas…]│
│                             │
│ Encuentra proveedores.      │
│ Compra con confianza.       │
│ [Explorar catálogo]         │
│                             │
│ 214 proveedores · 4.7★ · 32 │  ← cifras reales de la base
├─────────────────────────────┤
│ Categorías  ◂ chips ▸       │
│ [Empaque][Café][Textil]…    │
├─────────────────────────────┤
│ Productos destacados        │
│ ┌──────────┐ ┌──────────┐   │
│ │  foto    │ │  foto    │   │
│ │ Velas…   │ │ Bolsas…  │   │
│ │ $89 · 12+│ │ $2.40    │   │
│ │ 🛡🇲🇽 4.9★│ │ 🛡🇲🇽 4.6★│   │
│ └──────────┘ └──────────┘   │
├─────────────────────────────┤
│ Cómo funciona (4 pasos)     │
│ Pago protegido hasta entrega│
│ [Quiero vender en Provana]  │
└─────────────────────────────┘
 ⌂ Inicio  🔍 Buscar  ♡  👤     ← barra inferior en celular
```
Escritorio: hero en 2 columnas como la landing actual; cuadrícula de 3 a 4 productos.

## 2. Catálogo con filtros

```
┌─────────────────────────────┐
│ ← [ cafe            ] 🔍    │  ← "cafe" encuentra "café"
│ 128 resultados  [Filtros 3] │
│ Ordenar: [Menor precio ▾]   │
├─────────────────────────────┤
│ ┌───┐ Café de altura 1 kg   │
│ │img│ Finca Los Cerros 🛡🇲🇽 │
│ └───┘ $185/kg · 10+ $165    │
│       4.8★ · Xalapa, Ver.   │
│       Mín 5 kg · llega 2–4 d│
│       ♡   [Comparar]        │
├─────────────────────────────┤
│ … más resultados …          │
└─────────────────────────────┘
  [Comparar (2)] ← barra flotante

Hoja de filtros (sube desde abajo):
┌─────────────────────────────┐
│ Filtros            [Limpiar]│
│ Categoría   [Alimentos ▾]   │
│ Estado del proveedor [▾]    │
│ Precio  $[ 50 ]–$[ 500 ]    │
│ Calificación  ( )4★+ ( )3★+ │
│ [x] Solo verificados        │
│ Pedido mínimo ≤ [  10 ]     │
│ Entrega ≤ [ 5 ] días        │
│ [x] Envía a mi estado (Jal.)│
│ [Ver 42 resultados]         │
└─────────────────────────────┘
```
Escritorio: filtros fijos en columna izquierda, resultados en cuadrícula.

## 3. Producto con calculadora de precio

```
┌─────────────────────────────┐
│ ←                    ♡  ⇪   │
│ ┌─────────────────────────┐ │
│ │      galería de fotos   │ │
│ │        • ○ ○ ○          │ │
│ └─────────────────────────┘ │
│ Velas aromáticas de soya    │
│ Aromas del Valle 🛡🇲🇽 ▸     │
│ 4.9★ (312) · 1,204 pedidos  │
├─────────────────────────────┤
│ Aroma: (•)Lavanda ( )Vainilla│
│ Cantidad  [ − ] 40 [ + ]    │
│ ┌─────────────────────────┐ │
│ │ 1–11 pzas   $89         │ │
│ │ 12–47 pzas  $76  ← tú   │ │
│ │ 48+ pzas    $62         │ │
│ └─────────────────────────┘ │
│ Te faltan 8 piezas para     │
│ pagar $62 c/u en todas      │
│ Subtotal  $3,040.00         │
│ IVA incluido  $419.31       │
├─────────────────────────────┤
│ Envío a [Jalisco ▾] CP[44100]│
│ Desde $129 · llega 12–14 nov│
├─────────────────────────────┤
│ [Agregar al carrito]        │
│ [Pedir cotización] [Muestra]│
├─────────────────────────────┤
│ Detalles · medidas · peso   │
│ Permisos / etiquetado       │
│ Condiciones del proveedor   │
│ Reseñas (312) ▸             │
└─────────────────────────────┘
```
Escritorio: galería a la izquierda, compra a la derecha fija al hacer scroll.

## 4. Perfil público del proveedor

```
┌─────────────────────────────┐
│ ←                           │
│ (AV) Aromas del Valle       │
│      🛡 Verificado 🇲🇽 Negocio│
│      mexicano               │
│ Guadalajara, Jal. · desde 2024│
├─────────────────────────────┤
│ 4.9★   312 reseñas          │
│ 1,204 pedidos · 97% completados│
│ Responde en ~2 h (real)     │
│ Prepara en 2 días · Envía a │
│ 28 estados ▸                │
├─────────────────────────────┤
│ Condiciones de compra       │
│ [Enviar mensaje]            │
├─────────────────────────────┤
│ Productos (24)  [cuadrícula]│
│ Reseñas recientes           │
└─────────────────────────────┘
```

## 5. Comparador (hasta 3)

```
┌──────────┬────────┬────────┬────────┐
│          │ Café A │ Café B │ Café C │
├──────────┼────────┼────────┼────────┤
│ Menudeo  │ $185   │ $172 ✓ │ $190   │
│ Mayoreo  │ $148 ✓ │ $155   │ $150   │
│ Mínimo   │ 5 kg   │ 1 kg ✓ │ 10 kg  │
│ Calif.   │ 4.8 ✓  │ 4.5    │ 4.6    │
│ Entrega  │ 2–4 d ✓│ 3–6 d  │ 2–5 d  │
│ Envía a  │ Sí     │ Sí     │ No     │
└──────────┴────────┴────────┴────────┘
 ✓ = mejor de la fila. En celular: desliza horizontal con la 1.ª columna fija.
```

## 6. Carrito agrupado por proveedor

```
┌─────────────────────────────┐
│ Carrito (3 productos)       │
├─────────────────────────────┤
│ Aromas del Valle · Jal.     │
│  Velas lavanda  40 × $76    │
│  [−] 40 [+]        $3,040   │
│  ⚠ Te faltan 8 para $62 c/u │
│  Subtotal proveedor $3,040  │
├─────────────────────────────┤
│ Empaques Sureste · Yuc.     │
│  Bolsas kraft  150 pzas     │
│  ✖ Mínimo 200 pzas          │  ← bloquea pagar
├─────────────────────────────┤
│ Se generarán 2 pedidos y    │
│ 2 envíos independientes.    │
│ Subtotal          $3,400.00 │
│ [Continuar al pago]         │
└─────────────────────────────┘
```

## 7. Checkout: envío y pago

```
┌─────────────────────────────┐
│ 1 Dirección ▸ 2 Envío ▸ 3 Pago│
├─────────────────────────────┤
│ Envío para Aromas del Valle │
│ (•) Estafeta  $129  13 nov  │
│     Más barata              │
│ ( ) DHL       $210  11 nov  │
│     Más rápida              │
│ ( ) FedEx     $158  12 nov  │
│     Recomendada             │
│ ( ) Entrega en sucursal $99 │
├─────────────────────────────┤
│ Envío para Empaques Sureste │
│ … (mismo bloque) …          │
├─────────────────────────────┤
│ [x] Necesito factura (CFDI) │
│     RFC [            ]      │
│ Pago: (•)Tarjeta ( )OXXO    │
│       ( )Transferencia SPEI │
│ Productos       $3,400.00   │
│ Envíos            $287.00   │
│ IVA incluido      $508.55   │
│ Total           $3,687.00   │
│ 🛡 Tu pago queda protegido   │
│ hasta que confirmes entrega │
│ [Pagar $3,687.00]           │
└─────────────────────────────┘
```

## 8. Detalle de pedido (comprador)

```
┌─────────────────────────────┐
│ Pedido PV-10482             │
│ Aromas del Valle            │
├─────────────────────────────┤
│ ● Confirmado      9 nov     │
│ ● Preparando     10 nov     │
│ ● Enviado        11 nov     │
│   Estafeta 7801 2345 ▸      │
│ ○ Entregado                 │
│ ○ Completado                │
├─────────────────────────────┤
│ [Confirmar entrega]         │  ← aparece al entregar
│ [Tuve un problema]          │
│ [Mensaje al proveedor]      │
│ [Volver a pedir]            │
│ Factura: PDF ▸ XML ▸        │
└─────────────────────────────┘
```

## 9. Registro de proveedor y verificación

```
┌─────────────────────────────┐
│ Vende en Provana   Paso 2/4 │
├─────────────────────────────┤
│ Documentos (privados)       │
│ RFC           [Subir] ✓     │
│ INE/pasaporte [Subir] ✓     │
│ Comprobante de             │
│ domicilio MX  [Subir]       │
│ Fotos taller/ │             │
│ bodega        [Subir 0/3]   │
│ [Continuar]                 │
└─────────────────────────────┘
Pasos: 1 Negocio (nombre, RFC, estado, ciudad) · 2 Documentos ·
3 Envíos (origen, días de preparación, estados a los que envía) ·
4 Cobros (alta en Stripe). Después: estado "En revisión".
```

## 10. Panel del proveedor

```
┌─────────────────────────────┐
│ Hola, Aromas del Valle      │
│ ⚠ 2 productos con poco      │
│   inventario ▸              │
├─────────────────────────────┤
│ Ventas nov   $48,210        │
│ Por atender  5 pedidos ▸    │
│ Activos      24 productos   │
│ Calificación 4.9★           │
├─────────────────────────────┤
│ ▁▃▅▄▆█  (6 meses)           │
│ "Vendiste 18% más que en    │
│  octubre; la mitad viene de │
│  mayoreo de 48+ piezas."    │
├─────────────────────────────┤
│ Pedidos · Productos ·       │
│ Carga masiva · Facturas ·   │
│ Cupones · Estado de cuenta ·│
│ Mi tienda                   │
└─────────────────────────────┘
```

## 11. Administración

```
┌──────────────────────────────────────────────┐
│ Admin  Verificaciones(7) Disputas(2) Reseñas │
│        reportadas(1) Métricas  Ajustes       │
├──────────────────────────────────────────────┤
│ Verificación: Textiles Norteña               │
│ RFC: TNO210315AB1  ·  Torreón, Coah.         │
│ [RFC ▸] [INE ▸] [Domicilio ▸] [Fotos ▸]      │
│ [Aprobar]   [Rechazar…] → motivo obligatorio │
├──────────────────────────────────────────────┤
│ Ajustes: Comisión por venta [ 8 ] %          │
│          Plazo de liberación [ 5 ] días      │
└──────────────────────────────────────────────┘
```
Pensado primero para escritorio (el admin trabaja en computadora), pero usable en celular.
