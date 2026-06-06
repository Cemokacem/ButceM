export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, date, accountId, vendorId, vendorName, notes, lines } = body ?? {};

    if (!type || !date || !accountId || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 });
    }

    const groupId = randomUUID();
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
          groupId,
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

    return NextResponse.json({ transactions: results, count: results.length, groupId }, { status: 201 });
  } catch (error: any) {
    console.error('Batch transaction POST error:', error);
    return NextResponse.json({ error: 'İşlemler eklenemedi' }, { status: 500 });
  }
}

// DELETE a whole group
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const groupId = url.searchParams.get('groupId');
    if (!groupId) return NextResponse.json({ error: 'groupId gerekli' }, { status: 400 });

    const txs = await prisma.transaction.findMany({ where: { groupId } });
    if (txs.length === 0) return NextResponse.json({ error: 'Grup bulunamadı' }, { status: 404 });

    // Reverse balances by account
    const balanceChanges: Record<string, number> = {};
    for (const tx of txs) {
      const change = tx.type === 'INCOME' ? -tx.amount : tx.amount;
      balanceChanges[tx.accountId] = (balanceChanges[tx.accountId] ?? 0) + change;
    }

    for (const [accId, change] of Object.entries(balanceChanges)) {
      await prisma.account.update({ where: { id: accId }, data: { balance: { increment: change } } });
    }

    await prisma.transaction.deleteMany({ where: { groupId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Batch DELETE error:', error);
    return NextResponse.json({ error: 'Grup silinemedi' }, { status: 500 });
  }
}