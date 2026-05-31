export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const subs = await prisma.subscription.findMany({
      orderBy: { nextPayDate: 'asc' },
      include: { category: true, account: true },
    });
    return NextResponse.json(subs);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Hata' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const startDate = new Date(body.startDate);
    let nextPayDate = new Date(startDate);
    if (body.frequency === 'YEARLY') {
      nextPayDate.setFullYear(nextPayDate.getFullYear() + 1);
    } else {
      nextPayDate.setMonth(nextPayDate.getMonth() + 1);
    }
    const sub = await prisma.subscription.create({
      data: {
        name: body.name,
        amount: parseFloat(body.amount) || 0,
        frequency: body.frequency ?? 'MONTHLY',
        categoryId: body.categoryId || null,
        accountId: body.accountId,
        startDate,
        nextPayDate,
        color: body.color ?? '#F59E0B',
        notes: body.notes ?? null,
      },
    });
    return NextResponse.json(sub);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Hata' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const sub = await prisma.subscription.update({
      where: { id: body.id },
      data: {
        name: body.name,
        amount: body.amount !== undefined ? parseFloat(body.amount) : undefined,
        frequency: body.frequency,
        categoryId: body.categoryId || null,
        accountId: body.accountId,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        nextPayDate: body.nextPayDate ? new Date(body.nextPayDate) : undefined,
        color: body.color,
        isActive: body.isActive,
        notes: body.notes,
      },
    });
    return NextResponse.json(sub);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Hata' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });
    await prisma.subscription.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Hata' }, { status: 500 });
  }
}
