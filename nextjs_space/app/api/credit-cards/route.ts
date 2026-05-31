export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const cards = await prisma.creditCard.findMany({
      orderBy: { name: 'asc' },
      include: { account: true },
    });
    return NextResponse.json(cards);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Hata' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const card = await prisma.creditCard.create({
      data: {
        name: body.name,
        cardNumber: body.cardNumber ?? null,
        cardNetwork: body.cardNetwork ?? 'VISA',
        cardTier: body.cardTier ?? 'NORMAL',
        limitAmount: parseFloat(body.limitAmount) || 0,
        usedAmount: parseFloat(body.usedAmount) || 0,
        interestRate: parseFloat(body.interestRate) || 0,
        billingDay: parseInt(body.billingDay) || 1,
        paymentDay: parseInt(body.paymentDay) || 10,
        autoPayment: body.autoPayment ?? false,
        accountId: body.accountId,
        color: body.color ?? '#3B82F6',
      },
    });
    return NextResponse.json(card);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Hata' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const card = await prisma.creditCard.update({
      where: { id: body.id },
      data: {
        name: body.name,
        cardNumber: body.cardNumber,
        cardNetwork: body.cardNetwork,
        cardTier: body.cardTier,
        limitAmount: body.limitAmount !== undefined ? parseFloat(body.limitAmount) : undefined,
        usedAmount: body.usedAmount !== undefined ? parseFloat(body.usedAmount) : undefined,
        interestRate: body.interestRate !== undefined ? parseFloat(body.interestRate) : undefined,
        billingDay: body.billingDay !== undefined ? parseInt(body.billingDay) : undefined,
        paymentDay: body.paymentDay !== undefined ? parseInt(body.paymentDay) : undefined,
        autoPayment: body.autoPayment,
        accountId: body.accountId,
        color: body.color,
        isActive: body.isActive,
      },
    });
    return NextResponse.json(card);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Hata' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });
    await prisma.creditCard.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Hata' }, { status: 500 });
  }
}
