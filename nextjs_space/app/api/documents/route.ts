export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const documents = await prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      include: { transactions: true },
    });
    return NextResponse.json(documents);
  } catch (error: any) {
    console.error('Document GET error:', error);
    return NextResponse.json({ error: 'Belgeler yüklenemedi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, fileType, cloudStoragePath, isPublic } = body ?? {};
    if (!fileName || !fileType || !cloudStoragePath) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 });
    }

    const document = await prisma.document.create({
      data: {
        fileName,
        fileType,
        cloudStoragePath: cloudStoragePath,
        isPublic: isPublic ?? false,
      },
    });
    return NextResponse.json(document, { status: 201 });
  } catch (error: any) {
    console.error('Document POST error:', error);
    return NextResponse.json({ error: 'Belge kaydedilemedi' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });

    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Document DELETE error:', error);
    return NextResponse.json({ error: 'Belge silinemedi' }, { status: 500 });
  }
}
