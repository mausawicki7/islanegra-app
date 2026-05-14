-- Turno 5 delta — cocktail reward claims move from cocina to salon.

alter table public.game_scores
  add column if not exists claimed_by text,
  add column if not exists claimed_at timestamptz;

drop policy if exists "game_scores_anon_redeem" on public.game_scores;

create policy "game_scores_anon_claim_redeem"
  on public.game_scores for update
  to anon, authenticated
  using (
    redemption_code is not null
    and played_at > now() - interval '24 hours'
  )
  with check (
    redemption_code is not null
    and played_at > now() - interval '24 hours'
  );
