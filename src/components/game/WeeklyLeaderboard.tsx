import type { LeaderboardEntry } from '@/services/gameScoresService';

interface WeeklyLeaderboardProps {
  entries: LeaderboardEntry[];
  loading: boolean;
}

export function WeeklyLeaderboard({ entries, loading }: WeeklyLeaderboardProps) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-white">
          Top semanal
        </h3>
        <span className="text-[11px] uppercase tracking-[0.2em] text-white/45">
          Lun-Dom
        </span>
      </div>
      {loading ? (
        <p className="mt-3 text-sm text-white/45">Cargando ranking...</p>
      ) : entries.length === 0 ? (
        <p className="mt-3 text-sm text-white/45">Todavía no hay scores esta semana.</p>
      ) : (
        <ol className="mt-4 space-y-2">
          {entries.map((entry, index) => (
            <li
              key={`${entry.tableNumber}-${entry.score}-${entry.playedAt}`}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="text-white/64">
                #{index + 1} · Mesa {entry.tableNumber}
              </span>
              <span className="font-semibold tabular-nums text-white">{entry.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
