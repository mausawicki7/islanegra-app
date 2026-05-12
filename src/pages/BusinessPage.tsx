import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { BusinessAuth } from '@/components/business/BusinessAuth';
import { BusinessLayout } from '@/components/business/BusinessLayout';
import { BusinessAnalyticsPage } from './business/BusinessAnalyticsPage';
import { BusinessOrdersPage } from './business/BusinessOrdersPage';
import { BusinessSummaryPage } from './business/BusinessSummaryPage';
import { SettlementsPage } from './business/SettlementsPage';
import { SettlementDetailPage } from './business/SettlementDetailPage';
import { PartnersPage } from './business/PartnersPage';
import { MyEarningsPage } from './business/MyEarningsPage';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessMetrics } from '@/hooks/useBusinessMetrics';
import { usePeriod } from '@/hooks/usePeriod';

/**
 * Map a partner profile email to their partner name as stored in the
 * `partners` table. Used to filter payouts in MyEarnings. The migration
 * also stores partner_id on the profile row, so this is a fallback when
 * the partner_id link hasn't been populated yet.
 */
const PARTNER_NAME_BY_EMAIL: Record<string, string> = {
  'mauricio@islanegra.com.ar': 'Mauricio Sawicki',
  'sebastian@islanegra.com.ar': 'Sebastián Gutierrez',
};

function partnerDisplayName(email: string): string {
  return PARTNER_NAME_BY_EMAIL[email.toLowerCase()] ?? email;
}

export function BusinessPage() {
  const { user, profile, role, loading, authError, login, logout } = useAuth();
  const { period, setKey, setCustom } = usePeriod();
  const metrics = useBusinessMetrics(period);

  const [loginLoading, setLoginLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !profile) {
      setAccessError(null);
      return;
    }
    if (role !== 'owner' && role !== 'partner') {
      setAccessError('No tenés acceso a esta sección.');
      void logout();
    }
  }, [user, profile, role, logout]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 text-sm uppercase tracking-[0.2em] text-white/45">
        Cargando…
      </div>
    );
  }

  if (!user || !profile || (role !== 'owner' && role !== 'partner')) {
    return (
      <BusinessAuth
        loading={loginLoading}
        error={accessError ?? authError}
        onSubmit={async (email, password) => {
          setLoginLoading(true);
          await login(email, password);
          setLoginLoading(false);
        }}
      />
    );
  }

  return (
    <BusinessLayout
      profile={profile}
      period={period}
      onPeriodChange={setKey}
      onCustomPeriod={setCustom}
      onLogout={logout}
    >
      <Routes>
        <Route
          index
          element={
            <BusinessSummaryPage
              kpis={metrics.kpis}
              previousKpis={metrics.previousKpis}
              loading={metrics.loading}
              error={metrics.error}
            />
          }
        />
        <Route
          path="pedidos"
          element={
            <BusinessOrdersPage
              orders={metrics.orders}
              loading={metrics.loading}
              error={metrics.error}
            />
          }
        />
        <Route
          path="analisis"
          element={
            <BusinessAnalyticsPage
              revenueByDay={metrics.revenueByDay}
              burgerRanking={metrics.burgerRanking}
              paymentSplit={metrics.paymentSplit}
              heatmap={metrics.heatmap}
              operationalTimings={metrics.operationalTimings}
              loading={metrics.loading}
              error={metrics.error}
            />
          }
        />
        <Route path="liquidaciones" element={<SettlementsPage />} />
        <Route
          path="liquidaciones/:month"
          element={<SettlementDetailPage role={profile.role} />}
        />
        <Route
          path="mis-liquidaciones"
          element={
            role === 'partner' ? (
              <MyEarningsPage partnerName={partnerDisplayName(profile.email)} />
            ) : (
              <Navigate to="/negocio/liquidaciones" replace />
            )
          }
        />
        <Route
          path="socios"
          element={
            role === 'owner' ? (
              <PartnersPage />
            ) : (
              <Navigate to="/negocio" replace />
            )
          }
        />
      </Routes>
    </BusinessLayout>
  );
}
