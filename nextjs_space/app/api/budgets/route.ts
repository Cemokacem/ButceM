export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const budgets = await prisma.budget.findMany({
      orderBy: { startDate: 'desc' },
      include: { category: true },
    });
    // Calculate spent for each budget based on transactions in that period/category
    const enriched = await Promise.all(
      budgets.map(async (b: any) => {
        const where: any = {
          type: 'EXPENSE',
          date: { gte: b.startDate, lte: b.endDate },
        };
        if (b.categoryId) where.categoryId = b.categoryId;
        const agg = await prisma.transaction.aggregate({
          where,
          _sum: { amount: true },
        });
        return { ...b, spent: agg._sum.amount ?? 0 };
      })
    );
    return NextResponse.json(enriched);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Hata' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const budget = await prisma.budget.create({
      data: {
        name: body.name,
        amount: parseFloat(body.amount) || 0,
        period: body.period ?? 'MONTHLY',
        categoryId: body.categoryId || null,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        color: body.color ?? '#10B981',
      },
    });
    return NextResponse.json(budget);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Hata' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const budget = await prisma.budget.update({
      where: { id: body.id },
      data: {
        name: body.name,
        amount: body.amount !== undefined ? parseFloat(body.amount) : undefined,
        period: body.period,
        categoryId: body.categoryId || null,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        color: body.color,
        isActive: body.isActive,
      },
    });
    return NextResponse.json(budget);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Hata' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });
    await prisma.budget.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Hata' }, { status: 500 });
  }
}
