export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, date, accountId, vendorId, vendorName, notes, lines, groupLabel, documentNo } = body ?? {};

    if (!type || !date || !accountId || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 });
    }

    // Satıcı bul veya oluştur
    let resolvedVendorId = vendorId || null;
    if (!resolvedVendorId && vendorName && vendorName.trim()) {
      const trimmedName = vendorName.trim();
      // Mevcut satıcıyı ara (case-insensitive)
      const existingVendor = await prisma.vendor.findFirst({
        where: { name: { equals: trimmedName, mode: 'insensitive' } },
      });
      if (existingVendor) {
        resolvedVendorId = existingVendor.id;
      } else {
        // Yeni satıcı oluştur
        const newVendor = await prisma.vendor.create({
          data: { name: trimmedName },
        });
        resolvedVendorId = newVendor.id;
      }
    }

    const groupId = randomUUID();
    const results = [];
    let totalBalanceChange = 0;

    for (const line of lines) {
      const amount = parseFloat(line.amount);
      if (!amount || amount <= 0) continue;

      const transaction = await prisma.transaction.create({
        data: {
          type,
          amount,
          description: line.description || 'Diğer',
          date: new Date(date),
          categoryId: line.categoryId || null,
          accountId,
          vendorId: resolvedVendorId,
          groupId,
          groupLabel: groupLabel || null,
          documentNo: documentNo || null,
          notes: notes || null,
        },
        include: { category: true, account: true, vendor: true },
      });

      results.push(transaction);
      totalBalanceChange += type === 'INCOME' ? amount : -amount;
    }

    // Update account balance once for all lines
    if (totalBalanceChange !== 0) {
      await prisma.account.update({
        where: { id: accountId },
        data: { balance: { increment: totalBalanceChange } },
      });
    }

    return NextResponse.json({ transactions: results, count: results.length, groupId }, { status: 201 });
  } catch (error: any) {
    console.error('Batch transaction POST error:', error);
    return NextResponse.json({ error: 'İşlemler eklenemedi' }, { status: 500 });
  }
}

// UPDATE group-level fields
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupId, vendorName, date, accountId, groupLabel, documentNo } = body ?? {};

    if (!groupId) return NextResponse.json({ error: 'groupId gerekli' }, { status: 400 });

    const txs = await prisma.transaction.findMany({ where: { groupId } });
    if (txs.length === 0) return NextResponse.json({ error: 'Grup bulunamadı' }, { status: 404 });

    // Resolve vendor
    let resolvedVendorId: string | null = null;
    if (vendorName && vendorName.trim()) {
      const trimmedName = vendorName.trim();
      const existingVendor = await prisma.vendor.findFirst({
        where: { name: { equals: trimmedName, mode: 'insensitive' } },
      });
      if (existingVendor) {
        resolvedVendorId = existingVendor.id;
      } else {
        const newVendor = await prisma.vendor.create({ data: { name: trimmedName } });
        resolvedVendorId = newVendor.id;
      }
    }

    // Build update data
    const updateData: any = {};
    if (resolvedVendorId !== null) updateData.vendorId = resolvedVendorId;
    if (date) updateData.date = new Date(date);
    if (groupLabel !== undefined) updateData.groupLabel = groupLabel || null;
    if (documentNo !== undefined) updateData.documentNo = documentNo || null;

    // Handle account change (balance adjustments)
    if (accountId && accountId !== txs[0].accountId) {
      const totalAmount = txs.reduce((sum, tx) => {
        return sum + (tx.type === 'INCOME' ? tx.amount : -tx.amount);
      }, 0);
      // Reverse from old account
      await prisma.account.update({
        where: { id: txs[0].accountId },
        data: { balance: { increment: -totalAmount } },
      });
      // Apply to new account
      await prisma.account.update({
        where: { id: accountId },
        data: { balance: { increment: totalAmount } },
      });
      updateData.accountId = accountId;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.transaction.updateMany({
        where: { groupId },
        data: updateData,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Batch PUT error:', error);
    return NextResponse.json({ error: 'Grup güncellenemedi' }, { status: 500 });
  }
}

// DELETE a whole group
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const groupId = url.searchParams.get('groupId');
    if (!groupId) return NextResponse.json({ error: 'groupId gerekli' }, { status: 400 });

    const txs = await prisma.transaction.findMany({ where: { groupId } });
    if (txs.length === 0) return NextResponse.json({ error: 'Grup bulunamadı' }, { status: 404 });

    // Reverse balances by account
    const balanceChanges: Record<string, number> = {};
    for (const tx of txs) {
      const change = tx.type === 'INCOME' ? -tx.amount : tx.amount;
      balanceChanges[tx.accountId] = (balanceChanges[tx.accountId] ?? 0) + change;
    }

    for (const [accId, change] of Object.entries(balanceChanges)) {
      await prisma.account.update({ where: { id: accId }, data: { balance: { increment: change } } });
    }

    await prisma.transaction.deleteMany({ where: { groupId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Batch DELETE error:', error);
    return NextResponse.json({ error: 'Grup silinemedi' }, { status: 500 });
  }
}
