# Bitácora de decisiones — Provana

Una entrada por decisión importante. Formato: qué propuso Claude, qué decidió Monse (con sus palabras), por qué, cómo se probó y qué falló. Nada se marca como "decidido" sin una respuesta tuya registrada.

Marcas: **[SANDBOX]** = modo de pruebas, sin dinero ni envíos reales · **[REAL]** = producción.

---

## 2026-11-09 · Entrada 0 · Punto de partida

**Contexto.** El repositorio `Monsxa/Provana` contiene solo `index.html`: una landing estática (sin JavaScript ni backend) con estilo verde `#1D6F52`, ámbar `#D98A2B`, tipografías Fraunces, IBM Plex Sans e IBM Plex Mono, modo oscuro y tono cercano en español de México. Todos los datos (proveedores, reseñas, "1,280+ proveedores", "4.7 ★") son ficticios y el pie lo declara.

**Qué pidió Monse (resumen).** Construir Provana completa y funcionando de punta a punta, no prototipo, partiendo del estilo de la landing, usando las skills taste, impeccable y las de Emil Kowalski, y dejando evidencia del proceso para el curso.

**Qué propuso Claude.**
- Stack: Next.js + Supabase + Vercel + Stripe Connect + Envía.com + Resend (detalle y desventajas en el README).
- Estados de pedido adicionales a los pedidos: `pendiente_pago`, `en_disputa` y `reembolsado`.
- Calificación con promedio bayesiano (peso de 10 reseñas).
- Dinero siempre en centavos enteros.
- Wireframes de 11 pantallas (`docs/wireframes.md`) y esquema de datos (`docs/esquema-datos.md`).

**Qué decidió Monse.** _Pendiente: bloque único de preguntas enviado el 2026-11-09._

**Cómo se probó.** Nada todavía: es documentación.

**Qué falló.**
1. `npx impeccable install` falló al inicio. **Causa raíz:** el entorno en la nube bloqueaba el dominio `impeccable.style`. **Arreglo:** con permiso de Monse se agregó ese dominio a la lista de sitios permitidos y el instalador oficial terminó bien.
2. Al conectar el repositorio, la herramienta avisó que `git push` podría ser rechazado por falta de permisos. **Prueba:** se hizo `git push -u origin docs/planeacion` y la rama se subió bien, así que el aviso no aplicó. Se deja registrado por si falla más adelante.

**Herramientas usadas en esta fase.**
- `gh`/`git`: leer el repositorio.
- Skills instaladas: `design-taste-frontend` (taste), `impeccable` y 18 skills de Emil Kowalski (animación y diseño). Se aplicarán al construir la interfaz.

---

## 2026-11-09 · Entrada 1 · Cambio de enfoque: pagos simulados y función estrella

**Qué decidió Monse (sus palabras).**
- Pagos: *"NO conectes Stripe, Mercado Pago ni ningún proveedor real. Todo el flujo de pago es una simulación que se ve profesional y real (pantalla de pago, métodos, confirmación, comprobante, estado 'pago retenido' y liberación al confirmar la entrega), pero sin cobrar nada. Deja una capa de pagos intercambiable por si algún día se conecta uno real. Muestra siempre un aviso visible de 'Modo demostración: no uses tarjetas reales' y no guardes ni pidas datos de tarjetas reales; usa datos de prueba."*
- Reglas de dinero: *"Comisión, liberación a los 5 días, cancelaciones y disputas: mantén las reglas que te di, pero todo simulado y configurable desde el panel de administración."*
- Prioridad: *"Tu esfuerzo principal debe ir a UNA función estrella que funcione muy bien de verdad: el 'Surtido inteligente'."*
- Proceso: *"Antes de programarla, propón el algoritmo en palabras sencillas y muéstramelo para que yo lo apruebe."*
- IA: *"Si quieres que entienda texto libre con IA, dime qué servicio, cuánto cuesta y qué llave necesito. Primero hazlo funcionar con productos y cantidades elegidos por el usuario."*
- El resto de funciones: *"debe funcionar bien, pero con menos prioridad que la función estrella."*

**Consecuencias.**
- Stripe sale del stack. Se crea una interfaz `PaymentProvider` con una implementación `SimulatedProvider` **[SIMULADO]**. Un proveedor real se conectaría implementando la misma interfaz.
- Ya no hacen falta cuentas de Stripe ni el aviso legal de retención de fondos mientras sea simulado.

