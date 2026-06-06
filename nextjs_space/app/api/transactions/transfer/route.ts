export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromAccountId, toAccountId, amount, description, date, notes } = body ?? {};

    if (!fromAccountId || !toAccountId || !amount || !date) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 });
    }

    if (fromAccountId === toAccountId) {
      return NextResponse.json({ error: 'Kaynak ve hedef hesap aynı olamaz' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (parsedAmount <= 0) {
      return NextResponse.json({ error: 'Tutar sıfırdan büyük olmalı' }, { status: 400 });
    }

    const groupId = randomUUID();
    const txDate = new Date(date);

    // Kaynak hesap bilgisi
    const fromAccount = await prisma.account.findUnique({ where: { id: fromAccountId } });
    const toAccount = await prisma.account.findUnique({ where: { id: toAccountId } });

    if (!fromAccount || !toAccount) {
      return NextResponse.json({ error: 'Hesap bulunamadı' }, { status: 404 });
    }

    const descText = description || `${fromAccount.name} → ${toAccount.name}`;

    // Çıkış işlemi (kaynaktan)
    const outTx = await prisma.transaction.create({
      data: {
        type: 'TRANSFER',
        amount: parsedAmount,
        description: descText,
        date: txDate,
        accountId: fromAccountId,
        groupId,
        groupLabel: 'Transfer',
        notes: notes || null,
      },
    });

    // Giriş işlemi (hedefe)
    const inTx = await prisma.transaction.create({
      data: {
        type: 'TRANSFER',
        amount: parsedAmount,
        description: descText,
        date: txDate,
        accountId: toAccountId,
        groupId,
        groupLabel: 'Transfer',
        notes: notes || null,
      },
    });

    // Bakiyeleri güncelle
    await prisma.account.update({
      where: { id: fromAccountId },
      data: { balance: { decrement: parsedAmount } },
    });

    await prisma.account.update({
      where: { id: toAccountId },
      data: { balance: { increment: parsedAmount } },
    });

    return NextResponse.json({ outTx, inTx, groupId }, { status: 201 });
  } catch (error: any) {
    console.error('Transfer POST error:', error);
    return NextResponse.json({ error: 'Transfer kaydedilemedi' }, { status: 500 });
  }
}
