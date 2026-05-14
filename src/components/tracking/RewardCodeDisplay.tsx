import { GAME_COPY } from '@/data/copy';

interface RewardCodeDisplayProps {
  code: string;
  redeemedAt?: string | null;
}

export function RewardCodeDisplay({ code, redeemedAt }: RewardCodeDisplayProps) {
  return (
    <section className="rounded-lg border border-white/15 bg-white text-black p-5 text-center">
      <p className="text-[11px] uppercase tracking-[0.28em] text-black/55">
        Cocktail ganado
      </p>
      <p className="mt-3 text-4xl font-semibold tracking-[0.16em]">{code}</p>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-black/65">
        {redeemedAt ? 'Código canjeado. Gracias.' : GAME_COPY.redeemInstructions}
      </p>
    </section>
  );
}
