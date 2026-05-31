'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CrudDialog } from '@/components/crud-dialog';
import { DeleteConfirm } from '@/components/delete-confirm';
import { FormField } from '@/components/form-field';
import { FadeIn, SlideIn } from '@/components/ui/animate';
import { toast } from 'sonner';
import { formatCurrency, getAccountTypeLabel } from '@/lib/format';
import { Plus, Pencil, Trash2, Wallet, Building2, CreditCard, Banknote } from 'lucide-react';

const ACCOUNT_TYPES = [
  { value: 'BANK', label: 'Banka', icon: Building2 },
  { value: 'CASH', label: 'Nakit', icon: Banknote },
  { value: 'OTHER', label: 'Diğer', icon: Wallet },
];

const CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'];
const COLORS = ['#10B981', '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

interface AccForm {
  id?: string;
  name: string;
  type: string;
  balance: string;
  currency: string;
  bankName: string;
  color: string;
}

const emptyForm: AccForm = { name: '', type: 'BANK', balance: '0', currency: 'TRY', bankName: '', color: '#10B981' };

export default function HesaplarPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AccForm>({ ...emptyForm });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/accounts');
      const data = await res.json();
      setAccounts((data ?? []).filter((a: any) => a?.type !== 'CREDIT_CARD'));
    } catch {
      toast.error('Hesaplar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name || !form.type) { toast.error('Ad ve tür zorunlu'); return; }
    setSaving(true);
    try {
      const method = form.id ? 'PUT' : 'POST';
      const res = await fetch('/api/accounts', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { const err = await res.json(); throw new Error(err?.error); }
      toast.success(form.id ? 'Hesap güncellendi' : 'Hesap eklendi');
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
      const res = await fetch(`/api/accounts?id=${deleteId}`, { method: 'DELETE' });
      if (!res.ok) { const err = await res.json(); throw new Error(err?.error); }
      toast.success('Hesap silindi');
      setDeleteOpen(false);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Silinemedi');
    }
  };

  const getIcon = (type: string) => {
    const found = ACCOUNT_TYPES.find((a: any) => a?.value === type);
    return found?.icon ?? Wallet;
  };

  const totalBalance = (accounts ?? []).filter((a: any) => a?.isActive).reduce((sum: number, a: any) => sum + (a?.balance ?? 0), 0);

  const getCurrencySymbol = (c: string) => {
    const map: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€', GBP: '£' };
    return map[c] ?? c;
  };

  return (
    <div className="space-y-4">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">Hesaplar</h1>
            <p className="text-sm text-muted-foreground">Banka ve nakit hesaplarınız</p>
          </div>
          <Button onClick={() => { setForm({ ...emptyForm }); setDialogOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            <Plus size={16} className="mr-1" /> Yeni Hesap
          </Button>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
          <CardContent className="p-4">
            <p className="text-sm opacity-80">Toplam Bakiye</p>
            <p className="text-2xl font-bold font-mono">{formatCurrency(totalBalance)}</p>
          </CardContent>
        </Card>
      </FadeIn>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i: number) => (
            <Card key={i}><CardContent className="p-4"><div className="h-20 bg-muted/50 rounded animate-pulse" /></CardContent></Card>
          ))
        ) : (accounts ?? []).length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <Wallet size={32} className="mx-auto mb-2 opacity-40" />
            <p>Henüz hesap yok</p>
          </div>
        ) : (
          (accounts ?? []).map((a: any, i: number) => {
            const Icon = getIcon(a?.type);
            return (
              <SlideIn key={a?.id} from="bottom" delay={i * 0.05}>
                <Card className={`hover:shadow-md transition-shadow ${!a?.isActive ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${a?.color ?? '#10B981'}20` }}>
                          <Icon size={20} style={{ color: a?.color ?? '#10B981' }} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{a?.name}</p>
                          <p className="text-xs text-muted-foreground">{getAccountTypeLabel(a?.type)}</p>
                          {a?.bankName && <p className="text-xs text-muted-foreground">{a.bankName}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          setForm({ id: a?.id, name: a?.name ?? '', type: a?.type ?? 'BANK', balance: String(a?.balance ?? 0), currency: a?.currency ?? 'TRY', bankName: a?.bankName ?? '', color: a?.color ?? '#10B981' });
                          setDialogOpen(true);
                        }}>
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeleteId(a?.id ?? ''); setDeleteOpen(true); }}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <p className={`text-lg font-bold font-mono ${(a?.balance ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {formatCurrency(a?.balance)}
                      </p>
                      {a?.currency !== 'TRY' && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">{getCurrencySymbol(a?.currency)} {a?.currency}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </SlideIn>
            );
          })
        )}
      </div>

      <CrudDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setForm({ ...emptyForm }); }} title={form.id ? 'Hesap Düzenle' : 'Yeni Hesap'} onSave={handleSave} saving={saving}>
        <FormField label="Hesap Adı" required value={form.name} onChange={(e: any) => setForm({ ...form, name: e?.target?.value ?? '' })} placeholder="Örn: Ziraat Vadesiz" />
        <FormField label="Hesap Türü" required>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.type} onChange={(e: any) => setForm({ ...form, type: e?.target?.value ?? 'BANK' })}>
            {ACCOUNT_TYPES.map((t: any) => <option key={t?.value} value={t?.value}>{t?.label}</option>)}
          </select>
        </FormField>
        {form.type === 'BANK' && (
          <FormField label="Banka Adı" value={form.bankName} onChange={(e: any) => setForm({ ...form, bankName: e?.target?.value ?? '' })} placeholder="Örn: Ziraat Bankası" />
        )}
        <FormField label="Para Birimi">
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.currency} onChange={(e: any) => setForm({ ...form, currency: e?.target?.value ?? 'TRY' })}>
            {CURRENCIES.map((c: string) => <option key={c} value={c}>{c} ({getCurrencySymbol(c)})</option>)}
          </select>
        </FormField>
        <FormField label="Başlangıç Bakiye (₺)" type="number" value={form.balance} onChange={(e: any) => setForm({ ...form, balance: e?.target?.value ?? '0' })} />
        <FormField label="Renk">
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((color: string) => (
              <button key={color} className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === color ? 'border-foreground scale-110' : 'border-transparent'}`}
                style={{ backgroundColor: color }} onClick={() => setForm({ ...form, color })} />
            ))}
          </div>
        </FormField>
      </CrudDialog>

      <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete}
        description="Bu hesaba ait işlemler varsa silinemez." />
    </div>
  );
}
