import { useNavigate } from 'react-router-dom';
import type { Burger } from '@/types/burger';
import { formatPrice } from '@/utils/formatPrice';
import { BurgerImage } from './BurgerImage';

interface BurgerCardProps {
  burger: Burger;
  onOrder: (burger: Burger) => void;
}

export function BurgerCard({ burger, onOrder }: BurgerCardProps) {
  const navigate = useNavigate();

  const goToDetail = () => {
    navigate(`/burger/${burger.id}${window.location.search}`);
  };

  return (
    <article
      onClick={goToDetail}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goToDetail();
        }
      }}
      role="button"
      tabIndex={0}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-800 transition hover:border-white/20 focus:border-white/30 focus:outline-none"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-ink-900">
        <BurgerImage burger={burger} />
      </div>

      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-balance font-semibold uppercase tracking-tightest text-white text-lg leading-tight">
            {burger.name}
          </h2>
          <span className="shrink-0 text-sm text-white/70 tabular-nums">
            {formatPrice(burger.price)}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-white/55">
          {burger.shortDescription}
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOrder(burger);
          }}
          className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-white/90 active:scale-[0.99]"
        >
          Pedila
        </button>
      </div>
    </article>
  );
}
