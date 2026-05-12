PROMPT TURNO 3 — Dashboard de Negocio (sin liquidaciones todavía)
Turno 3 de 4 del proyecto ISLANEGRA.

Implementá la interfaz NEGOCIO con KPIs y analytics. Las liquidaciones a socios van en el turno 4.

Ruta: /negocio

Auth:
- Supabase Auth con email/password.
- Tabla users con campo role: "owner" | "partner" | "kitchen".
- Crear 3 usuarios iniciales vía SQL seed:
  - juan@islanegra.com → role: owner
  - mauricio@islanegra.com → role: partner
  - sebastian@islanegra.com → role: partner
- Las 3 personas tienen acceso completo de lectura al dashboard.

Filtros de período (selector arriba):
- Hoy / Ayer / Últimos 7 días / Este mes / Mes pasado / Rango custom.
- Todos los KPIs y gráficos respetan el filtro.

KPIs principales (cards grandes arriba):
- Ingresos cobrados (suma de total de pedidos en estado "delivered")
- Pedidos cobrados (count)
- Ticket promedio
- Burger más vendida

Gráficos (usar Recharts):
- Ingresos por día (barras)
- Top burgers vendidas (barras horizontales)
- Distribución método de pago (dona: efectivo vs transferencia)
- Heatmap de horarios pico (día de semana × hora del día)
- Tiempo promedio preparación (new → ready) en minutos
- Tiempo promedio entrega (ready → delivered) en minutos

Tabla de pedidos:
- Histórico con filtros (fecha, mesa, estado, pago).
- Paginación.
- Botón "Exportar CSV" del período seleccionado.

Vista del dashboard:
- Misma estética oscura premium.
- Layout cómodo en desktop, también funcional en tablet.
- Mobile puede ser más compacto pero usable.

IMPORTANTE: solo se cuentan en métricas de ingresos los pedidos en estado "delivered". Mostrar siempre la aclaración "Solo pedidos cobrados".

Pasalo por qa-reviewer.