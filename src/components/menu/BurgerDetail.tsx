import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Burger } from '@/types/burger';
import { formatPrice } from '@/utils/formatPrice';
import { BurgerImage } from './BurgerImage';

interface BurgerDetailProps {
  burger: Burger;
  onOrder: (burger: Burger) => void;
}

export function BurgerDetail({ burger, onOrder }: BurgerDetailProps) {
  const navigate = useNavigate();

  return (
    <article className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 inline-flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/55 transition hover:text-white"
        >
          <ArrowLeft size={14} /> Volver
        </button>
        <div className="aspect-square overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-800">
          <BurgerImage burger={burger} />
        </div>
      </div>

      <div className="flex flex-col">
        <p className="text-[11px] uppercase tracking-[0.32em] text-white/45">
          Hamburguesa
        </p>
        <h1 className="mt-3 text-balance font-semibold uppercase tracking-tightest text-white text-[clamp(2rem,6vw,3.5rem)] leading-[0.95]">
          {burger.name}
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-white/65">
          {burger.detailDescription}
        </p>

        <div className="mt-8 border-t border-white/[0.06] pt-6">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">
            Lleva
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-white/75">
            {burger.ingredients.map((ing) => (
              <li key={ing} className="flex items-start gap-3">
                <span className="mt-2 h-px w-4 bg-white/30" />
                {ing}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 flex items-center justify-between gap-4 border-t border-white/[0.06] pt-6">
          <span className="text-2xl text-white tabular-nums">
            {formatPrice(burger.price)}
          </span>
          <button
            type="button"
            onClick={() => onOrder(burger)}
            className="inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-white/90 active:scale-[0.99]"
          >
            Pedila
          </button>
        </div>
      </div>
    </article>
  );
}
