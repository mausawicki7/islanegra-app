import type { Burger } from '@/types/burger';
import { BurgerCard } from './BurgerCard';

interface BurgerGridProps {
  burgers: Burger[];
  onOrder: (burger: Burger) => void;
}

export function BurgerGrid({ burgers, onOrder }: BurgerGridProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {burgers.map((b) => (
        <BurgerCard key={b.id} burger={b} onOrder={onOrder} />
      ))}
    </div>
  );
}
