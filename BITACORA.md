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
