export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { debtCreditId, amount, date, note } = body ?? {};
    if (!debtCreditId || !amount) return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 });

    const debt = await prisma.debtCredit.findUnique({ where: { id: debtCreditId } });
    if (!debt) return NextResponse.json({ error: 'Borç/alacak bulunamadı' }, { status: 404 });

    const payment = await prisma.debtPayment.create({
      data: {
        debtCreditId,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        note: note || null,
      },
    });

    const newRemaining = Math.max(0, debt.remainingAmount - parseFloat(amount));
    await prisma.debtCredit.update({
      where: { id: debtCreditId },
      data: {
        remainingAmount: newRemaining,
        status: newRemaining <= 0 ? 'PAID' : 'ACTIVE',
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    console.error('Payment POST error:', error);
    return NextResponse.json({ error: 'Ödeme eklenemedi' }, { status: 500 });
  }
}
