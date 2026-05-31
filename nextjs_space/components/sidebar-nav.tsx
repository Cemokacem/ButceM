'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tag,
  Wallet,
  HandCoins,
  CreditCard,
  Users,
  FileText,
  BarChart3,
  Menu,
  X,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/islemler', label: 'İşlemler', icon: ArrowLeftRight },
  { href: '/kategoriler', label: 'Kategoriler', icon: Tag },
  { href: '/hesaplar', label: 'Hesaplar', icon: Wallet },
  { href: '/borc-alacak', label: 'Borç/Alacak', icon: HandCoins },
  { href: '/taksitler', label: 'Taksitler', icon: CreditCard },
  { href: '/saticilar', label: 'Satıcılar', icon: Users },
  { href: '/belgeler', label: 'Belgeler', icon: FileText },
  { href: '/raporlar', label: 'Raporlar', icon: BarChart3 },
];

export function SidebarNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-3 left-3 z-50 md:hidden bg-primary text-primary-foreground p-2 rounded-lg shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Menü"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-40 bg-card border-r border-border flex flex-col transition-all duration-300',
          collapsed ? 'w-16' : 'w-60',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className={cn('flex items-center gap-2 p-4 border-b border-border', collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            ₺
          </div>
          {!collapsed && (
            <span className="font-display font-bold text-lg tracking-tight">BütçeM</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {navItems?.map((item: any) => {
            const Icon = item?.icon;
            const isActive = pathname === item?.href || (item?.href !== '/' && pathname?.startsWith?.(item?.href));
            return (
              <Link
                key={item?.href}
                href={item?.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                title={collapsed ? item?.label : undefined}
              >
                {Icon && <Icon size={20} className="flex-shrink-0" />}
                {!collapsed && <span>{item?.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle - desktop only */}
        <div className="hidden md:flex p-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft
              size={16}
              className={cn('transition-transform', collapsed && 'rotate-180')}
            />
            {!collapsed && <span className="ml-2 text-xs">Daralt</span>}
          </Button>
        </div>
      </aside>
    </>
  );
}
