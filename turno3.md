Turno 3 de 4 del proyecto ISLANEGRA.

Ya están funcionando: cliente (/menu) y cocina (/cocina). Ahora implementá la interfaz NEGOCIO con KPIs, analytics y métricas operativas. Las liquidaciones a socios van en el Turno 4, NO las implementes acá.

Antes de empezar, revisá los agentes en .claude/agents/:
- product-architect
- design-engineer
- analytics-dashboard
- qa-reviewer

═══════════════════════════════════════
RUTA Y AUTH
═══════════════════════════════════════

Ruta: /negocio (y subrutas)

Auth con Supabase Auth (email + password):
- Crear tabla `users` (puede ser una tabla `profiles` que extiende auth.users):
  - id uuid PK (= auth.users.id)
  - email text
  - role text ("owner" | "partner" | "kitchen")
  - partner_id uuid nullable (para vincular con tabla partners del Turno 4)
  - active boolean default true
  - created_at timestamp

- Seed inicial vía SQL (crear usuarios en auth.users + profiles):
  - juan@islanegra.com.ar → role: owner
  - mauricio@islanegra.com.ar → role: partner
  - sebastian@islanegra.com.ar → role: partner
  - Password inicial para los 3: "islanegra2026" (deben cambiarlo después)

- En /negocio si no hay sesión activa → mostrar pantalla de login.
- Login con email + password.
- Tras login exitoso, guardar sesión (Supabase la maneja en localStorage por default).
- Hook useAuth() que expone: user, profile, role, login(), logout(), loading.
- Si el rol no es owner ni partner → mostrar mensaje "No tenés acceso a esta sección" y forzar logout.
- Botón "Cerrar sesión" visible en el header de /negocio.

═══════════════════════════════════════
LAYOUT GENERAL DE /negocio
═══════════════════════════════════════

Estructura:
- Header con logo ISLANEGRA + nombre del usuario logueado + rol + botón logout
- Sidebar (o tabs en mobile) con:
  - Resumen (default)
  - Pedidos (tabla)
  - Análisis (gráficos)
- Selector de período arriba del contenido (global):
  - Hoy / Ayer / Últimos 7 días / Este mes / Mes pasado / Rango custom
  - Persistir selección en localStorage

Estética: misma que el resto. Fondo #050505, cards #111111, tipografía Inter, mucho aire visual. Para gráficos usar paleta monocromática (blancos, grises, un acento sutil). Sin colores saturados.

═══════════════════════════════════════
KPIs PRINCIPALES (vista Resumen)
═══════════════════════════════════════

4 cards grandes arriba, una al lado de la otra (grid 2x2 en mobile, 4 en desktop):

1. Ingresos cobrados
   - Suma de `total` de pedidos con status = 'delivered' en el período
   - Formato: $ con separador de miles
   - Comparación con período anterior: "+12% vs período anterior" (verde si sube, rojo si baja, gris si igual)

2. Pedidos cobrados
   - Count de pedidos con status = 'delivered' en el período
   - Misma comparación con período anterior

3. Ticket promedio
   - Ingresos cobrados / Pedidos cobrados
   - Misma comparación

4. Burger más vendida
   - Burger con más unidades vendidas en el período (sumando quantity de order_items donde product_type = 'burger' y el pedido está delivered)
   - Mostrar nombre + cantidad de unidades

IMPORTANTE: en todos lados que se muestren ingresos, agregar texto sutil "Solo pedidos cobrados (delivered)" para que quede claro.

═══════════════════════════════════════
GRÁFICOS (vista Análisis)
═══════════════════════════════════════

Usar Recharts (instalar: npm i recharts).

1. Ingresos por día (barras verticales)
   - Eje X: fechas del período
   - Eje Y: monto en $
   - Tooltip con valor exacto

2. Ranking de burgers vendidas (barras horizontales)
   - Top 6 (todas las burgers actuales)
   - Eje X: cantidad de unidades
   - Eje Y: nombre de burger
   - Ordenado de mayor a menor

3. Distribución de método de pago (donut chart)
   - Efectivo vs Transferencia
   - Mostrar % y monto absoluto de cada uno

4. Heatmap de horarios pico
   - Eje X: hora del día (0-23)
   - Eje Y: día de la semana (Lun-Dom)
   - Intensidad de color = cantidad de pedidos en esa franja
   - Usar gradient de gris oscuro a blanco

5. Tiempos operativos (2 cards o gráfico simple)
   - Tiempo promedio de preparación: AVG(ready_at - preparing_at) en minutos
   - Tiempo promedio de entrega total: AVG(delivered_at - created_at) en minutos
   - Solo considerar pedidos delivered en el período

═══════════════════════════════════════
TABLA DE PEDIDOS (vista Pedidos)
═══════════════════════════════════════

