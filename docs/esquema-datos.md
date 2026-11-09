# Esquema de datos (propuesta)

Base: Postgres en Supabase. Convenciones:

- Dinero en **centavos de peso (enteros)**: `precio_cents = 7600` es $76.00 MXN. Nunca flotantes.
- Estados de México por **clave de 2–3 letras** (`AGS`, `BC`, … `ZAC`) en la tabla `states`.
- Todas las tablas con `id uuid`, `created_at`, `updated_at`.
- Seguridad por fila (RLS) activa en **todas** las tablas. Las reglas se resumen al final.
- Datos de ejemplo marcados con `is_demo = true` en proveedores y productos.

## Tablas

### Cuentas
| Tabla | Columnas principales |
|---|---|
| `profiles` | `id` (= `auth.users.id`), `role` (`comprador` · `proveedor` · `admin`), `full_name`, `phone`, `avatar_path` |
| `addresses` | `user_id`, `label`, `street`, `ext_number`, `int_number`, `neighborhood` (colonia), `city`, `state_code`, `postal_code`, `references`, `is_default` |
| `notification_prefs` | `user_id`, `event` (pedido, pago, envío, mensaje…), `email` bool, `whatsapp` bool |

### Proveedores y verificación
| Tabla | Columnas principales |
|---|---|
| `suppliers` | `owner_id`, `business_name`, `slug`, `rfc`, `description`, `origin_state`, `city`, `prep_days`, `verification_status` (`en_revision` · `verificado` · `rechazado`), `rejection_reason`, `verified_at`, `purchase_conditions`, `return_policy`, `stripe_account_id`, `featured_until`, `is_demo` |
| `supplier_documents` | `supplier_id`, `kind` (`rfc` · `identificacion` · `comprobante_domicilio` · `foto_taller` · `permiso_sanitario`), `storage_path` (bucket privado), `uploaded_at` |
| `supplier_shipping_states` | `supplier_id`, `state_code` |
| `states` | `code`, `name`, `region` |

### Catálogo
| Tabla | Columnas principales |
|---|---|
| `categories` | `slug`, `name`, `requires_permit` (alimentos, cosméticos, cuidado personal) |
| `products` | `supplier_id`, `category_id`, `name`, `slug`, `description`, `details` (jsonb validado), `unit` (pieza, kg, litro, caja…), `weight_g`, `length_cm`, `width_cm`, `height_cm`, `min_order_qty`, `status` (`activo` · `pausado`), `is_perishable`, `permit_info`, `retail_price_cents`, `search_vector`, `is_demo` |
| `product_images` | `product_id`, `storage_path`, `alt_text`, `position` |
| `product_variants` | `product_id`, `sku`, `attributes` (jsonb, p. ej. `{"aroma":"lavanda"}`), `price_delta_cents`, `stock`, `reserved` |
| `price_tiers` | `product_id`, `min_qty`, `unit_price_cents` — restricción: escalones crecientes en cantidad y decrecientes en precio |

