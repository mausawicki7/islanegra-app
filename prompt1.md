PROMPT TURNO 1 — Setup + Cliente
Necesito que construyas el proyecto ISLANEGRA, una webapp premium para un establecimiento de smashed burgers.

Antes de empezar, leé los agentes en .claude/agents/ y trabajá con esta división:
- product-architect
- design-engineer
- order-flow
- analytics-dashboard
- qa-reviewer

ESTE TURNO (Turno 1 de 4): Setup del proyecto + interfaz CLIENTE.

Stack:
- React + Vite + TypeScript
- Tailwind CSS
- React Router
- Supabase (cliente JS)
- Lucide React para íconos

Estructura:
src/
  components/
    layout/ (Header, AppShell)
    menu/ (MenuHero, BurgerGrid, BurgerCard, BurgerDetail)
    order/ (OrderSheet, QuantitySelector, PaymentSelector, OrderConfirmation)
  data/burgers.ts
  services/ordersService.ts, supabaseClient.ts
  types/burger.ts, order.ts
  pages/MenuPage.tsx, BurgerDetailPage.tsx
  utils/formatPrice.ts, getTableFromUrl.ts
  App.tsx, main.tsx

Tablas Supabase (crear SQL en /supabase/migrations/):
- orders, order_items, products (según especificación de order-flow agent)

Datos iniciales: 6 burgers en src/data/burgers.ts (después se migran a Supabase):
1. ISLANEGRA Classic
2. Doble Negra
3. La Fundida
4. Smoke House
5. Crispy Onion
6. La Salvaje

Cada burger: id, name, shortDescription, ingredients[], price, image, detailDescription.

Para imágenes, usá placeholders 1:1 oscuros por ahora (las reales las genero con ChatGPT Image después).

Rutas:
- / redirige a /menu
- /menu?mesa=N → menú principal
- /burger/:id → detalle

Estética (ver design-engineer agent):
- Fondo #050505, cards #111111, bordes sutiles.
- Tipografía Inter o Geist.
- Mucho aire visual.
- Card entera tappeable → /burger/:id.
- Botón "Pedila" sobre la card abre OrderSheet directamente sin navegar.

Flujo de pedido:
1. Tap en "Pedila" → OrderSheet (bottom sheet en mobile, modal en desktop).
2. Seleccionar cantidad.
3. Seleccionar método de pago (efectivo o transferencia).
4. Nota opcional.
5. Confirmar.
6. Pantalla de confirmación: número de pedido, mesa, estado "Recibido".

Mesa:
- Viene de ?mesa=N.
- Si no hay, mostrar input simple "Indicá tu mesa".

Sin login. Sin email. Sin teléfono. Sin pagos con tarjeta.

NO IMPLEMENTAR todavía: /cocina, /negocio, liquidaciones, gastos, auth.

Al terminar, pasale el resultado a qa-reviewer y corregí lo que marque.

Entregable: proyecto funcional con menú impecable, pedido completable y pedidos guardándose en Supabase.