Tabla histórica de pedidos con:

Columnas:
- # Pedido
- Mesa
- Items (resumen: "2× Doble Negra, 1× Smoke House")
- Total
- Método de pago (badge)
- Estado (badge con color)
- Fecha y hora
- Tiempo de preparación (si delivered)

Filtros:
- Período (hereda el global)
- Estado: todos / new / preparing / ready / delivered / cancelled
- Método de pago: todos / efectivo / transferencia
- Mesa (input numérico opcional)
- Búsqueda por número de pedido

Paginación: 25 por página, navegación inferior.

Botón "Exportar CSV":
- Exporta los pedidos del filtro actual
- Columnas planas: orden_id, numero, mesa, fecha, total, metodo_pago, estado, items_descripcion, tiempo_preparacion_min
- Nombre del archivo: islanegra-pedidos-YYYY-MM-DD.csv

═══════════════════════════════════════
NUEVAS TABLAS Y MIGRACIÓN
═══════════════════════════════════════

Crear migración en supabase/migrations/20260513000000_business.sql:

1. Tabla profiles (vinculada con auth.users):
   - id uuid PK references auth.users
   - email text
   - role text ("owner" | "partner" | "kitchen")
   - partner_id uuid nullable
   - active boolean default true
   - created_at timestamp default now()

2. RLS policies para profiles:
   - Lectura: todos los usuarios autenticados pueden leer su propio profile
   - Update: solo el dueño puede modificar profiles
   - Insert: solo via service_role (seed manual)

3. Nuevas RLS policies para orders:
   - Usuarios autenticados con role owner o partner pueden hacer SELECT en TODOS los orders (histórico completo)
   - Reemplaza la policy actual de "solo últimas 6h para anon"
   - Anon sigue pudiendo crear pedidos (clientes) y leer los suyos por 6h
   - Cocina ya tiene su policy de update

4. Igual para order_items: owner/partner leen todo.

5. Seed:
   - 3 usuarios en auth.users (usando supabase admin SDK o instrucciones manuales si no se puede desde SQL)
   - 3 profiles asociados con roles correctos
   - Si no podés crear usuarios desde SQL directamente, dejá un script supabase/seed/create-users.ts con instrucciones para correr con service_role key

═══════════════════════════════════════
COMPONENTES NUEVOS
═══════════════════════════════════════

src/
  components/
    business/
      BusinessAuth.tsx           — pantalla de login
      BusinessLayout.tsx         — wrapper con header + sidebar
      PeriodSelector.tsx         — selector global de período
      KPICard.tsx                — card de KPI con comparación
      RevenueChart.tsx           — barras de ingresos por día
      BurgerRankingChart.tsx     — ranking horizontal
      PaymentMethodChart.tsx     — donut
      HoursHeatmap.tsx           — heatmap de horarios
      OperationalMetrics.tsx     — tiempos
      OrdersTable.tsx            — tabla con filtros
      OrderRow.tsx               — fila de la tabla
      ExportCSVButton.tsx        — botón exportar
  services/
    authService.ts               — wrapper de Supabase Auth
    businessService.ts           — queries para KPIs y agregaciones
  hooks/
    useAuth.ts
    useBusinessMetrics.ts
    usePeriod.ts
  pages/
    BusinessPage.tsx             — entry point /negocio
    BusinessSummaryPage.tsx      — /negocio (resumen)
    BusinessAnalyticsPage.tsx    — /negocio/analisis
    BusinessOrdersPage.tsx       — /negocio/pedidos
  utils/
    periodHelpers.ts             — calcular rangos de fecha
    csvExport.ts

═══════════════════════════════════════
REGLAS IMPORTANTES
═══════════════════════════════════════

1. Cálculos siempre en vivo desde la BD, sin cache. El mes en curso debe actualizarse al instante cuando entra un pedido nuevo.

2. Todos los ingresos y métricas deben filtrar por status = 'delivered'. Los pedidos en otros estados no cuentan como ventas (excepto en la vista Pedidos donde se muestra todo el histórico).

3. Mauricio y Sebastián tienen acceso COMPLETO de lectura. Pueden ver todo el dashboard, todas las tablas, todos los pedidos. Sin restricciones.

4. Diferencias entre owner y partner:
   - owner (Juan): puede modificar profiles, modificar pedidos manualmente si hace falta, accede a gestión de socios (Turno 4)
   - partner (Mauricio/Sebastián): solo lectura, no puede modificar nada

5. NO implementar todavía:
   - /negocio/socios (Turno 4)
   - /negocio/liquidaciones (Turno 4)
   - Tabla partners, monthly_settlements, partner_payouts (Turno 4)
   - Gestión de costos/gastos (no se hará nun