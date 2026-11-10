# PROMPT_LOG — trabajo visual y de movimiento

Bitácora del pulido visual pedido el 2026-11-09. Las decisiones de negocio siguen en [`BITACORA.md`](BITACORA.md). Aquí se registra qué se propuso, qué se aceptó o rechazó, por qué y cómo se verificó, en el orden en que pasó.

---

## 1. El código de partida no existe

**Pedido.** Trabajar sobre una SPA vanilla (`parts/`, `build.sh`, `03_data.js`, `test/run.js`) con catálogo, carrito, pago simulado, pedidos, reseñas, comparador y panel de proveedor.

**Qué encontró Claude.** Ese código no está en `Monsxa/Provana` (ramas `main`, `docs/planeacion`, `feature/surtido-inteligente`), en `Monsxa/Provana-` (vacío) ni en el contenedor (`find` de `build.sh`, `03_data.js` y `04_core.js`: sin resultados). Lo que existe es la app Next.js de la rama `feature/surtido-inteligente`: portada y Surtido inteligente.

**Pregunta a Monse.** ¿Usar la app Next.js y construir lo que falta, esperar la SPA o solo pulir lo que existe?

**Decisión de Monse.** "Solo pulir lo que ya existe". Para la bitácora: "Ambas" (BITACORA.md para negocio y PROMPT_LOG.md para esto).

**Consecuencia.** Se pule la portada y el Surtido. Lo que depende de pantallas inexistentes (carrito en cajón, checkout con código postal, línea de tiempo del pedido, comparador flotante, vista rápida, ficha de producto) **no se simula**; queda en "Pendiente" al final. Dos piezas pequeñas sí se agregan porque las piden la búsqueda y el anillo de confianza: la **ficha de proveedor** (`/proveedores/[id]`, solo lectura con datos existentes) y la **paleta ⌘K**.

---

## 2. Paleta verde con contraste verificado por prueba

**Propuesta.** Escala `--verde-50…900` (+950 para fondos oscuros) derivada de #1D6F52; neutros con tinte verde (`--neutro-*`); ámbar solo para el ahorro, precios destacados y alertas. Los tokens semánticos (`--ink`, `--accent`, `--panel`…) apuntan a la escala, así el CSS existente no se reescribe.

**Decisión de Claude.** No confiar en "se ve bien": se escribió `src/lib/__tests__/contraste.test.ts`, que lee `globals.css`, resuelve los `var()` y mide 17 pares texto/fondo en claro y oscuro (34 en total) contra 4.5:1. También verifica que el ámbar puro **falla** como texto sobre fondo claro: así se comprueba que la función detecta fallas y queda documentado que el ámbar es solo acento.

**Verificado.** 35/35 pruebas en verde al primer intento. El panel oscuro dejó de usar `--ink` como fondo (con eso, en modo oscuro el panel era casi blanco) y pasó a `--panel`.

## 3. Reglas de movimiento y una contradicción entre skills

- **Entrada escalonada al hacer scroll.** taste dice "Never: a card that fades in on scroll"; el pedido de Monse dice "Entrada escalonada de tarjetas al hacer scroll (40–60 ms)". **Gana el pedido** (impeccable: "The brief wins"). Se acotó: 8 px, 250 ms, 50 ms de desfase, una sola vez, solo para lo que está **debajo** del pliegue (lo visible al cargar nunca se oculta) y nada se oculta sin JavaScript o con movimiento reducido.
- **Anillo de confianza.** La regla es animar solo transform y opacity; el anillo usa `stroke-dashoffset`. Se aceptó la excepción por ser un SVG de 40–104 px; las barras del desglose sí usan `scaleX`.
- **Cifras que cuentan.** Se animan desde el valor anterior, no desde cero, para que al cambiar la prioridad el total "viaje" al nuevo valor. Si la cifra ya está en pantalla al cargar, **no** cuenta desde cero (sería un parpadeo).
- **Movimiento reducido.** La regla global que mataba todas las transiciones se cambió: ahora nada se desplaza ni escala, pero lo marcado con `data-fundido` conserva un desvanecido corto, como pidió Monse ("solo hay desvanecidos").
- **⌘K.** Las flechas mueven la selección **sin** transición (acción frecuente de teclado); abrir dura 200 ms y cerrar 150 ms (la salida es más rápida que la entrada).

## 4. Video de portada: primer intento en blanco

**Qué pasó.** El primer video salió completamente vacío (un fondo liso). **Causa raíz:** el patrón se dibujaba con `mask: url(file://…)` y Chromium no aplica máscaras de archivos locales por política de origen. **Arreglo:** el patrón se dibuja como `<pattern>` SVG en línea.

**Segundo ajuste.** El patrón quedó demasiado denso para ir detrás de texto. Se espació (mosaico de 160×80, trazo de 3 px, 55 % de opacidad) y se hizo más lento: 20 px/s en un bucle exacto de 8 s (el desplazamiento es justo un mosaico, así que no se nota el corte).

**Resultado.** `portada.mp4` 148 KB, `portada.webm` 57 KB y poster de 21 KB: 0.2 MB en total, contra un presupuesto de 2 MB. En modo oscuro se invierte con `filter` y baja a 35 % de opacidad, en lugar de tener un segundo video.

**Decisión.** Los clips de producto y proveedor no existen; sus posters ya no llevan un botón de "play" dibujado (sería un control falso) y muestran una nota de "Modo demostración".

## 5. Lo que sí se agregó fuera del pulido

- **Ficha de proveedor** `/proveedores/[id]`. Hacía falta para la búsqueda (elegir un proveedor tiene que llevar a algún lado), para el anillo con desglose completo y para el espacio de video del taller. Es solo lectura y usa los datos existentes.
- **Transición compartida.** No hay ficha de producto, así que la View Transition se aplicó del avatar de la tarjeta de proveedor al avatar de su ficha. Si el navegador no la soporta o hay movimiento reducido, se navega de forma normal.

## 6. Verificación y estado al cierre de esta sesión

- **Pruebas en navegador (Playwright):** 52 pasan y 2 se omiten a propósito (solo aplican a celular o a escritorio). Cubren búsqueda ⌘K, ficha de proveedor, popover de confianza, video diferido (no se descarga antes de cargar la página, con ahorro de datos ni con movimiento reducido; se pausa fuera de pantalla), barra inferior con áreas ≥ 44 px y PWA.
- **axe:** sin violaciones críticas ni serias en portada, surtido con resultado, ficha de proveedor y búsqueda, en modo claro y oscuro. Encontró un problema real: la tabla de envíos se desplazaba de lado en celular sin poder enfocarse con teclado. Se corrigió con `tabIndex` y una etiqueta. También marcó contraste en tarjetas que aún tenían opacidad 0 por la entrada escalonada; la prueba ahora recorre la página antes de analizar, como haría una persona.
- **Fallas que resultaron ser de la prueba:** el atajo Ctrl+K se presionaba antes de que la página terminara de cargar. Se espera a `networkidle`.
- **Lighthouse (celular):** Surtido 99, ficha de proveedor 95, portada **89**. Accesibilidad, buenas prácticas y SEO dieron 100 en las tres. El LCP de la portada era el poster del video de fondo (el navegador lo descubre tarde); se agregó una precarga con prioridad alta. **La nueva medición no se completó:** se detuvo dos veces y no hay número confirmado. Está pendiente volver a medir.
- **Contraste:** 35 pruebas automáticas en verde.
