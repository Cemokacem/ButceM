'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FadeIn, SlideIn } from '@/components/ui/animate';
import {
  Wallet, TrendingUp, TrendingDown, CreditCard, Plus,
  ArrowUpRight, ArrowDownRight, MoreVertical, ChevronLeft, ChevronRight
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import dynamic from 'next/dynamic';

const DashboardCharts = dynamic(() => import('./dashboard-charts'), { ssr: false, loading: () => <div className="h-48 bg-muted/30 rounded-lg animate-pulse" /> });

interface DashboardProps {
  totalBalance: number;
  totalCreditCardUsed: number;
  netBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  prevMonthIncome: number;
  prevMonthExpense: number;
  accounts: Array<{ id: string; name: string; type: string; balance: number; currency: string; color: string; bankName: string | null }>;
  creditCards: Array<{ id: string; name: string; limitAmount: number; usedAmount: number; color: string; cardNetwork: string }>;
  recentTransactions: Array<{
    id: string; type: string; amount: number; description: string;
    date: string; categoryName: string | null; categoryColor: string | null;
    accountName: string; vendorName: string | null; categoryIcon: string | null;
  }>;
  categoryBreakdown: Array<{ name: string; total: number; color: string }>;
  last7Days: Array<{ day: string; shortDay: string; income: number; expense: number }>;
  balanceTrend: Array<{ date: string; balance: number }>;
  budgets: Array<{ id: string; name: string; amount: number; spent: number; color: string; categoryName: string; startDate: string; endDate: string }>;
  cashFlow: {
    monthName: string;
    totalIncome: number;
    totalExpense: number;
    txCountIncome: number;
    txCountExpense: number;
    daysInMonth: number;
    avgDailyIncome: number;
    avgDailyExpense: number;
    avgTxIncome: number;
    avgTxExpense: number;
  };
}

function getCurrencySymbol(currency: string) {
  const map: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€', GBP: '£' };
  return map[currency] || currency;
}

export function DashboardClient(props: DashboardProps) {
  const {
    totalBalance, totalCreditCardUsed, netBalance,
    monthlyIncome, monthlyExpense, prevMonthIncome, prevMonthExpense,
    accounts, creditCards, recentTransactions, categoryBreakdown,
    last7Days, balanceTrend, budgets, cashFlow
  } = props;

  return (
    <div className="space-y-4">
      {/* Header */}
      <FadeIn>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-display font-bold tracking-tight">Dashboard</h1>
          <Link href="/islemler?new=true">
            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Plus size={14} className="mr-1" /> Yeni İşlem
            </Button>
          </Link>
        </div>
      </FadeIn>

      {/* Top Row: Özet | Bu Ay | Geçen Ay */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SlideIn from="bottom" delay={0}>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-1">Özet</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Bakiye</span>
                  <span className="font-mono font-bold text-emerald-600">{formatCurrency(totalBalance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Kredi kartları:</span>
                  <span className="font-mono font-semibold text-red-500">-{formatCurrency(totalCreditCardUsed)}</span>
                </div>
                <div className="border-t pt-1 flex justify-between text-sm font-bold">
                  <span>Net</span>
                  <span className={`font-mono ${netBalance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(netBalance)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </SlideIn>

        <SlideIn from="bottom" delay={0.05}>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-1">Bu Ay</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1"><TrendingUp size={12} className="text-emerald-500" /> Gelir</span>
                  <span className="font-mono font-semibold text-emerald-600">{formatCurrency(monthlyIncome)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1"><TrendingDown size={12} className="text-red-500" /> Gider</span>
                  <span className="font-mono font-semibold text-red-500">-{formatCurrency(monthlyExpense)}</span>
                </div>
                <div className="border-t pt-1 flex justify-between text-sm font-bold">
                  <span>Net</span>
                  <span className={`font-mono ${monthlyIncome - monthlyExpense >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatCurrency(monthlyIncome - monthlyExpense)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </SlideIn>

        <SlideIn from="bottom" delay={0.1}>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium mb-1">Geçen Ay</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1"><TrendingUp size={12} className="text-emerald-500" /> Gelir</span>
                  <span className="font-mono font-semibold text-emerald-600">{formatCurrency(prevMonthIncome)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1"><TrendingDown size={12} className="text-red-500" /> Gider</span>
                  <span className="font-mono font-semibold text-red-500">-{formatCurrency(prevMonthExpense)}</span>
                </div>
                <div className="border-t pt-1 flex justify-between text-sm font-bold">
                  <span>Net</span>
                  <span className={`font-mono ${prevMonthIncome - prevMonthExpense >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatCurrency(prevMonthIncome - prevMonthExpense)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </SlideIn>
      </div>

      {/* Second Row: Hesaplar + Kredi Kartları | Bakiye Grafiği */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="space-y-3">
          {/* Hesaplar */}
          <FadeIn delay={0.1}>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">Hesaplar</CardTitle>
                <Link href="/hesaplar"><Button variant="ghost" size="sm" className="h-6 text-xs">Tümü</Button></Link>
              </CardHeader>
              <CardContent className="pt-0">
                {accounts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">Hesap bulunamadı</p>
                ) : (
                  <div className="space-y-2">
                    {accounts.map(acc => (
                      <div key={acc.id} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <Wallet size={14} className="text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{acc.name}</p>
                            {acc.bankName && <p className="text-xs text-muted-foreground">{acc.bankName}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-mono font-bold ${acc.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {formatCurrency(acc.balance)}
                          </p>
                          <p className="text-xs text-muted-foreground">{acc.currency} - {getCurrencySymbol(acc.currency)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>

          {/* Kredi Kartları */}
          {creditCards.length > 0 && (
            <FadeIn delay={0.15}>
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Kredi Kartları</CardTitle>
                  <Link href="/kredi-kartlari"><Button variant="ghost" size="sm" className="h-6 text-xs">Tümü</Button></Link>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {creditCards.map(card => {
                      const usedPercent = card.limitAmount > 0 ? Math.round((card.usedAmount / card.limitAmount) * 100) : 0;
                      return (
                        <div key={card.id}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <CreditCard size={14} style={{ color: card.color }} />
                              <p className="text-sm font-medium">{card.name}</p>
                            </div>
                            <span className="text-sm font-mono font-semibold text-red-500">-{formatCurrency(card.usedAmount)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(usedPercent, 100)}%`, backgroundColor: card.color }} />
                            </div>
                            <span className="text-xs text-muted-foreground">%{usedPercent}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          )}
        </div>

        {/* Bakiye Grafiği */}
        <FadeIn delay={0.15}>
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Bakiye</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardCharts type="balance" data={balanceTrend} />
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Third Row: Son 7 Gün | Bütçeler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <FadeIn delay={0.2}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Son 7 Gün</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardCharts type="week" data={last7Days} />
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.25}>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">Bütçeler</CardTitle>
              <Link href="/butceler"><Button variant="ghost" size="sm" className="h-6 text-xs">Tümü</Button></Link>
            </CardHeader>
            <CardContent className="pt-0">
              {budgets.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Bütçe tanımlanmamış</p>
              ) : (
                <div className="space-y-3">
                  {budgets.slice(0, 4).map(b => {
                    const pct = b.amount > 0 ? Math.round((b.spent / b.amount) * 100) : 0;
                    const startD = b.startDate ? formatDate(b.startDate) : '';
                    const endD = b.endDate ? formatDate(b.endDate) : '';
                    return (
                      <div key={b.id}>
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-sm font-medium">{b.categoryName}</p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>{startD}</span>
                          <span>%{pct}</span>
                          <span>{endD}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct > 90 ? '#EF4444' : b.color }} />
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                          <span>{formatCurrency(b.spent)}</span>
                          <span>{formatCurrency(b.amount)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Fourth Row: Son İşlemler | Nakit Akımı */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <FadeIn delay={0.3}>
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold">İşlemler</CardTitle>
              <Link href="/islemler"><Button variant="ghost" size="sm" className="h-6 text-xs">Tümü</Button></Link>
            </CardHeader>
            <CardContent className="pt-0">
              {recentTransactions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Henüz işlem yok</p>
              ) : (
                <div className="space-y-1">
                  {recentTransactions.map(t => (
                    <div key={t.id} className="flex items-center justify-between py-1.5 px-1 rounded hover:bg-accent/30 transition-colors">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${t.categoryColor ?? '#9CA3AF'}20` }}>
                          {t.type === 'INCOME'
                            ? <ArrowUpRight size={13} className="text-emerald-500" />
                            : <ArrowDownRight size={13} className="text-red-500" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{t.categoryName ?? t.description}</p>
                          <p className="text-[10px] text-muted-foreground">{t.accountName} · {formatDate(t.date)}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-mono font-bold whitespace-nowrap ${
                        t.type === 'INCOME' ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.35}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Nakit Akımı (İşlemler)</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-center mb-3">
                <p className="text-sm font-semibold">{cashFlow.monthName}</p>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 font-medium"></th>
                    <th className="text-right py-1 font-medium text-emerald-600">Gelirler</th>
                    <th className="text-right py-1 font-medium text-red-500">Giderler</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-1.5">Toplam</td>
                    <td className="text-right font-mono text-emerald-600">{formatCurrency(cashFlow.totalIncome)}</td>
                    <td className="text-right font-mono text-red-500">-{formatCurrency(cashFlow.totalExpense)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1.5">İşlemler</td>
                    <td className="text-right font-mono">{cashFlow.txCountIncome}</td>
                    <td className="text-right font-mono">{cashFlow.txCountExpense}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1.5">Ortalama (Gün)</td>
                    <td className="text-right font-mono text-emerald-600">{formatCurrency(cashFlow.avgDailyIncome)}</td>
                    <td className="text-right font-mono text-red-500">-{formatCurrency(cashFlow.avgDailyExpense)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-1.5">Ortalama (İşlem)</td>
                    <td className="text-right font-mono text-emerald-600">{formatCurrency(cashFlow.avgTxIncome)}</td>
                    <td className="text-right font-mono text-red-500">-{formatCurrency(cashFlow.avgTxExpense)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="font-bold border-t-2">
                    <td className="py-1.5">Net</td>
                    <td colSpan={2} className={`text-right font-mono ${
                      cashFlow.totalIncome - cashFlow.totalExpense >= 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {formatCurrency(cashFlow.totalIncome - cashFlow.totalExpense)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
