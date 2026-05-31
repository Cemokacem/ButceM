export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, date, accountId, vendorId, notes, lines } = body ?? {};

    if (!type || !date || !accountId || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 });
    }

    const results = [];
    let totalBalanceChange = 0;

    for (const line of lines) {
      const amount = parseFloat(line.amount);
      if (!amount || amount <= 0) continue;

      const transaction = await prisma.transaction.create({
        data: {
          type,
          amount,
          description: line.description || 'Diğer',
          date: new Date(date),
          categoryId: line.categoryId || null,
          accountId,
          vendorId: vendorId || null,
          notes: notes || null,
        },
        include: { category: true, account: true },
      });

      results.push(transaction);
      totalBalanceChange += type === 'INCOME' ? amount : -amount;
    }

    // Update account balance once for all lines
    if (totalBalanceChange !== 0) {
      await prisma.account.update({
        where: { id: accountId },
        data: { balance: { increment: totalBalanceChange } },
      });
    }

    return NextResponse.json({ transactions: results, count: results.length }, { status: 201 });
  } catch (error: any) {
    console.error('Batch transaction POST error:', error);
    return NextResponse.json({ error: 'İşlemler eklenemedi' }, { status: 500 });
  }
}
