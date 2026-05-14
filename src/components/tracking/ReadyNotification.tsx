export function ReadyNotification() {
  return (
    <section className="rounded-lg border border-white/[0.08] bg-[#111111] p-5">
      <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">
        Sale a mesa
      </p>
      <h2 className="mt-3 text-2xl font-semibold uppercase tracking-tightest text-white">
        ¡Tu hamburguesa está lista!
      </h2>
      <p className="mt-3 text-sm leading-6 text-white/64">
        Esperá a la moza en tu mesa. El juego queda cerrado para que el premio
        no compita con la hamburguesa.
      </p>
    </section>
  );
}
