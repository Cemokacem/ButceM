'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CrudDialog } from '@/components/crud-dialog';
import { DeleteConfirm } from '@/components/delete-confirm';
import { FormField } from '@/components/form-field';
import { FadeIn, SlideIn } from '@/components/ui/animate';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/format';
import { Plus, Trash2, CreditCard, CheckCircle2, ChevronUp } from 'lucide-react';

interface InstForm {
  description: string;
  totalAmount: string;
  installmentCount: string;
  startDate: string;
  accountId: string;
}

const emptyForm: InstForm = { description: '', totalAmount: '', installmentCount: '', startDate: '', accountId: '' };

export default function TaksitlerPage() {
  const [items, setItems] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<InstForm>({ ...emptyForm });
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => { setCurrentDate(new Date().toISOString().split('T')[0] ?? ''); }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [instRes, accRes] = await Promise.all([
        fetch('/api/installments'),
        fetch('/api/accounts'),
      ]);
      const instData = await instRes.json();
      const accData = await accRes.json();
      setItems(instData ?? []);
      setAccounts((accData ?? []).filter((a: any) => a?.type === 'CREDIT_CARD'));
    } catch {
      toast.error('Yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.description || !form.totalAmount || !form.installmentCount || !form.accountId) {
      toast.error('Tüm zorunlu alanları doldurun');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/installments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, startDate: form.startDate || currentDate }),
      });
      if (!res.ok) throw new Error();
      toast.success('Taksit eklendi');
      setDialogOpen(false);
      setForm({ ...emptyForm });
      load();
    } catch {
      toast.error('Hata');
    } finally {
      setSaving(false);
    }
  };

  const handlePayInstallment = async (id: string, currentPaid: number) => {
    try {
      const res = await fetch('/api/installments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, paidCount: currentPaid + 1 }),
      });
      if (!res.ok) throw new Error();
      toast.success('Taksit ödendi');
      load();
    } catch {
      toast.error('Hata');
    }
  };

  const handleDelete = async () => {
    try {
      await fetch(`/api/installments?id=${deleteId}`, { method: 'DELETE' });
      toast.success('Silindi');
      setDeleteOpen(false);
      load();
    } catch {
      toast.error('Silinemedi');
    }
  };

  const active = (items ?? []).filter((i: any) => i?.status === 'ACTIVE');
  const completed = (items ?? []).filter((i: any) => i?.status === 'COMPLETED');
  const totalRemaining = active.reduce((sum: number, inst: any) => {
    return sum + ((inst?.installmentCount ?? 0) - (inst?.paidCount ?? 0)) * (inst?.monthlyAmount ?? 0);
  }, 0);

  const monthlyTotal = active.reduce((sum: number, inst: any) => sum + (inst?.monthlyAmount ?? 0), 0);

  return (
    <div className="space-y-4">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">Taksitler</h1>
            <p className="text-sm text-muted-foreground">Kredi kartı taksitlerinizi takip edin</p>
          </div>
          <Button onClick={() => { setForm({ ...emptyForm, startDate: currentDate }); setDialogOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            <Plus size={16} className="mr-1" /> Yeni Taksit
          </Button>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="bg-gradient-to-r from-pink-500 to-pink-600 text-white">
          <CardContent className="p-4">
            <p className="text-sm opacity-80">Kalan Taksit Toplamı</p>
            <p className="text-2xl font-bold font-mono">{formatCurrency(totalRemaining)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <p className="text-sm opacity-80">Aylık Taksit Toplamı</p>
            <p className="text-2xl font-bold font-mono">{formatCurrency(monthlyTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Active */}
      <div className="space-y-3">
        {loading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Yükleniyor...</CardContent></Card>
        ) : active.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            <CreditCard size={32} className="mx-auto mb-2 opacity-40" />
            <p>Aktif taksit yok</p>
          </CardContent></Card>
        ) : (
          active.map((inst: any, i: number) => {
            const paid = inst?.paidCount ?? 0;
            const total = inst?.installmentCount ?? 1;
            const progress = Math.round((paid / total) * 100);
            const remaining = (total - paid) * (inst?.monthlyAmount ?? 0);

            return (
              <SlideIn key={inst?.id} from="bottom" delay={i * 0.05}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium">{inst?.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {inst?.account?.name} · Başlangıç: {formatDate(inst?.startDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono">{formatCurrency(inst?.monthlyAmount)}/ay</p>
                        <p className="text-xs text-muted-foreground">Toplam: {formatCurrency(inst?.totalAmount)}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>{paid}/{total} taksit ödendi</span>
                        <span>Kalan: {formatCurrency(remaining)}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handlePayInstallment(inst?.id ?? '', paid)}>
                        <CheckCircle2 size={14} className="mr-1" /> Taksit Öde
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setDeleteId(inst?.id ?? ''); setDeleteOpen(true); }}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </SlideIn>
            );
          })
        )}
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Tamamlanan Taksitler</h3>
          {completed.map((inst: any) => (
            <Card key={inst?.id} className="opacity-60">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span className="text-sm">{inst?.description}</span>
                </div>
                <span className="text-sm font-mono">{formatCurrency(inst?.totalAmount)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CrudDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setForm({ ...emptyForm }); }}
        title="Yeni Taksit" onSave={handleSave} saving={saving}>
        <FormField label="Açıklama" required value={form.description} onChange={(e: any) => setForm({ ...form, description: e?.target?.value ?? '' })} placeholder="Örn: Telefon taksidi" />
        <FormField label="Toplam Tutar (₺)" required type="number" value={form.totalAmount} onChange={(e: any) => setForm({ ...form, totalAmount: e?.target?.value ?? '' })} />
        <FormField label="Taksit Sayısı" required type="number" value={form.installmentCount} onChange={(e: any) => setForm({ ...form, installmentCount: e?.target?.value ?? '' })} />
        {form.totalAmount && form.installmentCount && parseInt(form.installmentCount) > 0 && (
          <p className="text-sm text-muted-foreground">Aylık taksit: {formatCurrency(parseFloat(form.totalAmount) / parseInt(form.installmentCount))}</p>
        )}
        <FormField label="Başlangıç Tarihi" required type="date" value={form.startDate || currentDate} onChange={(e: any) => setForm({ ...form, startDate: e?.target?.value ?? '' })} />
        <FormField label="Kredi Kartı" required>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.accountId} onChange={(e: any) => setForm({ ...form, accountId: e?.target?.value ?? '' })}>
            <option value="">Seçiniz</option>
            {(accounts ?? []).map((a: any) => <option key={a?.id} value={a?.id}>{a?.name}</option>)}
          </select>
          {(accounts ?? []).length === 0 && <p className="text-xs text-muted-foreground mt-1">Önce bir kredi kartı hesabı ekleyin</p>}
        </FormField>
      </CrudDialog>

      <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} />
    </div>
  );
}
