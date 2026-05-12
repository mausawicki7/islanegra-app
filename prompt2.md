PROMPT TURNO 2 — Cocina
Turno 2 de 4 del proyecto ISLANEGRA.

Ya está implementado el setup y la interfaz cliente. Ahora implementá la interfaz de COCINA.

Ruta: /cocina

Acceso:
- PIN simple por ahora (variable de entorno VITE_KITCHEN_PIN).
- Modal de PIN al entrar, se guarda en sessionStorage.

Funcionalidad:
- Lista de pedidos en estado new, preparing y ready (delivered y cancelled no se muestran acá).
- Ordenados por antigüedad: el más viejo arriba.
- Supabase Realtime: suscribirse a cambios en la tabla orders y refrescar automáticamente.
- Sonido al entrar pedido nuevo (audio corto, no invasivo, configurable).
- Mostrar tiempo transcurrido desde created_at ("hace 3 min").

Card de pedido en cocina:
- Número de pedido grande.
- Mesa muy visible.
- Items con cantidad.
- Nota del cliente si existe.
- Método de pago.
- Tiempo transcurrido.
- Botón grande para avanzar estado: Nuevo → En preparación → Listo → Entregado.
- Botón secundario para cancelar (con confirmación).

Visual:
- Pensado para ver desde lejos (monitor o tablet en cocina).
- Estados diferenciados por color de borde o badge.
- Mismo lenguaje visual oscuro que el cliente.

Cuando un pedido pasa a "delivered" → desaparece de la pantalla de cocina (queda registrado en BD para el dashboard).

Pasalo por qa-reviewer al terminar.

NO TOCAR todavía: /negocio, liquidaciones, auth completo.