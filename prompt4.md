PROMPT TURNO 4 — Liquidaciones a Socios
Turno 4 de 4 del proyecto ISLANEGRA.

Implementá el módulo de SOCIOS Y LIQUIDACIONES dentro de /negocio.

Contexto del negocio:
- Juan Manzur (dueño) absorbe todos los costos del local.
- Mauricio Sawicki recibe 5% sobre ingresos cobrados.
- Sebastián Gutierrez recibe 5% sobre ingresos cobrados.
- Liquidación mensual. Solo cuentan pedidos en estado "delivered".

Tablas (crear migración):
- partners (id, name, percentage, active, start_date, end_date)
- monthly_settlements (id, month, gross_revenue, status, confirmed_at, notes)
- partner_payouts (id, settlement_id, partner_id, partner_name, percentage, amount, paid, paid_at)

Seed inicial:
- Mauricio Sawicki — 5%
- Sebastián Gutierrez — 5%

Rutas:
- /negocio/liquidaciones → lista de liquidaciones mensuales
- /negocio/liquidaciones/:month → detalle de un mes
- /negocio/socios → gestión de socios (SOLO role: owner)

/negocio/liquidaciones:
- Listado de meses con: ingresos cobrados, total a pagar a socios, estado (draft / confirmed / paid).
- Mes en curso aparece como "draft" y se actualiza en vivo.
- Meses cerrados son inmutables.

Detalle de mes:
- Ingresos cobrados del mes.
- Cálculo por socio: porcentaje × ingresos = monto.
- Estado de pago por socio (checkbox que solo Juan puede tildar).
- Notas opcionales.
- Botón "Confirmar liquidación" (solo Juan) → snapshot inmutable.
- Botón "Exportar PDF" → versión imprimible para cada socio.

Cierre de mes:
- Automático: el día 1 del mes siguiente, el mes anterior pasa de "draft" a "confirmed" con snapshot.
- Manual: Juan puede confirmar antes si quiere.
- Una vez confirmado, los números no cambian aunque se editen pedidos viejos.

Permisos:
- Owner (Juan): ve todo, edita socios, confirma liquidaciones, marca pagos.
- Partner (Mauricio, Sebastián): ve todo en lectura, incluido lo que cobra el otro.

Sección "Tus liquidaciones" para partners:
- Vista resumida de lo que les corresponde.
- Histórico de pagos recibidos.
- Total acumulado en el año.

Transparencia total: cualquier socio puede auditar las ventas en cualquier momento desde el dashboard del turno 3.

Pasalo por qa-reviewer al terminar. Auditá especialmente el cálculo de liquidaciones y que el snapshot sea realmente inmutable.

Este es el último turno. Al final entregá un README con instrucciones para deploy y para configurar credenciales.