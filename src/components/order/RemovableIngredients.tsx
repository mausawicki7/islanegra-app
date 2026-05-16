import type { ProductIngredient } from '@/types/customization';

interface RemovableIngredientsProps {
  ingredients: ProductIngredient[];
  removed: Record<string, boolean>;
  onToggle: (ingredientId: string) => void;
}

export function RemovableIngredients({
  ingredients,
  removed,
  onToggle,
}: RemovableIngredientsProps) {
  const removable = ingredients.filter((i) => i.removable);
  if (removable.length === 0) return null;
  return (
    <section className="mt-7">
      <p className="mb-3 text-xs uppercase tracking-[0.24em] text-white/45">
        Sin esto
      </p>
      <div className="flex flex-wrap gap-2">
        {removable.map((ingredient) => {
          const isRemoved = !!removed[ingredient.id];
          return (
            <button
              key={ingredient.id}
              type="button"
              onClick={() => onToggle(ingredient.id)}
              aria-pressed={isRemoved}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                isRemoved
                  ? 'border-red-400/40 bg-red-400/10 text-red-100 line-through'
                  : 'border-white/15 bg-white/[0.04] text-white/85 hover:border-white/30'
              }`}
            >
              {ingredient.emoji && <span aria-hidden>{ingredient.emoji}</span>}
              <span>{ingredient.name}</span>
              <span
                aria-hidden
                className={`ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                  isRemoved ? 'bg-red-400/30 text-red-100' : 'bg-white/10 text-white/70'
                }`}
              >
                ✕
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
