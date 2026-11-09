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