### Carrito y compra
| Tabla | Columnas principales |
|---|---|
| `carts` | `user_id` (nulo si es anónimo), `anon_token` (cookie), `merged_into` |
| `cart_items` | `cart_id`, `variant_id`, `qty` |
| `inventory_reservations` | `variant_id`, `checkout_id`, `qty`, `expires_at` |
| `checkouts` | `buyer_id`, `stripe_payment_intent_id`, `payment_method` (`tarjeta` · `oxxo` · `spei`), `total_cents`, `status` |
| `orders` | `checkout_id`, `buyer_id`, `supplier_id`, `folio` (PV-#####), `status` (ver diagrama de estados), `subtotal_cents`, `shipping_cents`, `iva_cents`, `commission_rate`, `commission_cents`, `total_cents`, `shipping_address` (jsonb copia), `wants_invoice`, `invoice_rfc`, `invoice_data` (jsonb), `cancel_reason` |
| `order_items` | `order_id`, `variant_id`, `qty`, `unit_price_cents`, `snapshot` (nombre, foto y escalón al momento de comprar) |
| `order_events` | `order_id`, `status`, `note`, `actor_id` — historial inmutable |
| `quote_requests` | `buyer_id`, `supplier_id`, `product_id`, `kind` (`cotizacion` · `muestra`), `qty`, `message`, `status`, `offered_price_cents`, `valid_until` |
| `shopping_lists` / `shopping_list_items` | listas recurrentes y "volver a pedir" |
| `coupons` | `supplier_id`, `code`, `kind` (`porcentaje` · `monto`), `value`, `min_subtotal_cents`, `starts_at`, `ends_at`, `max_uses` |

### Dinero
| Tabla | Columnas principales |
|---|---|
| `payouts` | `order_id`, `supplier_id`, `gross_cents`, `commission_cents`, `net_cents`, `status` (`retenido` · `detenido` · `liberado` · `reembolsado`), `release_after`, `stripe_transfer_id`, `released_at` |
| `invoices` | `order_id`, `xml_path`, `pdf_path`, `uploaded_at` |
| `platform_settings` | `key`, `value` (jsonb): `commission_rate`, `auto_release_days`, `featured_plan`… |

### Envíos
| Tabla | Columnas principales |
|---|---|
| `shipments` | `order_id`, `provider` (`envia`), `carrier`, `service`, `cost_cents`, `eta_date`, `tracking_number`, `label_path`, `provider_shipment_id`, `status`, `last_event_at` |
| `shipment_events` | `shipment_id`, `status`, `description`, `occurred_at` (llegan por webhook) |

### Confianza y comunicación
| Tabla | Columnas principales |
|---|---|
| `reviews` | `order_id` (único), `buyer_id`, `supplier_id`, `rating` 1–5, `body`, `photo_paths`, `supplier_reply`, `replied_at`, `hidden` |
| `review_reports` | `review_id`, `reporter_id`, `reason`, `status` |
| `disputes` | `order_id`, `opened_by`, `reason`, `status` (`abierta` · `resuelta_proveedor` · `resuelta_comprador`), `resolution_note`, `resolved_by` |
| `dispute_messages` | `dispute_id`, `author_id`, `body`, `attachments` |
| `conversations` | `buyer_id`, `supplier_id`, `product_id` (opcional), `last_message_at` |
| `messages` | `conversation_id`, `sender_id`, `body`, `read_at` |
| `favorites` | `user_id`, `product_id`, `price_at_save_cents` (para avisar bajadas de precio) |
| `notifications` | `user_id`, `kind`, `payload`, `read_at`, `sent_email_at`, `sent_whatsapp_at` |

### Vistas calculadas (datos reales, nunca capturados a mano)
- `supplier_stats`: calificación bayesiana, número de reseñas, pedidos, pedidos completados y su porcentaje, tiempo mediano de primera respuesta en el chat, antigüedad.
- `product_stats`: número de pedidos, descuento por volumen máximo (para ordenar).

## Reglas de seguridad por fila (resumen)

| Quién | Puede |
|---|---|
| Público (sin sesión) | Leer productos `activo` de proveedores `verificado`, sus fotos públicas, escalones, reseñas no ocultas y perfil público del proveedor |
| Comprador | Leer y editar su perfil, direcciones, carrito, favoritos y listas; leer sus pedidos; crear reseña **solo** si tiene un pedido `completado` con ese proveedor y sin reseña previa; abrir disputa solo de sus pedidos |
| Proveedor | Todo lo anterior + leer y editar su tienda y sus productos; leer pedidos donde `supplier_id` es suyo; cambiar estado solo en transiciones permitidas; subir facturas a sus pedidos; leer sus propios documentos (nunca los de otros) |
| Administrador | Leer todo; aprobar o rechazar proveedores; resolver disputas; ocultar reseñas; editar `platform_settings` |
| Servidor (webhooks) | Solo con la llave de servicio, nunca expuesta al navegador: cambia pagos y envíos al recibir webhooks firmados |

Los buckets de almacenamiento: `product-images` (público), `supplier-documents`, `invoices` y `review-photos` antes de moderar (privados, acceso con URLs firmadas de corta duración).
