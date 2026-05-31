'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CrudDialog } from '@/components/crud-dialog';
import { FormField } from '@/components/form-field';
import { FadeIn } from '@/components/ui/animate';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  Upload, FileText, Image as ImageIcon, Loader2, CheckCircle2,
  AlertCircle, Eye, Trash2, ArrowRight
} from 'lucide-react';

interface OcrResult {
  amount: number;
  description: string;
  date: string;
  vendorName: string;
  category: string;
  items: string[];
}

export default function BelgelerPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [editResult, setEditResult] = useState<OcrResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/documents');
      const data = await res.json();
      setDocuments(data ?? []);
    } catch {
      toast.error('Belgeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e?.target?.files?.[0];
    if (!file) return;

    const isImage = file.type?.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) {
      toast.error('Sadece resim ve PDF dosyaları destekleniyor');
      return;
    }

    setUploading(true);
    setProcessing(false);
    setProgress(0);
    setOcrResult(null);

    try {
      // Step 1: Get presigned URL
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, isPublic: false }),
      });
      if (!presignedRes.ok) throw new Error('Yükleme URL\'si alınamadı');
      const { uploadUrl, cloud_storage_path } = await presignedRes.json();

      // Step 2: Upload to S3
      const uploadHeaders: Record<string, string> = { 'Content-Type': file.type };
      // Check if Content-Disposition is in signed headers
      const urlObj = new URL(uploadUrl);
      const signedHeaders = urlObj.searchParams.get('X-Amz-SignedHeaders') ?? '';
      if (signedHeaders.includes('content-disposition')) {
        uploadHeaders['Content-Disposition'] = 'attachment';
      }

      const uploadRes = await fetch(uploadUrl, { method: 'PUT', headers: uploadHeaders, body: file });
      if (!uploadRes.ok) throw new Error('Dosya yüklenemedi');

      // Step 3: Save document record
      const docRes = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: isImage ? 'IMAGE' : 'PDF',
          cloudStoragePath: cloud_storage_path,
          isPublic: false,
        }),
      });
      if (!docRes.ok) throw new Error('Belge kaydedilemedi');

      toast.success('Dosya yüklendi');
      setUploading(false);

      // Step 4: OCR
      setProcessing(true);
      setProgress(5);

      const formData = new FormData();
      formData.append('file', file);

      const ocrRes = await fetch('/api/documents/ocr', { method: 'POST', body: formData });
      if (!ocrRes.ok) throw new Error('OCR başlatılamadı');

      const reader = ocrRes.body?.getReader();
      if (!reader) throw new Error('Yanıt okunamıyor');

      const decoder = new TextDecoder();
      let partialRead = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        partialRead += decoder.decode(value, { stream: true });
        let lines = partialRead.split('\n');
        partialRead = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed?.status === 'processing') {
                setProgress((prev: number) => Math.min(prev + 3, 95));
              } else if (parsed?.status === 'completed') {
                const result = parsed?.result as OcrResult;
                setOcrResult(result);
                setEditResult({ ...(result ?? { amount: 0, description: '', date: '', vendorName: '', category: 'Diğer', items: [] }) });
                setProgress(100);
                setProcessing(false);
                setResultOpen(true);
                toast.success('Belge analiz edildi');
              } else if (parsed?.status === 'error') {
                throw new Error(parsed?.message ?? 'OCR hatası');
              }
            } catch (parseErr: any) {
              // Skip invalid JSON
            }
          }
        }
      }

      load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? 'Hata oluştu');
      setUploading(false);
      setProcessing(false);
    }

    // Reset file input
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleCreateTransaction = () => {
    if (!editResult) return;
    // Navigate to transactions with pre-filled data via URL params
    const params = new URLSearchParams();
    params.set('new', 'true');
    params.set('description', editResult?.description ?? '');
    params.set('amount', String(editResult?.amount ?? 0));
    if (editResult?.date) params.set('date', editResult.date);
    window.location.href = `/islemler?${params.toString()}`;
  };

  return (
    <div className="space-y-4">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">Belgeler</h1>
            <p className="text-sm text-muted-foreground">Fatura ve fiş görüntülerinizi yükleyin, otomatik analiz edin</p>
          </div>
        </div>
      </FadeIn>

      {/* Upload Area */}
      <FadeIn delay={0.1}>
        <Card>
          <CardContent className="p-6">
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-emerald-500/50 transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click?.()}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
              {uploading ? (
                <div className="space-y-2">
                  <Loader2 size={32} className="mx-auto animate-spin text-emerald-500" />
                  <p className="text-sm">Dosya yükleniyor...</p>
                </div>
              ) : processing ? (
                <div className="space-y-3">
                  <Loader2 size={32} className="mx-auto animate-spin text-blue-500" />
                  <p className="text-sm font-medium">Belge analiz ediliyor...</p>
                  <Progress value={progress} className="h-2 max-w-xs mx-auto" />
                  <p className="text-xs text-muted-foreground">OCR ile bilgiler çıkarılıyor</p>
                </div>
              ) : (
                <>
                  <Upload size={32} className="mx-auto mb-2 text-muted-foreground" />
                  <p className="font-medium">Fatura veya fiş yükleyin</p>
                  <p className="text-sm text-muted-foreground mt-1">JPG, PNG veya PDF dosyaları sürükleyin veya tıklayın</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* OCR Result Dialog */}
      <CrudDialog
        open={resultOpen}
        onClose={() => setResultOpen(false)}
        title="Belge Analiz Sonucu"
        onSave={handleCreateTransaction}
        saveLabel="İşlem Oluştur"
      >
        {editResult && (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                <CheckCircle2 size={16} />
                Belge başarıyla analiz edildi
              </div>
            </div>
            <FormField label="Tutar (₺)" type="number" value={String(editResult?.amount ?? 0)}
              onChange={(e: any) => setEditResult({ ...(editResult ?? {} as OcrResult), amount: parseFloat(e?.target?.value ?? '0') })} />
            <FormField label="Açıklama" value={editResult?.description ?? ''}
              onChange={(e: any) => setEditResult({ ...(editResult ?? {} as OcrResult), description: e?.target?.value ?? '' })} />
            <FormField label="Tarih" type="date" value={editResult?.date ?? ''}
              onChange={(e: any) => setEditResult({ ...(editResult ?? {} as OcrResult), date: e?.target?.value ?? '' })} />
            <FormField label="Satıcı" value={editResult?.vendorName ?? ''}
              onChange={(e: any) => setEditResult({ ...(editResult ?? {} as OcrResult), vendorName: e?.target?.value ?? '' })} />
            <FormField label="Kategori Önerisi" value={editResult?.category ?? ''}
              onChange={(e: any) => setEditResult({ ...(editResult ?? {} as OcrResult), category: e?.target?.value ?? '' })} />
            {(editResult?.items ?? []).length > 0 && (
              <div>
                <p className="text-sm font-medium mb-1">Tespit Edilen Kalemler:</p>
                <div className="flex flex-wrap gap-1">
                  {(editResult?.items ?? []).map((item: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">{item}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CrudDialog>

      {/* Document List */}
      <FadeIn delay={0.2}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Yüklenen Belgeler</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">Yükleniyor...</div>
            ) : (documents ?? []).length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FileText size={32} className="mx-auto mb-2 opacity-40" />
                <p>Henüz belge yok</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {(documents ?? []).map((doc: any) => (
                  <div key={doc?.id} className="flex items-center justify-between py-3 px-2">
                    <div className="flex items-center gap-3">
                      {doc?.fileType === 'IMAGE' ? (
                        <ImageIcon size={16} className="text-blue-500" />
                      ) : (
                        <FileText size={16} className="text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium truncate max-w-[200px] sm:max-w-none">{doc?.fileName}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(doc?.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={doc?.status === 'PROCESSED' ? 'default' : doc?.status === 'FAILED' ? 'destructive' : 'secondary'} className="text-xs">
                        {doc?.status === 'PROCESSED' ? 'İşlendi' : doc?.status === 'FAILED' ? 'Başarısız' : 'Bekliyor'}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => {
                        try {
                          await fetch(`/api/documents?id=${doc?.id}`, { method: 'DELETE' });
                          toast.success('Belge silindi');
                          load();
                        } catch { toast.error('Silinemedi'); }
                      }}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
