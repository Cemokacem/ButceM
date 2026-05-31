'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FadeIn } from '@/components/ui/animate';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const LONG_DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

export default function TakvimPage() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  }, []);

  const load = useCallback(async () => {
    if (!currentDate) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/calendar?year=${currentDate.getFullYear()}&month=${currentDate.getMonth()}`);
      const data = await res.json();
      setTransactions(data?.transactions ?? []);
    } catch {
      toast.error('Takvim verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => { load(); }, [load]);

  if (!currentDate || !selectedDate) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" /></div>;
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday=0
  const daysInMonth = lastDay.getDate();

  // Build calendar grid
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  // Group transactions by day
  const txByDay: Record<number, any[]> = {};
  (transactions ?? []).forEach((t: any) => {
    const d = new Date(t.date).getDate();
    if (!txByDay[d]) txByDay[d] = [];
    txByDay[d].push(t);
  });

  const getDayTotals = (day: number) => {
    const dayTx = txByDay[day] ?? [];
    const income = dayTx.filter((t: any) => t.type === 'INCOME').reduce((s: number, t: any) => s + (t.amount ?? 0), 0);
    const expense = dayTx.filter((t: any) => t.type === 'EXPENSE').reduce((s: number, t: any) => s + (t.amount ?? 0), 0);
    return { income, expense, net: income - expense };
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const selectedDay = selectedDate.getDate();
  const selectedTx = selectedDate.getMonth() === month && selectedDate.getFullYear() === year ? (txByDay[selectedDay] ?? []) : [];
  const selectedTotals = selectedDate.getMonth() === month ? getDayTotals(selectedDay) : { income: 0, expense: 0, net: 0 };

  const today = new Date();
  const isToday = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isSelected = (day: number) => day === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();

  const selectedDow = (selectedDate.getDay() + 6) % 7;
  const selectedDateStr = `${selectedDate.getDate()} ${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()} ${LONG_DAYS[selectedDow]}`;

  return (
    <div className="space-y-4">
      <FadeIn>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold tracking-tight">Takvim</h1>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card>
          <CardContent className="p-4">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft size={20} /></Button>
              <h2 className="text-lg font-bold">{MONTH_NAMES[month]} {year}</h2>
              <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight size={20} /></Button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {DAY_NAMES.map(d => (
                <div key={d} className="text-center text-xs font-bold text-muted-foreground py-2">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((day, idx) => {
                if (day === null) return <div key={`empty-${idx}`} className="min-h-[70px]" />;
                const totals = getDayTotals(day);
                const hasIncome = totals.income > 0;
                const hasExpense = totals.expense > 0;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(new Date(year, month, day))}
                    className={`min-h-[70px] p-1 rounded-lg text-left transition-colors relative ${
                      isSelected(day) ? 'bg-blue-100 dark:bg-blue-900/30' : 'hover:bg-muted/50'
                    } ${isToday(day) ? 'ring-1 ring-blue-500' : ''}`}
                  >
                    <span className={`text-sm font-medium ${isToday(day) ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}>{day}</span>
                    {/* Dots */}
                    <div className="flex gap-0.5 mt-0.5">
                      {hasExpense && <span className="w-2 h-2 rounded-full bg-red-500" />}
                      {hasIncome && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                    </div>
                    {/* Net amount */}
                    {(hasIncome || hasExpense) && (
                      <p className={`text-[10px] font-mono mt-0.5 ${totals.net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {totals.net >= 0 ? '' : '-'}₺{Math.abs(totals.net).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Selected day details */}
      <FadeIn delay={0.2}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">{selectedDateStr}</h3>
              <div className="text-sm space-x-4">
                <span className="text-emerald-500">● Gelirler: {formatCurrency(selectedTotals.income)}</span>
                <span className="text-red-500">● Harcamalar: -{formatCurrency(selectedTotals.expense)}</span>
              </div>
            </div>
            {selectedTx.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Bu günde işlem yok</p>
            ) : (
              <div className="space-y-2">
                {selectedTx.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    {t.category && (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${t.category.color}20` }}>
                        <span className="text-xs" style={{ color: t.category.color }}>{t.category.name?.charAt(0)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{t.category?.name ?? t.description}</p>
                      <p className="text-xs text-muted-foreground">{t.account?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold font-mono ${t.type === 'INCOME' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {t.type === 'EXPENSE' ? '-' : ''}{formatCurrency(t.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString('tr-TR')}</p>
                    </div>
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
