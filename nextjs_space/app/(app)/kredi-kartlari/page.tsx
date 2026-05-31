'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CrudDialog } from '@/components/crud-dialog';
import { DeleteConfirm } from '@/components/delete-confirm';
import { FormField } from '@/components/form-field';
import { FadeIn, SlideIn } from '@/components/ui/animate';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import { Plus, Pencil, Trash2, CreditCard, Shield, Sparkles } from 'lucide-react';

const CARD_NETWORKS = [
  { value: 'VISA', label: 'Visa' },
  { value: 'MASTERCARD', label: 'Mastercard' },
  { value: 'TROY', label: 'Troy' },
  { value: 'OTHER', label: 'Diğer' },
];

const CARD_TIERS = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'GOLD', label: 'Gold' },
  { value: 'PLATINUM', label: 'Platinum' },
  { value: 'PREMIUM', label: 'Premium' },
];

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);
const COLORS = ['#3B82F6', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

interface CardForm {
  id?: string;
  name: string;
  cardNumber: string;
  cardNetwork: string;
  cardTier: string;
  limitAmount: string;
  usedAmount: string;
  interestRate: string;
  billingDay: string;
  paymentDay: string;
  autoPayment: boolean;
  accountId: string;
  color: string;
}

const emptyForm: CardForm = {
  name: '', cardNumber: '', cardNetwork: 'VISA', cardTier: 'NORMAL',
  limitAmount: '0', usedAmount: '0', interestRate: '0',
  billingDay: '1', paymentDay: '10', autoPayment: false,
  accountId: '', color: '#3B82F6',
};

export default function KrediKartlariPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CardForm>({ ...emptyForm });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [cardsRes, accRes] = await Promise.all([
        fetch('/api/credit-cards'),
        fetch('/api/accounts'),
      ]);
      const cardsData = await cardsRes.json();
      const accData = await accRes.json();
      setCards(cardsData ?? []);
      setAccounts((accData ?? []).filter((a: any) => a?.type === 'BANK'));
    } catch {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name) { toast.error('Kart adı zorunlu'); return; }
    if (!form.accountId) { toast.error('İlişkili hesap seçin'); return; }
    setSaving(true);
    try {
      const method = form.id ? 'PUT' : 'POST';
      const res = await fetch('/api/credit-cards', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { const err = await res.json(); throw new Error(err?.error); }
      toast.success(form.id ? 'Kart güncellendi' : 'Kart eklendi');
      setDialogOpen(false);
      setForm({ ...emptyForm });
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Hata');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/credit-cards?id=${deleteId}`, { method: 'DELETE' });
      if (!res.ok) { const err = await res.json(); throw new Error(err?.error); }
      toast.success('Kart silindi');
      setDeleteOpen(false);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Silinemedi');
    }
  };

  const getTierIcon = (t: string) => {
    if (t === 'PREMIUM' || t === 'PLATINUM') return Sparkles;
    if (t === 'GOLD') return Shield;
    return CreditCard;
  };

  const now = new Date();
  const currentBillingPeriod = (card: any) => {
    const bd = card?.billingDay ?? 1;
    const start = new Date(now.getFullYear(), now.getMonth(), bd);
    if (now < start) start.setMonth(start.getMonth() - 1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setDate(end.getDate() - 1);
    return `${start.toLocaleDateString('tr-TR')} - ${end.toLocaleDateString('tr-TR')}`;
  };

  return (
    <div className="space-y-4">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">Kredi Kartları</h1>
            <p className="text-sm text-muted-foreground">Kredi kartlarınızı yönetin</p>
          </div>
          <Button onClick={() => { setForm({ ...emptyForm, accountId: accounts[0]?.id ?? '' }); setDialogOpen(true); }} className="bg-blue-500 hover:bg-blue-600 text-white">
            <Plus size={16} className="mr-1" /> Yeni Kart
          </Button>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><div className="h-32 bg-muted/50 rounded animate-pulse" /></CardContent></Card>
          ))
        ) : cards.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <CreditCard size={32} className="mx-auto mb-2 opacity-40" />
            <p>Henüz kredi kartı eklenmedi</p>
          </div>
        ) : (
          cards.map((c: any, i: number) => {
            const TierIcon = getTierIcon(c?.cardTier);
            const usedPct = c?.limitAmount > 0 ? Math.min(100, ((c?.usedAmount ?? 0) / c.limitAmount) * 100) : 0;
            return (
              <SlideIn key={c?.id} from="bottom" delay={i * 0.05}>
                <Card className="overflow-hidden">
                  <div className="p-4 text-white" style={{ background: `linear-gradient(135deg, ${c?.color ?? '#3B82F6'}, ${c?.color ?? '#3B82F6'}cc)` }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-lg">{c?.name}</p>
                        <p className="text-sm opacity-80">
                          {CARD_NETWORKS.find((n: any) => n.value === c?.cardNetwork)?.label} • {CARD_TIERS.find((t: any) => t.value === c?.cardTier)?.label}
                        </p>
                      </div>
                      <TierIcon size={24} className="opacity-80" />
                    </div>
                    {c?.cardNumber && (
                      <p className="mt-3 font-mono text-sm tracking-widest opacity-90">•••• •••• •••• {c.cardNumber}</p>
                    )}
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Kullanım</span>
                        <span className="font-medium">{formatCurrency(c?.usedAmount)} / {formatCurrency(c?.limitAmount)}</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${usedPct}%`, backgroundColor: usedPct > 80 ? '#EF4444' : usedPct > 50 ? '#F59E0B' : '#10B981' }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Kullanılabilir: {formatCurrency((c?.limitAmount ?? 0) - (c?.usedAmount ?? 0))}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-xs text-muted-foreground">Faiz Oranı</p>
                        <p className="font-medium">%{c?.interestRate ?? 0}</p>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-xs text-muted-foreground">İlişkili Hesap</p>
                        <p className="font-medium truncate">{c?.account?.name ?? '-'}</p>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-xs text-muted-foreground">Hesap Kesim</p>
                        <p className="font-medium">Her ayın {c?.billingDay}. günü</p>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <p className="text-xs text-muted-foreground">Ödeme Günü</p>
                        <p className="font-medium">Her ayın {c?.paymentDay}. günü</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Periyot: {currentBillingPeriod(c)}</span>
                      {c?.autoPayment && <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded">Otomatik ödeme</span>}
                    </div>
                    <div className="flex justify-end gap-1 pt-1 border-t">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setForm({
                          id: c.id, name: c.name, cardNumber: c.cardNumber ?? '', cardNetwork: c.cardNetwork,
                          cardTier: c.cardTier, limitAmount: String(c.limitAmount), usedAmount: String(c.usedAmount),
                          interestRate: String(c.interestRate), billingDay: String(c.billingDay),
                          paymentDay: String(c.paymentDay), autoPayment: c.autoPayment,
                          accountId: c.accountId, color: c.color,
                        });
                        setDialogOpen(true);
                      }}>
                        <Pencil size={14} className="mr-1" /> Düzenle
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => { setDeleteId(c?.id ?? ''); setDeleteOpen(true); }}>
                        <Trash2 size={14} className="mr-1" /> Sil
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </SlideIn>
            );
          })
        )}
      </div>

      <CrudDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setForm({ ...emptyForm }); }} title={form.id ? 'Kredi Kartını Düzenle' : 'Yeni Kredi Kartı'} onSave={handleSave} saving={saving}>
        <FormField label="İsim" required value={form.name} onChange={(e: any) => setForm({ ...form, name: e?.target?.value ?? '' })} placeholder="Kredi kartı" />
        <FormField label="İlişkili Hesap" required>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.accountId} onChange={(e: any) => setForm({ ...form, accountId: e?.target?.value ?? '' })}>
            <option value="">Hesap seçin</option>
            {accounts.map((a: any) => <option key={a?.id} value={a?.id}>{a?.name}</option>)}
          </select>
        </FormField>
        <FormField label="Kart Numarası (Son 4 hane)" value={form.cardNumber} onChange={(e: any) => setForm({ ...form, cardNumber: (e?.target?.value ?? '').slice(0, 4) })} placeholder="1234" />
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Limit">
            <input type="number" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.limitAmount} onChange={(e: any) => setForm({ ...form, limitAmount: e?.target?.value ?? '0' })} />
          </FormField>
          <FormField label="Faiz Oranı (%)">
            <input type="number" step="0.01" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.interestRate} onChange={(e: any) => setForm({ ...form, interestRate: e?.target?.value ?? '0' })} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Kart Ağı">
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.cardNetwork} onChange={(e: any) => setForm({ ...form, cardNetwork: e?.target?.value ?? 'VISA' })}>
              {CARD_NETWORKS.map((n: any) => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
          </FormField>
          <FormField label="Kart Türü">
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.cardTier} onChange={(e: any) => setForm({ ...form, cardTier: e?.target?.value ?? 'NORMAL' })}>
              {CARD_TIERS.map((t: any) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Başlangıç Günü">
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.billingDay} onChange={(e: any) => setForm({ ...form, billingDay: e?.target?.value ?? '1' })}>
              {DAYS.map((d: number) => <option key={d} value={d}>{d}</option>)}
            </select>
          </FormField>
          <FormField label="Ödeme Günü">
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.paymentDay} onChange={(e: any) => setForm({ ...form, paymentDay: e?.target?.value ?? '10' })}>
              {DAYS.map((d: number) => <option key={d} value={d}>{d}</option>)}
            </select>
          </FormField>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="autoPayment" checked={form.autoPayment} onChange={(e: any) => setForm({ ...form, autoPayment: e?.target?.checked ?? false })} className="rounded" />
          <label htmlFor="autoPayment" className="text-sm">Otomatik ödemeleri etkinleştir</label>
        </div>
        <FormField label="Renk">
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((color: string) => (
              <button key={color} className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === color ? 'border-foreground scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: color }} onClick={() => setForm({ ...form, color })} />
            ))}
          </div>
        </FormField>
      </CrudDialog>

      <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} />
    </div>
  );
}
