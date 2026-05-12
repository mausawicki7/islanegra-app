import type { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import logo from '@/assets/logo.svg';
import { Footer } from '@/components/layout/Footer';
import { PeriodSelector } from './PeriodSelector';
import type { PeriodKey, PeriodRange } from '@/utils/periodHelpers';
import type { Profile, UserRole } from '@/services/authService';

interface BusinessLayoutProps {
  profile: Profile;
  period: PeriodRange;
  onPeriodChange: (key: PeriodKey) => void;
  onCustomPeriod: (range: { start: string; end: string }) => void;
  onLogout: () => void;
  children: ReactNode;
}

const ROLE_LABEL: Record<UserRole, string> = {
  owner: 'Owner',
  partner: 'Socio',
  kitchen: 'Cocina',
};

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/negocio', label: 'Resumen', end: true },
  { to: '/negocio/pedidos', label: 'Pedidos' },
  { to: '/negocio/analisis', label: 'Análisis' },
  { to: '/negocio/liquidaciones', label: 'Liquidaciones' },
  { to: '/negocio/mis-liquidaciones', label: 'Mis liquidaciones', roles: ['partner'] },
  { to: '/negocio/socios', label: 'Socios', roles: ['owner'] },
];

export function BusinessLayout({
  profile,
  period,
  onPeriodChange,
  onCustomPeriod,
  onLogout,
  children,
}: BusinessLayoutProps) {
  return (
    <div className="flex min-h-full flex-col bg-ink-950 text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Islanegra" className="h-4 w-auto" />
            <span className="hidden text-[11px] uppercase tracking-[0.32em] text-white/45 sm:inline">
              Negocio
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm text-white">{profile.email}</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">
                {ROLE_LABEL[profile.role]}
              </p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white/70 hover:border-white/30 hover:text-white"
            >
              <LogOut size={13} /> Salir
            </button>
          </div>
        </div>

        <nav className="border-t border-white/[0.04]">
          <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 scrollbar-hide">
            {NAV_ITEMS.filter(
              (item) => !item.roles || item.roles.includes(profile.role),
            ).map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `inline-flex h-11 items-center px-4 text-[11px] uppercase tracking-[0.22em] transition ${
                      isActive
                        ? 'text-white'
                        : 'text-white/45 hover:text-white/75'
                    } relative ${isActive ? 'after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-white' : ''}`
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 pb-12 pt-6">
        <div className="mb-6">
          <PeriodSelector
            period={period}
            onChange={onPeriodChange}
            onCustom={onCustomPeriod}
          />
        </div>
        {children}
      </main>

      <div className="mx-auto w-full max-w-7xl px-6">
        <Footer />
      </div>
    </div>
  );
}