**Aclaración registrada.** Monse pidió mantener "las reglas que te di" de comisión, cancelaciones y disputas, pero esas preguntas (4, 7, 8 y 9 del bloque inicial) no se habían contestado todavía. Los 5 días de liberación coinciden con la propuesta de Claude. Se pregunta de nuevo antes de fijar valores.

**Qué propuso Claude.** Algoritmo del Surtido inteligente en `docs/surtido-inteligente.md`, con un ejemplo trabajado (total esperado $5,778.00, ahorro $371.00 frente a "todo con uno") y 12 criterios de aceptación.

**Cómo se probó.** El ejemplo se calculó con un script de fuerza bruta que prueba las 12 combinaciones posibles (2 × 2 × 3 opciones por renglón). Ese script se convertirá en la prueba de referencia.

**Estado.** Esperando aprobación del algoritmo.

---

## 2026-11-09 · Entrada 2 · Aprobación del algoritmo y reglas de negocio

**Qué decidió Monse (sus palabras).**
1. *"Apruebo el algoritmo. Antes de programarlo, muéstrame la fórmula exacta del 'costo de riesgo' con un ejemplo numérico. Dejo la confianza mínima en 60 y los porcentajes (0 / 10 / 25) como valores iniciales configurables."*
2. *"Sí a los 'tipos de producto'. El proveedor elige el tipo de una lista al publicar, y el administrador puede crear tipos nuevos."*
3. *"Comisión de 8% solo sobre productos, configurable desde el panel de administración; cancelación gratis hasta antes de 'preparando'; disputas decididas solo por el administrador, con reembolsos parciales permitidos."*
4. *"Envíos: simúlalos con la tabla de tarifas, sin Envía.com ni cotizaciones reales, para que las pruebas den totales exactos."*
5. *"IA: la agregamos después de que el algoritmo esté probado. Empieza con Haiku 5.5, pruébalo con mis ejemplos y solo cambia a Opus 5.5 si falla. La IA solo extrae los renglones; el cálculo lo hace el algoritmo."*
- Dominio: *"todavía no tengo. Usa la URL gratuita que asigne Vercel. Para los correos usa el remitente de pruebas del servicio de correo, o simúlalos dentro de la app (por ejemplo, una bandeja de avisos). Deja el dominio como variable de configuración."*
- IVA: *"el proveedor indica si cobra IVA; precios capturados sin IVA y mostrados como '+ IVA (16%)'."*
- Categorías: *"las de la landing, con 'Empaque sostenible' como subcategoría de 'Empaque', administrables desde el panel."*
- Permisos sanitarios: *"basta con que el proveedor declare que los tiene; si sube el documento, recibe una insignia extra."*
- Administrador: correo proporcionado por Monse. **Se guarda en la variable de entorno `ADMIN_EMAILS`, no en el código**, porque el repositorio es público.
- Datos de prueba: *"sí, los proveedores ficticios marcados como 'datos de ejemplo'."*
- Prioridad: *"primero la función estrella (Surtido inteligente) funcionando y probada, luego cuentas, catálogo y carrito, después pedidos con pagos simulados y reseñas, y al final el panel de proveedor y los detalles. Cuando termines cada bloque, dime qué quedó listo para que yo lo vea en la URL de Vercel antes de seguir."*

**Consecuencias.** Envía.com y Resend con dominio propio salen del stack; los envíos usan una tabla de tarifas **[SIMULADO]** y los correos se muestran en una bandeja de avisos dentro de la app **[SIMULADO]**, con un adaptador de correo listo para conectar después. El orden de trabajo cambia: el Surtido inteligente va primero.

**Qué propuso Claude.** Fórmula exacta del costo de riesgo y de la confianza (0–100) con ejemplo numérico, en `docs/surtido-inteligente.md`.

**Pendiente.** Que Monse apruebe la fórmula y decida si la comparación del surtido se hace con o sin IVA.

---

## 2026-11-09 · Entrada 3 · Bloque ★: Surtido inteligente construido y probado

**Qué decidió Monse (sus palabras).** *"si, empieza a hacer la pagina"*, en respuesta a dos preguntas: aprobar la fórmula del costo de riesgo y elegir si el surtido compara con o sin IVA.

**Interpretación de Claude (marcada como tal).** La respuesta se tomó como aprobación de la fórmula y de la opción recomendada: **comparar con IVA**. Queda configurable (`compararConIva` en `src/lib/surtido/tipos.ts`) por si Monse quiso decir otra cosa.

