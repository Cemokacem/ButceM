export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const vendors = await prisma.vendor.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { transactions: true, installments: true } },
      },
    });
    return NextResponse.json(vendors);
  } catch (error: any) {
    console.error('Vendor GET error:', error);
    return NextResponse.json({ error: 'Satıcılar yüklenemedi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, email, address, balance, notes } = body ?? {};
    if (!name) return NextResponse.json({ error: 'Ad zorunlu' }, { status: 400 });

    const vendor = await prisma.vendor.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        balance: balance ? parseFloat(balance) : 0,
        notes: notes || null,
      },
    });
    return NextResponse.json(vendor, { status: 201 });
  } catch (error: any) {
    console.error('Vendor POST error:', error);
    return NextResponse.json({ error: 'Satıcı eklenemedi' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, phone, email, address, balance, notes } = body ?? {};
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone || null;
    if (email !== undefined) data.email = email || null;
    if (address !== undefined) data.address = address || null;
    if (balance !== undefined) data.balance = parseFloat(balance);
    if (notes !== undefined) data.notes = notes || null;

    const vendor = await prisma.vendor.update({ where: { id }, data });
    return NextResponse.json(vendor);
  } catch (error: any) {
    console.error('Vendor PUT error:', error);
    return NextResponse.json({ error: 'Satıcı güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });

    await prisma.vendor.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Vendor DELETE error:', error);
    return NextResponse.json({ error: 'Satıcı silinemedi' }, { status: 500 });
  }
}
