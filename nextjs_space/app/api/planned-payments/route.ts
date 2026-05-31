export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const payments = await prisma.plannedPayment.findMany({
      orderBy: { dueDate: 'asc' },
      include: { category: true, account: true },
    });
    return NextResponse.json(payments);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Hata' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payment = await prisma.plannedPayment.create({
      data: {
        description: body.description,
        amount: parseFloat(body.amount) || 0,
        type: body.type ?? 'EXPENSE',
        categoryId: body.categoryId || null,
        accountId: body.accountId,
        dueDate: new Date(body.dueDate),
        isRecurring: body.isRecurring ?? false,
        frequency: body.frequency ?? null,
        notes: body.notes ?? null,
      },
    });
    return NextResponse.json(payment);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Hata' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const payment = await prisma.plannedPayment.update({
      where: { id: body.id },
      data: {
        description: body.description,
        amount: body.amount !== undefined ? parseFloat(body.amount) : undefined,
        type: body.type,
        categoryId: body.categoryId || null,
        accountId: body.accountId,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        isRecurring: body.isRecurring,
        frequency: body.frequency,
        isPaid: body.isPaid,
        notes: body.notes,
      },
    });
    return NextResponse.json(payment);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Hata' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });
    await prisma.plannedPayment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Hata' }, { status: 500 });
  }
}
