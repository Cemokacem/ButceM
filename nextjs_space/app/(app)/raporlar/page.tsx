export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { ReportsClient } from './reports-client';

export default async function RaporlarPage() {
  const now = new Date();
  const months: string[] = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

  // Last 12 months data
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const allTransactions = await prisma.transaction.findMany({
    where: { date: { gte: twelveMonthsAgo } },
    include: { category: true, account: true },
    orderBy: { date: 'desc' },
  });

  // Monthly trend
  const monthlyData: Array<{ month: string; income: number; expense: number; net: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyData.push({ month: `${months[d.getMonth()]} ${d.getFullYear()}`, income: 0, expense: 0, net: 0 });
  }

  (allTransactions ?? []).forEach((t: any) => {
    const tDate = new Date(t?.date);
    const monthDiff = (now.getFullYear() - tDate.getFullYear()) * 12 + (now.getMonth() - tDate.getMonth());
    const idx = 11 - monthDiff;
    if (idx >= 0 && idx < 12 && monthlyData[idx]) {
      if (t?.type === 'INCOME') monthlyData[idx].income += (t?.amount ?? 0);
      if (t?.type === 'EXPENSE') monthlyData[idx].expense += (t?.amount ?? 0);
      monthlyData[idx].net = monthlyData[idx].income - monthlyData[idx].expense;
    }
  });

  // Category breakdown
  const catMap: Record<string, { name: string; total: number; color: string; count: number }> = {};
  (allTransactions ?? []).filter((t: any) => t?.type === 'EXPENSE').forEach((t: any) => {
    const catId = t?.categoryId ?? 'other';
    const catName = t?.category?.name ?? 'Diğer';
    const catColor = t?.category?.color ?? '#94a3b8';
    if (!catMap[catId]) catMap[catId] = { name: catName, total: 0, color: catColor, count: 0 };
    catMap[catId].total += (t?.amount ?? 0);
    catMap[catId].count += 1;
  });
  const categoryBreakdown = Object.values(catMap).sort((a: any, b: any) => (b?.total ?? 0) - (a?.total ?? 0));

  // Account balances
  const accounts = await prisma.account.findMany({ where: { isActive: true } });
  const accountData = (accounts ?? []).map((a: any) => ({
    name: a?.name ?? '',
    balance: a?.balance ?? 0,
    type: a?.type ?? '',
    color: a?.color ?? '#10B981',
  }));

  // Totals
  const totalIncome = (allTransactions ?? []).filter((t: any) => t?.type === 'INCOME').reduce((s: number, t: any) => s + (t?.amount ?? 0), 0);
  const totalExpense = (allTransactions ?? []).filter((t: any) => t?.type === 'EXPENSE').reduce((s: number, t: any) => s + (t?.amount ?? 0), 0);

  return (
    <ReportsClient
      monthlyData={monthlyData}
      categoryBreakdown={categoryBreakdown}
      accountData={accountData}
      totalIncome={totalIncome}
      totalExpense={totalExpense}
    />
  );
}
