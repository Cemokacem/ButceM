export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { TransactionsClient } from './transactions-client';

export default async function IslemlerPage() {
  const [categories, accounts, vendors] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.account.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.vendor.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <TransactionsClient
      categories={(categories ?? []).map((c: any) => ({ id: c?.id ?? '', name: c?.name ?? '', type: c?.type ?? '', color: c?.color ?? '#6366F1' }))}
      accounts={(accounts ?? []).map((a: any) => ({ id: a?.id ?? '', name: a?.name ?? '', type: a?.type ?? '' }))}
      vendors={(vendors ?? []).map((v: any) => ({ id: v?.id ?? '', name: v?.name ?? '' }))}
    />
  );
}
