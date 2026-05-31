'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CrudDialog } from '@/components/crud-dialog';
import { DeleteConfirm } from '@/components/delete-confirm';
import { FormField } from '@/components/form-field';
import { FadeIn } from '@/components/ui/animate';
import { toast } from 'sonner';
import { formatCurrency, formatDate, formatDateInput, getTransactionTypeLabel } from '@/lib/format';
import {
  Plus, Search, ArrowUpRight, ArrowDownRight, Pencil, Trash2, Filter,
  ArrowLeftRight
} from 'lucide-react';

interface Props {
  categories: Array<{ id: string; name: string; type: string; color: string }>;
  accounts: Array<{ id: string; name: string; type: string }>;
  vendors: Array<{ id: string; name: string }>;
}

interface TxForm {
  id?: string;
  type: string;
  amount: string;
  description: string;
  date: string;
  categoryId: string;
  accountId: string;
  vendorId: string;
  notes: string;
}

const emptyForm: TxForm = { type: 'EXPENSE', amount: '', description: '', date: '', categoryId: '', accountId: '', vendorId: '', notes: '' };

export function TransactionsClient({ categories, accounts, vendors }: Props) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TxForm>({ ...emptyForm });
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    setCurrentDate(new Date().toISOString().split('T')[0] ?? '');
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType) params.set('type', filterType);
      const res = await fetch(`/api/transactions?${params.toString()}`);
      const data = await res.json();
      setTransactions(data?.transactions ?? []);
    } catch (e: any) {
      console.error(e);
      toast.error('İşlemler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  // Check for ?new=true in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('new') === 'true') {
        setForm({ ...emptyForm, date: new Date().toISOString().split('T')[0] ?? '' });
        setDialogOpen(true);
        window.history.replaceState({}, '', '/islemler');
      }
    }
  }, []);

  const handleSave = async () => {
    if (!form.description || !form.amount || !form.accountId) {
      toast.error('Açıklama, tutar ve hesap zorunlu');
      return;
    }
    setSaving(true);
    try {
      const method = form.id ? 'PUT' : 'POST';
      const res = await fetch('/api/transactions', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, date: form.date || currentDate }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error ?? 'Hata');
      }
      toast.success(form.id ? 'İşlem güncellendi' : 'İşlem eklendi');
      setDialogOpen(false);
      setForm({ ...emptyForm });
      loadTransactions();
    } catch (e: any) {
      toast.error(e?.message ?? 'Hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/transactions?id=${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('İşlem silindi');
      setDeleteOpen(false);
      loadTransactions();
    } catch {
      toast.error('Silinemedi');
    }
  };

  const openEdit = (tx: any) => {
    setForm({
      id: tx?.id ?? '',
      type: tx?.type ?? 'EXPENSE',
      amount: String(tx?.amount ?? ''),
      description: tx?.description ?? '',
      date: formatDateInput(tx?.date),
      categoryId: tx?.categoryId ?? '',
      accountId: tx?.accountId ?? '',
      vendorId: tx?.vendorId ?? '',
      notes: tx?.notes ?? '',
    });
    setDialogOpen(true);
  };

  const filtered = (transactions ?? []).filter((t: any) =>
    (t?.description ?? '').toLowerCase().includes((search ?? '').toLowerCase())
  );

  const filteredCategories = (categories ?? []).filter((c: any) => !form.type || c?.type === form.type);

  return (
    <div className="space-y-4">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">İşlemler</h1>
            <p className="text-sm text-muted-foreground">Gelir ve gider kayıtlarınızı yönetin</p>
          </div>
          <Button onClick={() => { setForm({ ...emptyForm, date: currentDate }); setDialogOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            <Plus size={16} className="mr-1" /> Yeni İşlem
          </Button>
        </div>
      </FadeIn>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Ara..." value={search} onChange={(e: any) => setSearch(e?.target?.value ?? '')} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {['', 'INCOME', 'EXPENSE'].map((t: string) => (
            <Button key={t} variant={filterType === t ? 'default' : 'outline'} size="sm" onClick={() => setFilterType(t)}
              className={filterType === t ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}
            >
              {t === '' ? 'Tümü' : t === 'INCOME' ? 'Gelir' : 'Gider'}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Yükleniyor...</div>
          ) : (filtered ?? []).length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <ArrowLeftRight size={32} className="mx-auto mb-2 opacity-40" />
              <p>İşlem bulunamadı</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(filtered ?? []).map((t: any) => (
                <div key={t?.id} className="flex items-center justify-between p-3 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-1.5 rounded-md flex-shrink-0 ${
                      t?.type === 'INCOME' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                    }`}>
                      {t?.type === 'INCOME' ? <ArrowUpRight size={16} className="text-emerald-500" /> : <ArrowDownRight size={16} className="text-red-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t?.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {t?.account?.name} {t?.category?.name ? `· ${t.category.name}` : ''} · {formatDate(t?.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-mono font-semibold whitespace-nowrap ${
                      t?.type === 'INCOME' ? 'text-emerald-500' : 'text-red-500'
                    }`}>
                      {t?.type === 'INCOME' ? '+' : '-'}{formatCurrency(t?.amount)}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteId(t?.id ?? ''); setDeleteOpen(true); }}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <CrudDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setForm({ ...emptyForm }); }}
        title={form.id ? 'İşlem Düzenle' : 'Yeni İşlem'}
        onSave={handleSave}
        saving={saving}
      >
        <div className="flex gap-2">
          {['EXPENSE', 'INCOME'].map((t: string) => (
            <Button key={t} variant={form.type === t ? 'default' : 'outline'} size="sm" onClick={() => setForm({ ...form, type: t, categoryId: '' })}
              className={form.type === t ? (t === 'INCOME' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white') : ''}
            >
              {t === 'INCOME' ? 'Gelir' : 'Gider'}
            </Button>
          ))}
        </div>
        <FormField label="Açıklama" required value={form.description} onChange={(e: any) => setForm({ ...form, description: e?.target?.value ?? '' })} placeholder="İşlem açıklaması" />
        <FormField label="Tutar (₺)" required type="number" value={form.amount} onChange={(e: any) => setForm({ ...form, amount: e?.target?.value ?? '' })} placeholder="0.00" />
        <FormField label="Tarih" required type="date" value={form.date || currentDate} onChange={(e: any) => setForm({ ...form, date: e?.target?.value ?? '' })} />
        <FormField label="Hesap" required>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.accountId} onChange={(e: any) => setForm({ ...form, accountId: e?.target?.value ?? '' })}>
            <option value="">Seçiniz</option>
            {(accounts ?? []).map((a: any) => <option key={a?.id} value={a?.id}>{a?.name}</option>)}
          </select>
        </FormField>
        <FormField label="Kategori">
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.categoryId} onChange={(e: any) => setForm({ ...form, categoryId: e?.target?.value ?? '' })}>
            <option value="">Seçiniz</option>
            {(filteredCategories ?? []).map((c: any) => <option key={c?.id} value={c?.id}>{c?.name}</option>)}
          </select>
        </FormField>
        <FormField label="Satıcı">
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.vendorId} onChange={(e: any) => setForm({ ...form, vendorId: e?.target?.value ?? '' })}>
            <option value="">Seçiniz</option>
            {(vendors ?? []).map((v: any) => <option key={v?.id} value={v?.id}>{v?.name}</option>)}
          </select>
        </FormField>
        <FormField label="Not" value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e?.target?.value ?? '' })} placeholder="İsteğe bağlı not" />
      </CrudDialog>

      <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} />
    </div>
  );
}
