export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { DashboardClient } from './dashboard-client';

export default async function DashboardPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [accounts, recentTransactions, monthlyTransactions, debts, installments] = await Promise.all([
    prisma.account.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.transaction.findMany({
      take: 10,
      orderBy: { date: 'desc' },
      include: { category: true, account: true },
    }),
    prisma.transaction.findMany({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
      include: { category: true },
    }),
    prisma.debtCredit.findMany({ where: { status: 'ACTIVE' } }),
    prisma.installment.findMany({ where: { status: 'ACTIVE' }, include: { account: true } }),
  ]);

  const totalBalance = (accounts ?? []).reduce((sum: number, a: any) => sum + (a?.balance ?? 0), 0);
  const monthlyIncome = (monthlyTransactions ?? []).filter((t: any) => t?.type === 'INCOME').reduce((sum: number, t: any) => sum + (t?.amount ?? 0), 0);
  const monthlyExpense = (monthlyTransactions ?? []).filter((t: any) => t?.type === 'EXPENSE').reduce((sum: number, t: any) => sum + (t?.amount ?? 0), 0);

  const categoryMap: Record<string, { name: string; total: number; color: string }> = {};
  (monthlyTransactions ?? []).filter((t: any) => t?.type === 'EXPENSE').forEach((t: any) => {
    const catId = t?.categoryId ?? 'other';
    const catName = t?.category?.name ?? 'Diğer';
    const catColor = t?.category?.color ?? '#94a3b8';
    if (!categoryMap[catId]) {
      categoryMap[catId] = { name: catName, total: 0, color: catColor };
    }
    categoryMap[catId].total += (t?.amount ?? 0);
  });
  const categoryBreakdown = Object.values(categoryMap);

  const monthlyTrend: Array<{ month: string; income: number; expense: number }> = [];
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyTrend.push({ month: months[d.getMonth()] ?? '', income: 0, expense: 0 });
  }

  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const trendTransactions = await prisma.transaction.findMany({
    where: { date: { gte: sixMonthsAgo } },
  });
  (trendTransactions ?? []).forEach((t: any) => {
    const tDate = new Date(t?.date);
    const monthDiff = (now.getFullYear() - tDate.getFullYear()) * 12 + (now.getMonth() - tDate.getMonth());
    const idx = 5 - monthDiff;
    if (idx >= 0 && idx < 6 && monthlyTrend[idx]) {
      if (t?.type === 'INCOME') monthlyTrend[idx].income += (t?.amount ?? 0);
      if (t?.type === 'EXPENSE') monthlyTrend[idx].expense += (t?.amount ?? 0);
    }
  });

  const totalDebt = (debts ?? []).filter((d: any) => d?.type === 'DEBT').reduce((sum: number, d: any) => sum + (d?.remainingAmount ?? 0), 0);
  const totalCredit = (debts ?? []).filter((d: any) => d?.type === 'CREDIT').reduce((sum: number, d: any) => sum + (d?.remainingAmount ?? 0), 0);
  const totalInstallmentRemaining = (installments ?? []).reduce((sum: number, inst: any) => {
    const remaining = ((inst?.installmentCount ?? 0) - (inst?.paidCount ?? 0)) * (inst?.monthlyAmount ?? 0);
    return sum + remaining;
  }, 0);

  const serializedTransactions = (recentTransactions ?? []).map((t: any) => ({
    id: t?.id ?? '',
    type: t?.type ?? '',
    amount: t?.amount ?? 0,
    description: t?.description ?? '',
    date: t?.date?.toISOString?.() ?? '',
    notes: t?.notes ?? null,
    categoryName: t?.category?.name ?? null,
    categoryColor: t?.category?.color ?? null,
    accountName: t?.account?.name ?? '',
  }));

  return (
    <DashboardClient
      totalBalance={totalBalance}
      monthlyIncome={monthlyIncome}
      monthlyExpense={monthlyExpense}
      totalDebt={totalDebt}
      totalCredit={totalCredit}
      totalInstallmentRemaining={totalInstallmentRemaining}
      categoryBreakdown={categoryBreakdown}
      monthlyTrend={monthlyTrend}
      recentTransactions={serializedTransactions}
      accountCount={(accounts ?? []).length}
    />
  );
}
