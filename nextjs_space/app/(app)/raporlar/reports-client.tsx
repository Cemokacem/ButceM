'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FadeIn } from '@/components/ui/animate';
import { formatCurrency } from '@/lib/format';
import { BarChart3, Download, TrendingUp, TrendingDown } from 'lucide-react';
import dynamic from 'next/dynamic';

const ReportCharts = dynamic(() => import('./report-charts'), { ssr: false, loading: () => <div className="h-64 bg-muted/30 rounded-lg animate-pulse" /> });

interface Props {
  monthlyData: Array<{ month: string; income: number; expense: number; net: number }>;
  categoryBreakdown: Array<{ name: string; total: number; color: string; count: number }>;
  accountData: Array<{ name: string; balance: number; type: string; color: string }>;
  totalIncome: number;
  totalExpense: number;
}

export function ReportsClient({ monthlyData, categoryBreakdown, accountData, totalIncome, totalExpense }: Props) {
  const handleExport = async () => {
    try {
      const link = document.createElement('a');
      link.href = '/api/export';
      link.download = 'butcem-export.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // silent
    }
  };

  return (
    <div className="space-y-4">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">Raporlar</h1>
            <p className="text-sm text-muted-foreground">Son 12 aylık finansal analizleriniz</p>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download size={16} className="mr-1" /> Veriyi Dışa Aktar
          </Button>
        </div>
      </FadeIn>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FadeIn delay={0.1}>
          <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={20} />
                <span className="text-sm opacity-80">Toplam Gelir</span>
              </div>
              <p className="text-xl font-bold font-mono mt-1">{formatCurrency(totalIncome)}</p>
            </CardContent>
          </Card>
        </FadeIn>
        <FadeIn delay={0.15}>
          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingDown size={20} />
                <span className="text-sm opacity-80">Toplam Gider</span>
              </div>
              <p className="text-xl font-bold font-mono mt-1">{formatCurrency(totalExpense)}</p>
            </CardContent>
          </Card>
        </FadeIn>
        <FadeIn delay={0.2}>
          <Card className={`bg-gradient-to-r ${(totalIncome - totalExpense) >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} text-white`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={20} />
                <span className="text-sm opacity-80">Net Durum</span>
              </div>
              <p className="text-xl font-bold font-mono mt-1">{formatCurrency(totalIncome - totalExpense)}</p>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Monthly Trend */}
      <FadeIn delay={0.25}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Aylık Gelir/Gider Trendi</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportCharts type="monthly" data={monthlyData} />
          </CardContent>
        </Card>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Breakdown */}
        <FadeIn delay={0.3}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Gider Kategorileri</CardTitle>
            </CardHeader>
            <CardContent>
              <ReportCharts type="category" data={categoryBreakdown} />
              {(categoryBreakdown ?? []).length > 0 && (
                <div className="mt-4 space-y-2">
                  {(categoryBreakdown ?? []).map((cat: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat?.color ?? '#94a3b8' }} />
                        <span>{cat?.name}</span>
                        <span className="text-xs text-muted-foreground">({cat?.count} işlem)</span>
                      </div>
                      <span className="font-mono">{formatCurrency(cat?.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        {/* Account Balances */}
        <FadeIn delay={0.35}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Hesap Bakiyeleri</CardTitle>
            </CardHeader>
            <CardContent>
              <ReportCharts type="accounts" data={accountData} />
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}
