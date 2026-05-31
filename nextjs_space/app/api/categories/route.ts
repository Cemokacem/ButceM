export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json(categories);
  } catch (error: any) {
    console.error('Category GET error:', error);
    return NextResponse.json({ error: 'Kategoriler yüklenemedi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, icon, color } = body ?? {};
    if (!name || !type) return NextResponse.json({ error: 'Ad ve tür zorunlu' }, { status: 400 });

    const category = await prisma.category.create({
      data: { name, type, icon: icon ?? 'tag', color: color ?? '#6366F1' },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    console.error('Category POST error:', error);
    return NextResponse.json({ error: 'Kategori eklenemedi' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, type, icon, color } = body ?? {};
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });

    const category = await prisma.category.update({
      where: { id },
      data: { ...(name && { name }), ...(type && { type }), ...(icon && { icon }), ...(color && { color }) },
    });
    return NextResponse.json(category);
  } catch (error: any) {
    console.error('Category PUT error:', error);
    return NextResponse.json({ error: 'Kategori güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });

    // Check if category has transactions
    const count = await prisma.transaction.count({ where: { categoryId: id } });
    if (count > 0) {
      return NextResponse.json({ error: 'Bu kategoriye ait işlemler var, silinemez' }, { status: 400 });
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Category DELETE error:', error);
    return NextResponse.json({ error: 'Kategori silinemedi' }, { status: 500 });
  }
}
