Tareas rápidas antes del Turno 2:

1. IMÁGENES DE BURGERS

Puse las 6 imágenes en la raíz del proyecto. Necesito que:

- Las muevas a /public/burgers/
- Verifiques los nombres de archivo y los renombres si hace falta para que coincidan con los IDs de src/data/burgers.ts:
  - islanegra-classic.<ext>
  - doble-negra.<ext>
  - la-fundida.<ext>
  - smoke-house.<ext>
  - crispy-onion.<ext>
  - la-salvaje.<ext>
- Actualices el campo `image` de cada burger en src/data/burgers.ts apuntando a /burgers/<id>.<ext>
- Si son PNG/JPG grandes, convertilas a WebP optimizadas (~800x800, calidad 85). Si ya son livianas (<200KB), dejalas como están.
- Confirmes que BurgerImage renderiza la <img/> real y ya no el placeholder tipográfico.

2. DOBLE NEGRA — actualización de copy

Ya cambié el detalle del pan en src/data/burgers.ts. Verificá que quedó coherente:
- Pan negro con semillas de sésamo aparece en `ingredients`
- shortDescription menciona el pan negro como argumento de venta
- detailDescription es consistente

Si algo quedó desalineado, ajustalo.

3. VERIFICACIÓN

Al terminar:
- npm run build (debe pasar limpio)
- Levantá dev server y confirmá visualmente que las 6 imágenes cargan en /menu
- Confirmá que /burger/doble-negra muestra bien el ingrediente del pan negro

Reportame qué encontraste (nombres originales de archivos, conversiones hechas, cualquier ajuste de copy).