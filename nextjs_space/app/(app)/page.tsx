export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { DashboardClient } from './dashboard-client';

export default async function DashboardPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [accounts, creditCards, recentTransactions, monthlyTransactions, prevMonthTransactions, debts, installments, budgets] = await Promise.all([
    prisma.account.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.creditCard.findMany({ where: { isActive: true }, include: { account: true } }),
    prisma.transaction.findMany({
      take: 8,
      orderBy: { date: 'desc' },
      include: { category: true, account: true, vendor: true },
    }),
    prisma.transaction.findMany({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
      include: { category: true },
    }),
    prisma.transaction.findMany({
      where: { date: { gte: prevMonthStart, lte: prevMonthEnd } },
    }),
    prisma.debtCredit.findMany({ where: { status: 'ACTIVE' } }),
    prisma.installment.findMany({ where: { status: 'ACTIVE' } }),
    prisma.budget.findMany({ where: { isActive: true }, include: { category: true } }),
  ]);

  // Separate non-credit-card accounts for balance calculation
  const nonCcAccounts = (accounts ?? []).filter((a: any) => a?.type !== 'CREDIT_CARD');
  const ccAccounts = (accounts ?? []).filter((a: any) => a?.type === 'CREDIT_CARD');
  const totalBalance = nonCcAccounts.reduce((sum: number, a: any) => sum + (a?.balance ?? 0), 0);
  
  // Credit card used = absolute value of negative CREDIT_CARD account balances
  // Also fall back to CreditCard model's usedAmount if no matching account found
  const totalCreditCardUsed = ccAccounts.reduce((sum: number, a: any) => sum + Math.abs(Math.min(0, a?.balance ?? 0)), 0)
    || (creditCards ?? []).reduce((sum: number, c: any) => sum + (c?.usedAmount ?? 0), 0);
  const netBalance = totalBalance - totalCreditCardUsed;
  
  const monthlyIncome = (monthlyTransactions ?? []).filter((t: any) => t?.type === 'INCOME').reduce((sum: number, t: any) => sum + (t?.amount ?? 0), 0);
  const monthlyExpense = (monthlyTransactions ?? []).filter((t: any) => t?.type === 'EXPENSE').reduce((sum: number, t: any) => sum + (t?.amount ?? 0), 0);

  const prevMonthIncome = (prevMonthTransactions ?? []).filter((t: any) => t?.type === 'INCOME').reduce((sum: number, t: any) => sum + (t?.amount ?? 0), 0);
  const prevMonthExpense = (prevMonthTransactions ?? []).filter((t: any) => t?.type === 'EXPENSE').reduce((sum: number, t: any) => sum + (t?.amount ?? 0), 0);

  // Category breakdown for this month
  const categoryMap: Record<string, { name: string; total: number; color: string }> = {};
  (monthlyTransactions ?? []).filter((t: any) => t?.type === 'EXPENSE').forEach((t: any) => {
    const catId = t?.categoryId ?? 'other';
    const catName = t?.category?.name ?? 'Diğer';
    const catColor = t?.category?.color ?? '#94a3b8';
    if (!categoryMap[catId]) categoryMap[catId] = { name: catName, total: 0, color: catColor };
    categoryMap[catId].total += (t?.amount ?? 0);
  });
  const categoryBreakdown = Object.values(categoryMap).sort((a, b) => b.total - a.total);

  // Last 7 days bar chart data
  const last7Days: Array<{ day: string; shortDay: string; income: number; expense: number }> = [];
  const dayNames = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    last7Days.push({
      day: d.toISOString().split('T')[0],
      shortDay: `${d.getDate()} ${dayNames[d.getDay()]}`,
      income: 0,
      expense: 0,
    });
  }
  const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  const weekTxs = await prisma.transaction.findMany({ where: { date: { gte: weekAgo } } });
  (weekTxs ?? []).forEach((t: any) => {
    const tDay = new Date(t?.date).toISOString().split('T')[0];
    const entry = last7Days.find(d => d.day === tDay);
    if (entry) {
      if (t?.type === 'INCOME') entry.income += (t?.amount ?? 0);
      if (t?.type === 'EXPENSE') entry.expense += (t?.amount ?? 0);
    }
  });

  // Balance trend (last 2 months)
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const allRecentTxs = await prisma.transaction.findMany({
    where: { date: { gte: twoMonthsAgo } },
    orderBy: { date: 'asc' },
  });
  
  // Build balance over time (approximate)
  const balanceTrend: Array<{ date: string; balance: number }> = [];
  let runningBalance = totalBalance;
  // Reverse - subtract recent transactions to get historical balance
  const sortedDesc = [...(allRecentTxs ?? [])].reverse();
  const balanceByDate = new Map<string, number>();
  balanceByDate.set(now.toISOString().split('T')[0], runningBalance);
  for (const tx of sortedDesc) {
    const change = tx.type === 'INCOME' ? tx.amount : -tx.amount;
    runningBalance -= change;
    const dateKey = new Date(tx.date).toISOString().split('T')[0];
    balanceByDate.set(dateKey, runningBalance);
  }
  // Create sorted trend entries
  const sortedDates = Array.from(balanceByDate.keys()).sort();
  // Sample ~20 points max
  const step = Math.max(1, Math.floor(sortedDates.length / 20));
  for (let i = 0; i < sortedDates.length; i += step) {
    const d = sortedDates[i];
    balanceTrend.push({ date: d, balance: balanceByDate.get(d) ?? 0 });
  }
  // Ensure last point is current
  const todayKey = now.toISOString().split('T')[0];
  if (!balanceTrend.find(b => b.date === todayKey)) {
    balanceTrend.push({ date: todayKey, balance: totalBalance });
  }

  // Cash flow table data
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const txCountIncome = (monthlyTransactions ?? []).filter((t: any) => t?.type === 'INCOME').length;
  const txCountExpense = (monthlyTransactions ?? []).filter((t: any) => t?.type === 'EXPENSE').length;

  // Serialized data - exclude CREDIT_CARD accounts from Hesaplar section
  const serializedAccounts = nonCcAccounts.map((a: any) => ({
    id: a?.id ?? '', name: a?.name ?? '', type: a?.type ?? '', balance: a?.balance ?? 0,
    currency: a?.currency ?? 'TRY', color: a?.color ?? '#10B981', bankName: a?.bankName ?? null,
  }));

  const serializedCreditCards = (creditCards ?? []).map((c: any) => {
    // Try to match with CREDIT_CARD account to get actual used amount from balance
    const cardName = (c?.name ?? '').toLowerCase().trim();
    const matchedAccount = ccAccounts.find((acc: any) => {
      const accName = (acc?.name ?? '').toLowerCase().trim();
      return cardName === accName || accName.includes(cardName) || cardName.includes(accName);
    });
    // Used amount = abs of negative balance from matched account, or fallback to model value
    const actualUsed = matchedAccount ? Math.abs(Math.min(0, matchedAccount.balance ?? 0)) : (c?.usedAmount ?? 0);
    return {
      id: c?.id ?? '', name: c?.name ?? '', limitAmount: c?.limitAmount ?? 0,
      usedAmount: actualUsed, color: c?.color ?? '#3B82F6',
      cardNetwork: c?.cardNetwork ?? 'VISA',
    };
  });

  const serializedTransactions = (recentTransactions ?? []).map((t: any) => ({
    id: t?.id ?? '', type: t?.type ?? '', amount: t?.amount ?? 0,
    description: t?.description ?? '', date: t?.date?.toISOString?.() ?? '',
    categoryName: t?.category?.name ?? null, categoryColor: t?.category?.color ?? null,
    accountName: t?.account?.name ?? '', vendorName: t?.vendor?.name ?? null,
    categoryIcon: t?.category?.icon ?? null,
  }));

  const serializedBudgets = (budgets ?? []).map((b: any) => {
    // Calculate actual spending for this budget
    const budgetExpenses = (monthlyTransactions ?? [])
      .filter((t: any) => t?.type === 'EXPENSE' && t?.categoryId === b.categoryId)
      .reduce((sum: number, t: any) => sum + (t?.amount ?? 0), 0);
    return {
      id: b?.id ?? '', name: b?.name ?? '', amount: b?.amount ?? 0,
      spent: budgetExpenses, color: b?.color ?? '#10B981',
      categoryName: b?.category?.name ?? b?.name ?? '',
      startDate: b?.startDate?.toISOString?.() ?? '',
      endDate: b?.endDate?.toISOString?.() ?? '',
    };
  });

  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

  return (
    <DashboardClient
      totalBalance={totalBalance}
      totalCreditCardUsed={totalCreditCardUsed}
      netBalance={netBalance}
      monthlyIncome={monthlyIncome}
      monthlyExpense={monthlyExpense}
      prevMonthIncome={prevMonthIncome}
      prevMonthExpense={prevMonthExpense}
      accounts={serializedAccounts}
      creditCards={serializedCreditCards}
      recentTransactions={serializedTransactions}
      categoryBreakdown={categoryBreakdown}
      last7Days={last7Days}
      balanceTrend={balanceTrend}
      budgets={serializedBudgets}
      cashFlow={{
        monthName: `${months[now.getMonth()]} ${now.getFullYear()}`,
        totalIncome: monthlyIncome,
        totalExpense: monthlyExpense,
        txCountIncome,
        txCountExpense,
        daysInMonth,
        avgDailyIncome: daysInMonth > 0 ? monthlyIncome / now.getDate() : 0,
        avgDailyExpense: daysInMonth > 0 ? monthlyExpense / now.getDate() : 0,
        avgTxIncome: txCountIncome > 0 ? monthlyIncome / txCountIncome : 0,
        avgTxExpense: txCountExpense > 0 ? monthlyExpense / txCountExpense : 0,
      }}
    />
  );
}
