-- ISLANEGRA — products seed
-- products is the server-side source of truth for prices.

insert into public.products (
  id,
  name,
  short_description,
  ingredients,
  price,
  image_url,
  detail_description,
  type,
  active
) values
  (
    'islanegra-classic',
    'ISLANEGRA Classic',
    'La base. Smashed pura, queso, cebolla caramelizada.',
    array[
      'Doble smashed de carne',
      'Cheddar fundido',
      'Cebolla caramelizada',
      'Salsa de la casa',
      'Pan brioche'
    ],
    8500,
    '/burgers/islanegra-classic.webp',
    'Nuestra firma. Dos medallones de carne aplastados en plancha hasta crear corteza, cheddar fundido, cebolla caramelizada lenta y pan brioche tostado en manteca. Sin desvíos.',
    'burger',
    true
  ),
  (
    'doble-negra',
    'Doble Negra',
    'Doble carne, doble queso, pan negro con sésamo.',
    array[
      'Doble smashed de carne',
      'Doble cheddar',
      'Cebolla blanca',
      'Mostaza ahumada',
      'Pan negro con semillas de sésamo'
    ],
    9800,
    '/burgers/doble-negra.webp',
    'Versión intensificada. Más carne, más queso, pan negro teñido con carbón vegetal y terminado con semillas de sésamo tostadas. Para los que pidieron una vez la Classic y volvieron por más.',
    'burger',
    true
  ),
  (
    'la-fundida',
    'La Fundida',
    'Cheddar fundido por todos lados. Sin disculpas.',
    array[
      'Smashed de carne',
      'Triple cheddar',
      'Salsa de queso',
      'Panceta crocante',
      'Pan brioche'
    ],
    9200,
    '/burgers/la-fundida.webp',
    'Una declaración. Tres capas de cheddar, salsa de queso que se escapa por los lados y panceta crocante. No es una hamburguesa con queso. Es queso con hamburguesa.',
    'burger',
    true
  ),
  (
    'smoke-house',
    'Smoke House',
    'Ahumada, BBQ artesanal y panceta.',
    array[
      'Smashed de carne',
      'Cheddar ahumado',
      'BBQ artesanal',
      'Panceta',
      'Cebolla morada',
      'Pan brioche'
    ],
    9500,
    '/burgers/smoke-house.webp',
    'Carne ahumada en frío antes de la plancha, salsa BBQ hecha en casa con bourbon reducido y panceta crocante. Profundidad, no dulzura.',
    'burger',
    true
  ),
  (
    'crispy-onion',
    'Crispy Onion',
    'Aros de cebolla crocantes y alioli ahumado.',
    array[
      'Smashed de carne',
      'Cheddar',
      'Aros de cebolla crocantes',
      'Alioli ahumado',
      'Rúcula',
      'Pan brioche'
    ],
    9100,
    '/burgers/crispy-onion.webp',
    'Textura primero. Aros de cebolla con rebozado fino y crujiente, alioli ahumado y rúcula fresca para cortar la grasa. Equilibrio sin perder carácter.',
    'burger',
    true
  ),
  (
    'la-salvaje',
    'La Salvaje',
    'Picante real. Jalapeños, chipotle y queso azul.',
    array[
      'Smashed de carne',
      'Queso azul',
      'Jalapeños frescos',
      'Mayo chipotle',
      'Cebolla morada',
      'Pan brioche'
    ],
    9700,
    '/burgers/la-salvaje.webp',
    'Para los que saben. Jalapeños frescos, mayonesa de chipotle, queso azul que se planta firme. Picante de verdad, no de etiqueta.',
    'burger',
    true
  )
on conflict (id) do update
set
  price = excluded.price,
  active = excluded.active,
  updated_at = now();
