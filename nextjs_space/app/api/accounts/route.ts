export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const accounts = await prisma.account.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json(accounts);
  } catch (error: any) {
    console.error('Account GET error:', error);
    return NextResponse.json({ error: 'Hesaplar yüklenemedi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, balance, currency, bankName, color, icon } = body ?? {};
    if (!name || !type) return NextResponse.json({ error: 'Ad ve tür zorunlu' }, { status: 400 });

    const account = await prisma.account.create({
      data: {
        name,
        type,
        balance: balance ? parseFloat(balance) : 0,
        currency: currency ?? 'TRY',
        bankName: bankName ?? null,
        color: color ?? '#10B981',
        icon: icon ?? 'wallet',
      },
    });
    return NextResponse.json(account, { status: 201 });
  } catch (error: any) {
    console.error('Account POST error:', error);
    return NextResponse.json({ error: 'Hesap eklenemedi' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, type, balance, currency, color, icon, isActive } = body ?? {};
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (type !== undefined) data.type = type;
    if (balance !== undefined) data.balance = parseFloat(balance);
    if (currency !== undefined) data.currency = currency;
    if (body?.bankName !== undefined) data.bankName = body.bankName;
    if (color !== undefined) data.color = color;
    if (icon !== undefined) data.icon = icon;
    if (isActive !== undefined) data.isActive = isActive;

    const account = await prisma.account.update({ where: { id }, data });
    return NextResponse.json(account);
  } catch (error: any) {
    console.error('Account PUT error:', error);
    return NextResponse.json({ error: 'Hesap güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });

    const count = await prisma.transaction.count({ where: { accountId: id } });
    if (count > 0) {
      return NextResponse.json({ error: 'Bu hesaba ait işlemler var, silinemez' }, { status: 400 });
    }

    await prisma.account.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Account DELETE error:', error);
    return NextResponse.json({ error: 'Hesap silinemedi' }, { status: 500 });
  }
}
