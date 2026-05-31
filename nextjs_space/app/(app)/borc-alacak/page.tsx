'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CrudDialog } from '@/components/crud-dialog';
import { DeleteConfirm } from '@/components/delete-confirm';
import { FormField } from '@/components/form-field';
import { FadeIn, SlideIn } from '@/components/ui/animate';
import { toast } from 'sonner';
import { formatCurrency, formatDate, formatDateInput } from '@/lib/format';
import { Plus, Trash2, HandCoins, ArrowUpRight, ArrowDownRight, CheckCircle2, Clock, Banknote } from 'lucide-react';

interface DebtForm {
  id?: string;
  type: string;
  personName: string;
  amount: string;
  description: string;
  dueDate: string;
}

interface PaymentForm {
  debtCreditId: string;
  amount: string;
  date: string;
  note: string;
}

const emptyDebt: DebtForm = { type: 'DEBT', personName: '', amount: '', description: '', dueDate: '' };
const emptyPayment: PaymentForm = { debtCreditId: '', amount: '', date: '', note: '' };

export default function BorcAlacakPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<DebtForm>({ ...emptyDebt });
  const [payForm, setPayForm] = useState<PaymentForm>({ ...emptyPayment });
  const [tab, setTab] = useState<'DEBT' | 'CREDIT'>('DEBT');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => { setCurrentDate(new Date().toISOString().split('T')[0] ?? ''); }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/debts');
      const data = await res.json();
      setItems(data ?? []);
    } catch {
      toast.error('Yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.personName || !form.amount) { toast.error('Kişi ve tutar zorunlu'); return; }
    setSaving(true);
    try {
      const method = form.id ? 'PUT' : 'POST';
      const res = await fetch('/api/debts', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success(form.id ? 'Güncellendi' : 'Eklendi');
      setDialogOpen(false);
      setForm({ ...emptyDebt });
      load();
    } catch {
      toast.error('Hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handlePayment = async () => {
    if (!payForm.amount) { toast.error('Tutar zorunlu'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/debts/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payForm, date: payForm.date || currentDate }),
      });
      if (!res.ok) throw new Error();
      toast.success('Ödeme kaydedildi');
      setPaymentOpen(false);
      setPayForm({ ...emptyPayment });
      load();
    } catch {
      toast.error('Hata');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await fetch(`/api/debts?id=${deleteId}`, { method: 'DELETE' });
      toast.success('Silindi');
      setDeleteOpen(false);
      load();
    } catch {
      toast.error('Silinemedi');
    }
  };

  const filtered = (items ?? []).filter((d: any) => d?.type === tab);
  const totalActive = filtered.filter((d: any) => d?.status === 'ACTIVE').reduce((sum: number, d: any) => sum + (d?.remainingAmount ?? 0), 0);

  return (
    <div className="space-y-4">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">Borç / Alacak</h1>
            <p className="text-sm text-muted-foreground">Borç ve alacak takibiniz</p>
          </div>
          <Button onClick={() => { setForm({ ...emptyDebt, type: tab }); setDialogOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            <Plus size={16} className="mr-1" /> Yeni Kayıt
          </Button>
        </div>
      </FadeIn>

      <div className="flex gap-2">
        <Button variant={tab === 'DEBT' ? 'default' : 'outline'} size="sm" onClick={() => setTab('DEBT')}
          className={tab === 'DEBT' ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}>Borçlar</Button>
        <Button variant={tab === 'CREDIT' ? 'default' : 'outline'} size="sm" onClick={() => setTab('CREDIT')}
          className={tab === 'CREDIT' ? 'bg-purple-500 hover:bg-purple-600 text-white' : ''}>Alacaklar</Button>
      </div>

      <Card className={tab === 'DEBT' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'}>
        <CardContent className="p-4">
          <p className="text-sm opacity-80">Aktif {tab === 'DEBT' ? 'Borç' : 'Alacak'} Toplamı</p>
          <p className="text-2xl font-bold font-mono">{formatCurrency(totalActive)}</p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {loading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Yükleniyor...</CardContent></Card>
        ) : (filtered ?? []).length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            <HandCoins size={32} className="mx-auto mb-2 opacity-40" />
            <p>Henüz kayıt yok</p>
          </CardContent></Card>
        ) : (
          (filtered ?? []).map((d: any, i: number) => (
            <SlideIn key={d?.id} from="bottom" delay={i * 0.05}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{d?.personName}</p>
                        <Badge variant={d?.status === 'PAID' ? 'default' : d?.status === 'OVERDUE' ? 'destructive' : 'secondary'} className="text-xs">
                          {d?.status === 'PAID' ? 'Ödendi' : d?.status === 'OVERDUE' ? 'Gecikmiş' : 'Aktif'}
                        </Badge>
                      </div>
                      {d?.description && <p className="text-sm text-muted-foreground mt-1">{d.description}</p>}
                      {d?.dueDate && <p className="text-xs text-muted-foreground mt-1">Vade: {formatDate(d.dueDate)}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Toplam: {formatCurrency(d?.amount)}</p>
                      <p className={`text-lg font-bold font-mono ${(d?.remainingAmount ?? 0) > 0 ? (tab === 'DEBT' ? 'text-orange-500' : 'text-purple-500') : 'text-emerald-500'}`}>
                        Kalan: {formatCurrency(d?.remainingAmount)}
                      </p>
                    </div>
                  </div>

                  {/* Payments */}
                  {(d?.payments ?? []).length > 0 && (
                    <div className="mt-3 border-t border-border pt-2 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Ödemeler:</p>
                      {(d?.payments ?? []).map((p: any) => (
                        <div key={p?.id} className="flex justify-between text-xs">
                          <span>{formatDate(p?.date)} {p?.note ? `- ${p.note}` : ''}</span>
                          <span className="font-mono text-emerald-500">{formatCurrency(p?.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    {d?.status === 'ACTIVE' && (
                      <Button size="sm" variant="outline" onClick={() => {
                        setPayForm({ debtCreditId: d?.id ?? '', amount: '', date: currentDate, note: '' });
                        setPaymentOpen(true);
                      }}>
                        <Banknote size={14} className="mr-1" /> Ödeme Yap
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setDeleteId(d?.id ?? ''); setDeleteOpen(true); }}>
                      <Trash2 size={14} className="mr-1" /> Sil
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </SlideIn>
          ))
        )}
      </div>

      <CrudDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setForm({ ...emptyDebt }); }}
        title={`Yeni ${form.type === 'DEBT' ? 'Borç' : 'Alacak'}`} onSave={handleSave} saving={saving}>
        <div className="flex gap-2">
          <Button variant={form.type === 'DEBT' ? 'default' : 'outline'} size="sm" onClick={() => setForm({ ...form, type: 'DEBT' })}
            className={form.type === 'DEBT' ? 'bg-orange-500 text-white' : ''}>Borç</Button>
          <Button variant={form.type === 'CREDIT' ? 'default' : 'outline'} size="sm" onClick={() => setForm({ ...form, type: 'CREDIT' })}
            className={form.type === 'CREDIT' ? 'bg-purple-500 text-white' : ''}>Alacak</Button>
        </div>
        <FormField label="Kişi Adı" required value={form.personName} onChange={(e: any) => setForm({ ...form, personName: e?.target?.value ?? '' })} placeholder="Borçlu/alacaklı kişi" />
        <FormField label="Tutar (₺)" required type="number" value={form.amount} onChange={(e: any) => setForm({ ...form, amount: e?.target?.value ?? '' })} />
        <FormField label="Açıklama" value={form.description} onChange={(e: any) => setForm({ ...form, description: e?.target?.value ?? '' })} />
        <FormField label="Vade Tarihi" type="date" value={form.dueDate} onChange={(e: any) => setForm({ ...form, dueDate: e?.target?.value ?? '' })} />
      </CrudDialog>

      <CrudDialog open={paymentOpen} onClose={() => { setPaymentOpen(false); setPayForm({ ...emptyPayment }); }}
        title="Ödeme Kaydet" onSave={handlePayment} saving={saving} saveLabel="Ödemeyi Kaydet">
        <FormField label="Tutar (₺)" required type="number" value={payForm.amount} onChange={(e: any) => setPayForm({ ...payForm, amount: e?.target?.value ?? '' })} />
        <FormField label="Tarih" type="date" value={payForm.date || currentDate} onChange={(e: any) => setPayForm({ ...payForm, date: e?.target?.value ?? '' })} />
        <FormField label="Not" value={payForm.note} onChange={(e: any) => setPayForm({ ...payForm, note: e?.target?.value ?? '' })} />
      </CrudDialog>

      <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} />
    </div>
  );
}
