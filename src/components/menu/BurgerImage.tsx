import type { Burger } from '@/types/burger';

interface BurgerImageProps {
  burger: Burger;
  className?: string;
}

// Editorial-style dark placeholder. Renders the burger name as a typographic
// composition until real photography is dropped in (replace with <img/> when
// burger.image is provided).
export function BurgerImage({ burger, className = '' }: BurgerImageProps) {
  if (burger.image) {
    return (
      <img
        src={burger.image}
        alt={burger.name}
        loading="lazy"
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  const [first, ...rest] = burger.name.split(' ');
  const second = rest.join(' ');

  return (
    <div
      className={`relative flex h-full w-full flex-col justify-between bg-[radial-gradient(ellipse_at_30%_20%,#1a1a1a,#050505_70%)] p-5 ${className}`}
      aria-hidden="true"
    >
      <span className="text-[10px] uppercase tracking-[0.32em] text-white/35">
        Islanegra
      </span>
      <div className="leading-[0.9]">
        <p className="text-balance font-semibold uppercase tracking-tightest text-white text-[clamp(1.6rem,5.5vw,2.6rem)]">
          {first}
        </p>
        {second && (
          <p className="text-balance font-semibold uppercase tracking-tightest text-white/55 text-[clamp(1.2rem,4.5vw,2rem)]">
            {second}
          </p>
        )}
      </div>
    </div>
  );
}
