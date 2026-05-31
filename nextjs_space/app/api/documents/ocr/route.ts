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
  "vendorName": "Satıcı/mağaza adı",
  "category": "Genel kategori önerisi",
  "items": ["kalem1", "kalem2"],
  "lineItems": [
    { "description": "Kalem adı/açıklaması", "amount": 100.00, "category": "Kategori önerisi (Market, Yemek, Ulaşım, Sağlık, Eğitim, Giyim, Teknoloji, Ev, Fatura, Diğer)" },
    { "description": "Diğer kalem", "amount": 50.00, "category": "Kategori" }
  ]
}

ÖNEMLİ: Belgede birden fazla kalem/ürün varsa, her birini ayrı ayrı lineItems içinde listele. Her kalemin kendi tutarı ve açıklaması olsun. amount tüm kalemlerin toplamı olsun.
Sadece JSON olarak yanıt ver, başka hiçbir şey ekleme. Eğer bilgi bulunamazsa ilgili alanı boş bırak veya 0 yap.`;

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

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        let partialRead = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            partialRead += decoder.decode(value, { stream: true });
            let lines = partialRead.split('\n');
            partialRead = lines.pop() ?? '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  try {
                    const finalResult = JSON.parse(buffer);
                    const finalData = JSON.stringify({ status: 'completed', result: finalResult });
                    controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
                  } catch {
                    const finalData = JSON.stringify({ status: 'completed', result: { amount: 0, description: buffer, date: '', vendorName: '', category: 'Diğer', items: [] } });
                    controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
                  }
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  buffer += parsed?.choices?.[0]?.delta?.content ?? '';
                  const progressData = JSON.stringify({ status: 'processing', message: 'Belge analiz ediliyor...' });
                  controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
                } catch {
                  // skip
                }
              }
            }
          }
          // If we didn't get [DONE], try to parse what we have
          if (buffer) {
            try {
              const finalResult = JSON.parse(buffer);
              const finalData = JSON.stringify({ status: 'completed', result: finalResult });
              controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
            } catch {
              const finalData = JSON.stringify({ status: 'error', message: 'Belge ayrıştırılamadı' });
              controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
            }
          }
        } catch (error: any) {
          console.error('Stream error:', error);
          const errData = JSON.stringify({ status: 'error', message: error?.message ?? 'Bilinmeyen hata' });
          controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
        } finally {
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
