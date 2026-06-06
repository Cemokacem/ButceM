export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return new Response(JSON.stringify({ error: 'Dosya gerekli' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64String = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';
    const isImage = mimeType.startsWith('image/');
    const isPdf = mimeType === 'application/pdf';

    if (!isImage && !isPdf) {
      return new Response(JSON.stringify({ error: 'Sadece resim ve PDF dosyaları destekleniyor' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const prompt = `Bu bir fatura, fiş veya makbuz görüntüsüdür. Lütfen aşağıdaki bilgileri çıkar:

JSON formatında yanıt ver:
{
  "amount": 0,
  "description": "Ürün/hizmet açıklaması",
  "date": "YYYY-MM-DD",
  "vendorName": "Satıcı/mağaza adı (ör: BİM, A101, Migros, Shell)",
  "category": "Belge kategorisi (ör: Market, Restoran, Akaryakıt, Fatura, Giyim, Teknoloji)",
  "documentNo": "Fiş/fatura numarası (varsa)",
  "items": ["kalem1", "kalem2"],
  "lineItems": [
    { "description": "Kalem adı/açıklaması", "amount": 100.00, "category": "Alt kategori (ör: Gıda, Kozmetik, İçecek, Temizlik, Yakıt, Diğer)" },
    { "description": "Diğer kalem", "amount": 50.00, "category": "Alt kategori" }
  ]
}

ÖNEMLİ:
- vendorName: Belgede yazan satıcı/mağaza/firma adını yaz (ürün adı değil).
- category: Belgenin genel kategorisi (Market, Restoran, Akaryakıt vb.)
- documentNo: Fiş veya fatura numarası (varsa)
- lineItems: Belgede birden fazla kalem/ürün varsa her birini ayrı listele. Her kalemin kendi alt kategorisi olsun.
- amount: Tüm kalemlerin toplamı
Sadece JSON olarak yanıt ver.`;

    let messages: any[] = [];
    if (isImage) {
      messages = [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64String}` } },
        ],
      }];
    } else {
      messages = [{
        role: 'user',
        content: [
          { type: 'file', file: { filename: file.name, file_data: `data:application/pdf;base64,${base64String}` } },
          { type: 'text', text: prompt },
        ],
      }];
    }

    const apiKey = process.env.ABACUSAI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API anahtarı yapılandırılmamış' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const llmResponse = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages,
        stream: true,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!llmResponse.ok) {
      const errText = await llmResponse.text().catch(() => 'Bilinmeyen hata');
      return new Response(JSON.stringify({ error: `LLM API hatası: ${errText}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const reader = llmResponse.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: 'Yanıt okunamıyor' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    function extractJson(text: string): string {
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      return match ? match[1].trim() : text.trim();
    }

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        let partialRead = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            partialRead += decoder.decode(value, { stream: true });
            const lines = partialRead.split('\n');
            partialRead = lines.pop() ?? '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  const jsonText = extractJson(buffer);
                  try {
                    const finalResult = JSON.parse(jsonText);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'completed', result: finalResult })}\n\n`));
                  } catch {
                    // Buffer couldn't be parsed — return it as description so user can still create a transaction
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'completed', result: { amount: 0, description: jsonText || buffer, date: '', vendorName: '', category: 'Diğer', items: [], lineItems: [] } })}\n\n`));
                  }
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  buffer += parsed?.choices?.[0]?.delta?.content ?? '';
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'processing', message: 'Belge analiz ediliyor...' })}\n\n`));
                } catch {
                  // skip malformed SSE chunk
                }
              }
            }
          }
          // Stream ended without [DONE] — parse whatever we accumulated
          if (buffer) {
            const jsonText = extractJson(buffer);
            try {
              const finalResult = JSON.parse(jsonText);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'completed', result: finalResult })}\n\n`));
            } catch {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'completed', result: { amount: 0, description: jsonText || buffer, date: '', vendorName: '', category: 'Diğer', items: [], lineItems: [] } })}\n\n`));
            }
          } else {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: 'Belgeden bilgi çıkarılamadı' })}\n\n`));
          }
        } catch (error: any) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'error', message: error?.message ?? 'Bilinmeyen hata' })}\n\n`));
        } finally {
          reader.cancel().catch(() => {});
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('OCR error:', error);
    return new Response(JSON.stringify({ error: 'OCR işlemi başarısız' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
