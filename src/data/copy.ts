import { COCKTAIL_PREMIO_NOMBRE } from '@/config/rewards';
import type { OrderStatus } from '@/types/order';

export const TRACKING_STORAGE_KEY = 'islanegra:last_order';

export const TRACKING_STEPS = [
  { status: 'new', label: 'Recibido' },
  { status: 'preparing', label: 'Preparándose' },
  { status: 'ready', label: 'Lista' },
  { status: 'delivered', label: 'Entregado' },
] as const;

export const STATUS_PRIMARY_COPY: Record<OrderStatus, string> = {
  new: 'Pedido recibido. Ya avisamos a la cocina.',
  preparing: 'Smasheando tu hamburguesa ahora mismo.',
  ready: '¡Tu hamburguesa está lista!',
  delivered: 'Que la disfrutes.',
  cancelled: 'Pedido cancelado.',
};

export const STATUS_SECONDARY_COPY: Record<OrderStatus, string[]> = {
  new: [
    'La orden ya está en marcha.',
    'El equipo ya tiene tu pedido en pantalla.',
    'Mientras tanto, podés ir calentando dedos.',
  ],
  preparing: [
    'El plancha está al rojo vivo.',
    'Cheddar derretido en T menos un toque.',
    'El pan negro está en su mejor momento.',
    'Cebolla caramelizándose como Dios manda.',
    'La carne está cantando en la plancha.',
    'Más sabor del que tu paladar está listo a manejar.',
    'Cocinada con la misma intensidad que un set de la electrónica del jueves.',
    'Si esto fuera una banda, tendría disco de oro.',
    'Pickles fríos, carne caliente, balance perfecto.',
    'Cada smash es un acto de amor.',
    'El secreto está en el toque final.',
    'La mejor hamburguesa de Cipolletti se está armando para vos.',
  ],
  ready: [
    'Esperá a la moza, que sale con gloria.',
    'No invadas cocina. La felicidad camina hacia tu mesa.',
  ],
  delivered: [
    'Gracias por pasar por ISLANEGRA.',
    'Cuando pinte otra, el menú sigue abierto.',
  ],
  cancelled: ['Si fue un error, avisale a la moza.'],
};

export const GAME_COPY = {
  invitation: `¿Aburrido? Jugá Flappy Burger. Si rompés el récord de la semana, te llevás un ${COCKTAIL_PREMIO_NOMBRE} de regalo.`,
  gameOverBehind: (points: number) =>
    `Game over. Quedaste a ${points} ${points === 1 ? 'punto' : 'puntos'} del récord. ¿Otra?`,
  gameOverWinning: `Rompiste el récord. Te ganaste un ${COCKTAIL_PREMIO_NOMBRE}.`,
  alreadyRedeemed:
    'Buen score, pero tu mesa ya se llevó el cocktail esta noche. Volvé mañana.',
  redeemInstructions: `Mostrale este código a tu moza para canjear tu ${COCKTAIL_PREMIO_NOMBRE}.`,
};
