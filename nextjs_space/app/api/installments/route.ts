export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const installments = await prisma.installment.findMany({
      orderBy: { createdAt: 'desc' },
      include: { account: true, vendor: true },
    });
    return NextResponse.json(installments);
  } catch (error: any) {
    console.error('Installment GET error:', error);
    return NextResponse.json({ error: 'Taksitler yüklenemedi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, totalAmount, installmentCount, startDate, accountId, vendorId } = body ?? {};
    if (!description || !totalAmount || !installmentCount || !startDate || !accountId) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 });
    }

    const total = parseFloat(totalAmount);
    const count = parseInt(installmentCount);
    const monthly = total / count;

    const installment = await prisma.installment.create({
      data: {
        description,
        totalAmount: total,
        installmentCount: count,
        monthlyAmount: monthly,
        startDate: new Date(startDate),
        accountId,
        vendorId: vendorId || null,
      },
      include: { account: true },
    });
    return NextResponse.json(installment, { status: 201 });
  } catch (error: any) {
    console.error('Installment POST error:', error);
    return NextResponse.json({ error: 'Taksit eklenemedi' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, paidCount, status } = body ?? {};
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });

    const data: any = {};
    if (paidCount !== undefined) data.paidCount = parseInt(paidCount);
    if (status) data.status = status;

    const installment = await prisma.installment.update({ where: { id }, data, include: { account: true } });

    // Auto-complete if all paid
    if ((installment?.paidCount ?? 0) >= (installment?.installmentCount ?? 1)) {
      await prisma.installment.update({ where: { id }, data: { status: 'COMPLETED' } });
    }

    return NextResponse.json(installment);
  } catch (error: any) {
    console.error('Installment PUT error:', error);
    return NextResponse.json({ error: 'Taksit güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });

    await prisma.installment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Installment DELETE error:', error);
    return NextResponse.json({ error: 'Taksit silinemedi' }, { status: 500 });
  }
}
