export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const debts = await prisma.debtCredit.findMany({
      orderBy: { createdAt: 'desc' },
      include: { payments: { orderBy: { date: 'desc' } } },
    });
    return NextResponse.json(debts);
  } catch (error: any) {
    console.error('Debt GET error:', error);
    return NextResponse.json({ error: 'Borç/alacaklar yüklenemedi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, personName, amount, description, dueDate } = body ?? {};
    if (!type || !personName || !amount) return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 });

    const debt = await prisma.debtCredit.create({
      data: {
        type,
        personName,
        amount: parseFloat(amount),
        remainingAmount: parseFloat(amount),
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });
    return NextResponse.json(debt, { status: 201 });
  } catch (error: any) {
    console.error('Debt POST error:', error);
    return NextResponse.json({ error: 'Borç/alacak eklenemedi' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, personName, amount, description, dueDate, status } = body ?? {};
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });

    const data: any = {};
    if (personName) data.personName = personName;
    if (amount) { data.amount = parseFloat(amount); data.remainingAmount = parseFloat(amount); }
    if (description !== undefined) data.description = description || null;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (status) data.status = status;

    const debt = await prisma.debtCredit.update({ where: { id }, data });
    return NextResponse.json(debt);
  } catch (error: any) {
    console.error('Debt PUT error:', error);
    return NextResponse.json({ error: 'Borç/alacak güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });

    await prisma.debtCredit.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Debt DELETE error:', error);
    return NextResponse.json({ error: 'Borç/alacak silinemedi' }, { status: 500 });
  }
}
