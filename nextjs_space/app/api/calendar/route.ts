export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()));
    const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth()));

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    const transactions = await prisma.transaction.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      include: { category: true, account: true },
      orderBy: { date: 'desc' },
    });

    const plannedPayments = await prisma.plannedPayment.findMany({
      where: { dueDate: { gte: startDate, lte: endDate } },
      include: { category: true, account: true },
    });

    return NextResponse.json({ transactions, plannedPayments });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Hata' }, { status: 500 });
  }
}
