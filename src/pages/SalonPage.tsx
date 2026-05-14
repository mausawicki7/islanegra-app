import { useState } from 'react';
import { CocktailValidationSection } from '@/components/salon/CocktailValidationSection';
import { PendingPaymentsSection } from '@/components/salon/PendingPaymentsSection';
import { ReadyOrdersSection } from '@/components/salon/ReadyOrdersSection';
import { SalonHeader } from '@/components/salon/SalonHeader';
import { SalonNav, type SalonTab } from '@/components/salon/SalonNav';
import { StaffIdentificationModal } from '@/components/salon/StaffIdentificationModal';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSalonRealtime } from '@/hooks/useSalonRealtime';
import { useStaffIdentity } from '@/hooks/useStaffIdentity';
import { isSupabaseConfigured } from '@/services/supabaseClient';

export function SalonPage() {
  const [activeTab, setActiveTab] = useState<SalonTab>('ready');
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const { identity, saveIdentity, clearIdentity } = useStaffIdentity();
  const { readyOrders, loading, error, connection, refresh } = useSalonRealtime();

  usePageTitle('Salón');

  const counts: Record<SalonTab, number> = {
    ready: readyOrders.length,
    payments: pendingPaymentsCount,
    cocktails: 0,
  };

  const staffName = identity?.name ?? '';

  return (
    <div className="min-h-full bg-[#050505] text-white">
      <SalonHeader
        staffName={staffName || 'Sin nombre'}
        connection={connection}
        onChangeStaff={clearIdentity}
      />

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-8 pt-4">
        {!isSupabaseConfigured && (
          <p className="rounded-xl border border-amber-300/30 bg-amber-300/[0.05] px-3 py-2 text-xs text-amber-200">
            Supabase no está configurado. Revisá las VITE_SUPABASE_* en `.env.local`.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-200"
          >
            {error}
          </p>
        )}
        {connection === 'reconnecting' && (
          <p className="rounded-xl border border-amber-300/20 bg-amber-300/[0.04] px-3 py-2 text-xs uppercase tracking-[0.16em] text-amber-100/80">
            Reconectando. Los datos pueden estar desactualizados.
          </p>
        )}

        <SalonNav active={activeTab} counts={counts} onChange={setActiveTab} />

        {activeTab === 'ready' && (
          <ReadyOrdersSection
            orders={readyOrders}
            staffName={staffName}
            loading={loading}
            onSettled={refresh}
          />
        )}
        <div className={activeTab === 'payments' ? '' : 'hidden'}>
          <PendingPaymentsSection
            staffName={staffName}
            onCountChange={setPendingPaymentsCount}
          />
        </div>
        {activeTab === 'cocktails' && (
          <CocktailValidationSection staffName={staffName} />
        )}
      </main>

      <StaffIdentificationModal open={!identity} onSave={saveIdentity} />
    </div>
  );
}