**Qué se hizo.**
- Proyecto Next.js 15 + TypeScript. La landing original se movió a `legacy/` y su estilo (tokens de color, Fraunces, IBM Plex, modo oscuro) pasó a `src/app/globals.css`.
- Motor del surtido en `src/lib/surtido/` (precios por escalón, envío simulado, confianza, costo de riesgo, búsqueda exacta y aproximada, referencia "todo con uno", explicaciones).
- Datos de ejemplo en `src/data/*.json`: 32 estados, 6 categorías, 14 tipos de producto, 12 proveedores ficticios y 32 productos, todos marcados como datos de ejemplo y validados con Zod. JSON Schema exportado en `esquemas/`.
- `POST /api/surtido` con validación en servidor y límite de 30 solicitudes por minuto por IP.
- Página `/surtido` y portada nueva. La portada muestra un cálculo real del motor, no una maqueta.

**Cómo se probó.**
- 52 pruebas unitarias (Vitest) cubren los criterios 1 a 11 de `docs/surtido-inteligente.md`: el ejemplo trabajado da exactamente $5,778.00 sin IVA y $6,702.48 con IVA, con referencia de $7,132.84 y ahorro de $430.36 (6.0 %).
- **Prueba de que las pruebas detectan errores:** se rompió el costo de riesgo a propósito y fallaron 4 pruebas; se quitó el IVA del envío y fallaron 8. Después se restauró el código.
- **Calidad de la búsqueda:** en 150 casos aleatorios contra la búsqueda exhaustiva, el método por subconjuntos encontró el óptimo en 150/150 y la heurística en 149/150, con brecha máxima de 0.93 %.
- **Velocidad:** 12 proveedores × 10 productos en 48 ms; 40 proveedores × 15 productos en 82 ms (límite: 1 s).
- 12 pruebas en navegador (Playwright) en celular (Pixel 7) y escritorio (1440 px): validación, cálculo, cambio de proveedor, ejemplo con ahorro, motivos sin proveedor y rechazo de datos inválidos.
- Detector de diseño de impeccable sin hallazgos. Capturas en `docs/capturas/`.

**Qué falló y causa raíz.**
1. *Instalar Vitest 5 chocó con `@types/node` 20.* Causa: Vitest 5 pide `@types/node` ≥ 22.12. Se subió a `@types/node` 22.
2. *Las primeras pruebas aleatorias daban 150/150 en ambos métodos.* Causa: los casos eran demasiado fáciles (envío barato frente al precio). Se agregaron casos con envío caro y apareció la primera diferencia real (149/150). Se dejó la prueba más exigente.
3. *Prueba en navegador: el botón "Quitar" no tenía nombre accesible.* Causa: el nombre estaba en el ícono SVG y no en el botón. Se movió `aria-label` al botón.
4. *Seis pruebas en navegador fallaron después de recompilar.* Causa: un servidor viejo seguía en el puerto 3100 sirviendo la compilación anterior, así que el JavaScript de la página no correspondía. No era un error de la app. Se detuvo el servidor viejo y pasaron las 12.
5. *Las skills de diseño no se cargaban como skill.* Causa: se instalaron en `/home/user` y el proyecto vive en `/home/user/provana`. Se leyeron sus instrucciones directamente.

**Decisiones de diseño (skills).**
- **Impeccable:** se heredó el mundo visual de la landing. Su entrevista previa se omitió porque el brief de Monse ya respondía esas preguntas y pidió no interrumpir. Se quitaron las etiquetas pequeñas sobre los títulos.
- **Taste:** se quitaron cifras inventadas ("1,280+ proveedores") y testimonios ficticios; las cifras ahora salen de los datos.
- **Emil Kowalski:** curvas ease-out propias, botones que responden al presionar, entradas ≤ 300 ms y nada animado en acciones repetitivas.

**Observaciones para Monse.**
- Con la fórmula aprobada, un proveedor **sin historial** obtiene confianza 87/100 (calificación igual al promedio, 90 % de cumplimiento supuesto, respuesta sin datos = 0.5). Eso es más que un proveedor con historial regular. Si no te parece, se puede bajar la previa para nuevos.
- En México muchos alimentos tienen IVA de 0 %. Por ahora el IVA se define por proveedor, como pediste; se puede refinar por producto.

**Modo.** Todo **[SIMULADO]**: envíos con tabla de tarifas, sin pagos. Datos de ejemplo.
