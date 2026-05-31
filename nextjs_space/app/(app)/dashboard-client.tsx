'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FadeIn, SlideIn } from '@/components/ui/animate';
import {
  Wallet, TrendingUp, TrendingDown, HandCoins, CreditCard,
  ArrowUpRight, ArrowDownRight, ArrowLeftRight, Plus
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import dynamic from 'next/dynamic';

const DashboardCharts = dynamic(() => import('./dashboard-charts'), { ssr: false, loading: () => <div className="h-64 bg-muted/30 rounded-lg animate-pulse" /> });

interface DashboardProps {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  totalDebt: number;
  totalCredit: number;
  totalInstallmentRemaining: number;
  categoryBreakdown: Array<{ name: string; total: number; color: string }>;
  monthlyTrend: Array<{ month: string; income: number; expense: number }>;
  recentTransactions: Array<{
    id: string; type: string; amount: number; description: string;
    date: string; notes: string | null; categoryName: string | null;
    categoryColor: string | null; accountName: string;
  }>;
  accountCount: number;
}

function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      current += increment;
      if (step >= steps) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(current);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{prefix}{formatCurrency(display)}</span>;
}

export function DashboardClient(props: DashboardProps) {
  const {
    totalBalance, monthlyIncome, monthlyExpense, totalDebt,
    totalCredit, totalInstallmentRemaining, categoryBreakdown,
    monthlyTrend, recentTransactions, accountCount
  } = props;

  const summaryCards = [
    { title: 'Toplam Bakiye', value: totalBalance, icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Aylık Gelir', value: monthlyIncome, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Aylık Gider', value: monthlyExpense, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' },
    { title: 'Toplam Borç', value: totalDebt, icon: HandCoins, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { title: 'Toplam Alacak', value: totalCredit, icon: HandCoins, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Kalan Taksit', value: totalInstallmentRemaining, icon: CreditCard, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Finansal durumunuzun özeti</p>
          </div>
          <Link href="/islemler?new=true">
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Plus size={16} className="mr-1" /> Yeni İşlem
            </Button>
          </Link>
        </div>
      </FadeIn>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {summaryCards?.map((card: any, i: number) => {
          const Icon = card?.icon;
          return (
            <SlideIn key={i} from="bottom" delay={i * 0.08}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${card?.bg}`}>
                      {Icon && <Icon size={20} className={card?.color} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{card?.title}</p>
                      <p className={`text-sm md:text-base font-bold font-mono ${card?.color}`}>
                        <AnimatedNumber value={card?.value ?? 0} />
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SlideIn>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FadeIn delay={0.2}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Aylık Gelir/Gider Trendi</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardCharts type="trend" data={monthlyTrend} />
            </CardContent>
          </Card>
        </FadeIn>
        <FadeIn delay={0.3}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Kategori Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardCharts type="category" data={categoryBreakdown} />
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Recent Transactions */}
      <FadeIn delay={0.4}>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Son İşlemler</CardTitle>
              <Link href="/islemler">
                <Button variant="ghost" size="sm">Tümünü Gör</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {(recentTransactions ?? []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ArrowLeftRight size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Henüz işlem bulunmuyor</p>
                <Link href="/islemler?new=true">
                  <Button variant="outline" size="sm" className="mt-2">Yeni İşlem Ekle</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {(recentTransactions ?? []).map((t: any) => (
                  <div key={t?.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-1.5 rounded-md ${
                        t?.type === 'INCOME' ? 'bg-emerald-500/10' : t?.type === 'EXPENSE' ? 'bg-red-500/10' : 'bg-blue-500/10'
                      }`}>
                        {t?.type === 'INCOME' ? <ArrowUpRight size={16} className="text-emerald-500" /> :
                         t?.type === 'EXPENSE' ? <ArrowDownRight size={16} className="text-red-500" /> :
                         <ArrowLeftRight size={16} className="text-blue-500" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t?.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {t?.accountName} {t?.categoryName ? `· ${t.categoryName}` : ''} · {formatDate(t?.date)}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-mono font-semibold whitespace-nowrap ${
                      t?.type === 'INCOME' ? 'text-emerald-500' : t?.type === 'EXPENSE' ? 'text-red-500' : 'text-blue-500'
                    }`}>
                      {t?.type === 'INCOME' ? '+' : t?.type === 'EXPENSE' ? '-' : ''}{formatCurrency(t?.amount ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
