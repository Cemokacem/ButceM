export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const categoryId = url.searchParams.get('categoryId');
    const accountId = url.searchParams.get('accountId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const limit = parseInt(url.searchParams.get('limit') ?? '50');

    const where: any = {};
    if (type) where.type = type;
    if (categoryId) where.categoryId = categoryId;
    if (accountId) where.accountId = accountId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate + 'T23:59:59');
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { category: true, account: true, vendor: true },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({ transactions, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error: any) {
    console.error('Transaction GET error:', error);
    return NextResponse.json({ error: 'İşlemler yüklenemedi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, amount, description, date, categoryId, accountId, vendorId, documentId, notes } = body ?? {};

    if (!type || !amount || !description || !date || !accountId) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 });
    }

    const transaction = await prisma.transaction.create({
      data: {
        type,
        amount: parseFloat(amount),
        description,
        date: new Date(date),
        categoryId: categoryId || null,
        accountId,
        vendorId: vendorId || null,
        documentId: documentId || null,
        notes: notes || null,
      },
      include: { category: true, account: true },
    });

    // Update account balance
    const balanceChange = type === 'INCOME' ? parseFloat(amount) : -parseFloat(amount);
    await prisma.account.update({
      where: { id: accountId },
      data: { balance: { increment: balanceChange } },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error: any) {
    console.error('Transaction POST error:', error);
    return NextResponse.json({ error: 'İşlem eklenemedi' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, type, amount, description, date, categoryId, accountId, vendorId, notes, groupLabel, documentNo } = body ?? {};

    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });

    // Get old transaction to reverse balance
    const oldTx = await prisma.transaction.findUnique({ where: { id } });
    if (!oldTx) return NextResponse.json({ error: 'İşlem bulunamadı' }, { status: 404 });

    // Reverse old balance
    const oldChange = oldTx.type === 'INCOME' ? -oldTx.amount : oldTx.amount;
    await prisma.account.update({
      where: { id: oldTx.accountId },
      data: { balance: { increment: oldChange } },
    });

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        type: type ?? oldTx.type,
        amount: amount ? parseFloat(amount) : oldTx.amount,
        description: description ?? oldTx.description,
        date: date ? new Date(date) : oldTx.date,
        categoryId: categoryId !== undefined ? (categoryId || null) : oldTx.categoryId,
        accountId: accountId ?? oldTx.accountId,
        vendorId: vendorId !== undefined ? (vendorId || null) : oldTx.vendorId,
        notes: notes !== undefined ? (notes || null) : oldTx.notes,
        groupLabel: groupLabel !== undefined ? (groupLabel || null) : oldTx.groupLabel,
        documentNo: documentNo !== undefined ? (documentNo || null) : oldTx.documentNo,
      },
      include: { category: true, account: true },
    });

    // Apply new balance
    const newChange = transaction.type === 'INCOME' ? transaction.amount : -transaction.amount;
    await prisma.account.update({
      where: { id: transaction.accountId },
      data: { balance: { increment: newChange } },
    });

    return NextResponse.json(transaction);
  } catch (error: any) {
    console.error('Transaction PUT error:', error);
    return NextResponse.json({ error: 'İşlem güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });

    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx) return NextResponse.json({ error: 'İşlem bulunamadı' }, { status: 404 });

    // Reverse balance
    const reverseChange = tx.type === 'INCOME' ? -tx.amount : tx.amount;
    await prisma.account.update({
      where: { id: tx.accountId },
      data: { balance: { increment: reverseChange } },
    });

    await prisma.transaction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Transaction DELETE error:', error);
    return NextResponse.json({ error: 'İşlem silinemedi' }, { status: 500 });
  }
}
