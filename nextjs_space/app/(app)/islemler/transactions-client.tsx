'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CrudDialog } from '@/components/crud-dialog';
import { DeleteConfirm } from '@/components/delete-confirm';
import { FormField } from '@/components/form-field';
import { FadeIn } from '@/components/ui/animate';
import { toast } from 'sonner';
import { formatCurrency, formatDate, formatDateInput, getTransactionTypeLabel } from '@/lib/format';
import {
  Plus, Search, ArrowUpRight, ArrowDownRight, Pencil, Trash2,
  ArrowLeftRight, Minus, CirclePlus
} from 'lucide-react';

interface Props {
  categories: Array<{ id: string; name: string; type: string; color: string }>;
  accounts: Array<{ id: string; name: string; type: string }>;
  vendors: Array<{ id: string; name: string }>;
}

interface LineItem {
  categoryId: string;
  amount: string;
  description: string;
}

interface TxForm {
  id?: string;
  type: string;
  date: string;
  time: string;
  accountId: string;
  vendorId: string;
  notes: string;
  isVerified: boolean;
  lines: LineItem[];
}

const emptyLine: LineItem = { categoryId: '', amount: '', description: '' };
const emptyForm: TxForm = {
  type: 'EXPENSE', date: '', time: '', accountId: '', vendorId: '',
  notes: '', isVerified: false, lines: [{ ...emptyLine }],
};

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
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const now = new Date();
    setCurrentDate(now.toISOString().split('T')[0] ?? '');
    setCurrentTime(now.toTimeString().slice(0, 5));
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType) params.set('type', filterType);
      const res = await fetch(`/api/transactions?${params.toString()}`);
      const data = await res.json();
      setTransactions(data?.transactions ?? []);
    } catch {
      toast.error('İşlemler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  // Check for ?new=true or multi-line params from OCR
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('new') === 'true') {
        const linesParam = params.get('lines');
        let lines: LineItem[] = [{ ...emptyLine }];

        if (linesParam) {
          try {
            const parsed = JSON.parse(decodeURIComponent(linesParam));
            if (Array.isArray(parsed) && parsed.length > 0) {
              lines = parsed.map((l: any) => ({
                categoryId: l.categoryId ?? '',
                amount: String(l.amount ?? ''),
                description: l.description ?? '',
              }));
            }
          } catch { /* ignore */ }
        } else {
          // Legacy single-item params
          const desc = params.get('description') ?? '';
          const amt = params.get('amount') ?? '';
          if (desc || amt) {
            lines = [{ categoryId: '', amount: amt, description: desc }];
          }
        }

        setForm({
          ...emptyForm,
          date: params.get('date') || currentDate || new Date().toISOString().split('T')[0],
          time: currentTime || new Date().toTimeString().slice(0, 5),
          accountId: params.get('accountId') ?? '',
          vendorId: params.get('vendorId') ?? '',
          lines,
        });
        setDialogOpen(true);
        window.history.replaceState({}, '', '/islemler');
      }
    }
  }, [currentDate, currentTime]);

  // Line item helpers
  const addLine = () => {
    setForm(f => ({ ...f, lines: [...f.lines, { ...emptyLine }] }));
  };

  const removeLine = (idx: number) => {
    if (form.lines.length <= 1) return;
    setForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));
  };

  const updateLine = (idx: number, field: keyof LineItem, value: string) => {
    setForm(f => ({
      ...f,
      lines: f.lines.map((l, i) => i === idx ? { ...l, [field]: value } : l),
    }));
  };

  const totalAmount = form.lines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);

  const handleSave = async () => {
    const validLines = form.lines.filter(l => l.amount && parseFloat(l.amount) > 0);
    if (validLines.length === 0) { toast.error('En az bir kalem ve tutar gerekli'); return; }
    if (!form.accountId) { toast.error('Hesap seçin'); return; }

    setSaving(true);
    try {
      if (form.id) {
        // Edit mode - single transaction update
        const line = validLines[0];
        const res = await fetch('/api/transactions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: form.id,
            type: form.type,
            amount: line.amount,
            description: line.description || (categories.find(c => c.id === line.categoryId)?.name ?? 'Diğer'),
            date: form.date || currentDate,
            categoryId: line.categoryId,
            accountId: form.accountId,
            vendorId: form.vendorId,
            notes: form.notes,
          }),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err?.error); }
        toast.success('İşlem güncellendi');
      } else {
        // Create mode - batch create multiple transactions
        const res = await fetch('/api/transactions/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: form.type,
            date: form.date || currentDate,
            accountId: form.accountId,
            vendorId: form.vendorId,
            notes: form.notes,
            lines: validLines.map(l => ({
              categoryId: l.categoryId || null,
              amount: l.amount,
              description: l.description || (categories.find(c => c.id === l.categoryId)?.name ?? 'Diğer'),
            })),
          }),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err?.error); }
        toast.success(`${validLines.length} işlem eklendi`);
      }
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
      date: formatDateInput(tx?.date),
      time: tx?.date ? new Date(tx.date).toTimeString().slice(0, 5) : '',
      accountId: tx?.accountId ?? '',
      vendorId: tx?.vendorId ?? '',
      notes: tx?.notes ?? '',
      isVerified: false,
      lines: [{
        categoryId: tx?.categoryId ?? '',
        amount: String(tx?.amount ?? ''),
        description: tx?.description ?? '',
      }],
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
          <Button onClick={() => { setForm({ ...emptyForm, date: currentDate, time: currentTime, lines: [{ ...emptyLine }] }); setDialogOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white">
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
                      <div className="flex items-center gap-2">
                        {t?.category && (
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.category.color }} />
                        )}
                        <p className="text-sm font-medium truncate">{t?.category?.name ?? t?.description}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t?.account?.name} • {formatDate(t?.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-mono font-semibold whitespace-nowrap ${
                      t?.type === 'INCOME' ? 'text-emerald-500' : 'text-red-500'
                    }`}>
                      {t?.type === 'INCOME' ? '' : '-'}{formatCurrency(t?.amount)}
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

      {/* Multi-line Dialog */}
      <CrudDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setForm({ ...emptyForm }); }}
        title={form.id ? 'İşlem Düzenle' : 'Yeni İşlem'}
        onSave={handleSave}
        saving={saving}
        saveLabel="KAYDET"
      >
        <div className="space-y-4">
          {/* Type selector */}
          <div className="flex gap-2">
            {['EXPENSE', 'INCOME'].map((t: string) => (
              <Button key={t} variant={form.type === t ? 'default' : 'outline'} size="sm" onClick={() => setForm({ ...form, type: t, lines: form.lines.map(l => ({ ...l, categoryId: '' })) })}
                className={form.type === t ? (t === 'INCOME' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white') : ''}
              >
                {t === 'INCOME' ? 'Gelir' : 'Gider'}
              </Button>
            ))}
          </div>

          {/* Line items */}
          <div className="space-y-3">
            {form.lines.map((line, idx) => (
              <div key={idx} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
                {/* Category icon circle */}
                <div className="mt-1 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${filteredCategories.find(c => c.id === line.categoryId)?.color ?? '#9CA3AF'}20` }}>
                  <span className="text-xs font-bold" style={{ color: filteredCategories.find(c => c.id === line.categoryId)?.color ?? '#9CA3AF' }}>
                    {(filteredCategories.find(c => c.id === line.categoryId)?.name ?? '?').charAt(0)}
                  </span>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Kategori</label>
                      <select className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={line.categoryId} onChange={(e: any) => {
                        const catId = e?.target?.value ?? '';
                        const catName = filteredCategories.find(c => c.id === catId)?.name ?? '';
                        updateLine(idx, 'categoryId', catId);
                        if (!line.description) updateLine(idx, 'description', catName);
                      }}>
                        <option value="">Seçin</option>
                        {filteredCategories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Değer</label>
                      <div className="flex items-center gap-1">
                        <input type="number" className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm font-mono" value={line.amount} onChange={(e: any) => updateLine(idx, 'amount', e?.target?.value ?? '')} placeholder="0" />
                        <span className="text-sm text-muted-foreground">₺</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Açıklama</label>
                    <input className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={line.description} onChange={(e: any) => updateLine(idx, 'description', e?.target?.value ?? '')} placeholder="Açıklama (isteğe bağlı)" />
                  </div>
                </div>
                {/* Remove line button */}
                <button onClick={() => removeLine(idx)} className="mt-1 p-1.5 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0" disabled={form.lines.length <= 1}>
                  <Minus size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Total & Add line */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Toplam: <span className="font-mono font-bold">{formatCurrency(totalAmount)}</span></p>
            <button onClick={addLine} className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-sm font-medium">
              <CirclePlus size={20} /> Kalem Ekle
            </button>
          </div>

          {/* Common fields */}
          <div className="border-t pt-4 space-y-3">
            <FormField label="Hesap" required>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.accountId} onChange={(e: any) => setForm({ ...form, accountId: e?.target?.value ?? '' })}>
                <option value="">Seçiniz</option>
                {(accounts ?? []).map((a: any) => <option key={a?.id} value={a?.id}>{a?.name}</option>)}
              </select>
            </FormField>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isVerified" checked={form.isVerified} onChange={(e: any) => setForm({ ...form, isVerified: e?.target?.checked })} className="rounded" />
                <label htmlFor="isVerified" className="text-sm">Kontrol</label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Tarih" required type="date" value={form.date || currentDate} onChange={(e: any) => setForm({ ...form, date: e?.target?.value ?? '' })} />
              <FormField label="Saat" type="time" value={form.time || currentTime} onChange={(e: any) => setForm({ ...form, time: e?.target?.value ?? '' })} />
            </div>
            <FormField label="Şu Kişiye (İsteğe bağlı)">
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.vendorId} onChange={(e: any) => setForm({ ...form, vendorId: e?.target?.value ?? '' })}>
                <option value="">Seçiniz</option>
                {(vendors ?? []).map((v: any) => <option key={v?.id} value={v?.id}>{v?.name}</option>)}
              </select>
            </FormField>
            <FormField label="Notlar (İsteğe bağlı)">
              <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]" value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e?.target?.value ?? '' })} placeholder="Notlar" />
            </FormField>
          </div>
        </div>
      </CrudDialog>

      <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} />
    </div>
  );
}
