export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const [accounts, categories, transactions, debts, installments, vendors] = await Promise.all([
      prisma.account.findMany(),
      prisma.category.findMany(),
      prisma.transaction.findMany({ include: { category: true, account: true } }),
      prisma.debtCredit.findMany({ include: { payments: true } }),
      prisma.installment.findMany({ include: { account: true } }),
      prisma.vendor.findMany(),
    ]);

    const exportData = { accounts, categories, transactions, debts, installments, vendors, exportDate: new Date().toISOString() };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="butcem-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Veri dışa aktarılamadı' }, { status: 500 });
  }
}
