import type { Burger } from '@/types/burger';

export const burgers: Burger[] = [
  {
    id: 'islanegra-classic',
    name: 'ISLANEGRA Classic',
    shortDescription: 'La base. Smashed pura, queso, cebolla caramelizada.',
    ingredients: [
      'Doble smashed de carne',
      'Cheddar fundido',
      'Cebolla caramelizada',
      'Salsa de la casa',
      'Pan brioche',
    ],
    price: 8500,
    image: null,
    detailDescription:
      'Nuestra firma. Dos medallones de carne aplastados en plancha hasta crear corteza, cheddar fundido, cebolla caramelizada lenta y pan brioche tostado en manteca. Sin desvíos.',
    type: 'burger',
  },
  {
    id: 'doble-negra',
    name: 'Doble Negra',
    shortDescription: 'Doble carne, doble queso, pan negro de carbón.',
    ingredients: [
      'Doble smashed de carne',
      'Doble cheddar',
      'Cebolla blanca',
      'Mostaza ahumada',
      'Pan brioche negro de carbón',
    ],
    price: 9800,
    image: null,
    detailDescription:
      'Versión intensificada. Más carne, más queso, pan brioche negro teñido con carbón vegetal. Para los que pidieron una vez la Classic y volvieron por más.',
    type: 'burger',
  },
  {
    id: 'la-fundida',
    name: 'La Fundida',
    shortDescription: 'Cheddar fundido por todos lados. Sin disculpas.',
    ingredients: [
      'Smashed de carne',
      'Triple cheddar',
      'Salsa de queso',
      'Panceta crocante',
      'Pan brioche',
    ],
    price: 9200,
    image: null,
    detailDescription:
      'Una declaración. Tres capas de cheddar, salsa de queso que se escapa por los lados y panceta crocante. No es una hamburguesa con queso. Es queso con hamburguesa.',
    type: 'burger',
  },
  {
    id: 'smoke-house',
    name: 'Smoke House',
    shortDescription: 'Ahumada, BBQ artesanal y panceta.',
    ingredients: [
      'Smashed de carne',
      'Cheddar ahumado',
      'BBQ artesanal',
      'Panceta',
      'Cebolla morada',
      'Pan brioche',
    ],
    price: 9500,
    image: null,
    detailDescription:
      'Carne ahumada en frío antes de la plancha, salsa BBQ hecha en casa con bourbon reducido y panceta crocante. Profundidad, no dulzura.',
    type: 'burger',
  },
  {
    id: 'crispy-onion',
    name: 'Crispy Onion',
    shortDescription: 'Aros de cebolla crocantes y alioli ahumado.',
    ingredients: [
      'Smashed de carne',
      'Cheddar',
      'Aros de cebolla crocantes',
      'Alioli ahumado',
      'Rúcula',
      'Pan brioche',
    ],
    price: 9100,
    image: null,
    detailDescription:
      'Textura primero. Aros de cebolla con rebozado fino y crujiente, alioli ahumado y rúcula fresca para cortar la grasa. Equilibrio sin perder carácter.',
    type: 'burger',
  },
  {
    id: 'la-salvaje',
    name: 'La Salvaje',
    shortDescription: 'Picante real. Jalapeños, chipotle y queso azul.',
    ingredients: [
      'Smashed de carne',
      'Queso azul',
      'Jalapeños frescos',
      'Mayo chipotle',
      'Cebolla morada',
      'Pan brioche',
    ],
    price: 9700,
    image: null,
    detailDescription:
      'Para los que saben. Jalapeños frescos, mayonesa de chipotle, queso azul que se planta firme. Picante de verdad, no de etiqueta.',
    type: 'burger',
  },
];

export function getBurgerById(id: string): Burger | undefined {
  return burgers.find((b) => b.id === id);
}
