'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CrudDialog } from '@/components/crud-dialog';
import { DeleteConfirm } from '@/components/delete-confirm';
import { FormField } from '@/components/form-field';
import { FadeIn, SlideIn } from '@/components/ui/animate';
import { toast } from 'sonner';
import { formatCurrency, formatDate, formatDateInput } from '@/lib/format';
import { Plus, Pencil, Trash2, CalendarClock, Check, Clock, Filter } from 'lucide-react';

interface PayForm {
  id?: string;
  description: string;
  amount: string;
  type: string;
  categoryId: string;
  accountId: string;
  dueDate: string;
  isRecurring: boolean;
  frequency: string;
  notes: string;
}

const emptyForm: PayForm = {
  description: '', amount: '0', type: 'EXPENSE', categoryId: '', accountId: '',
  dueDate: '', isRecurring: false, frequency: 'MONTHLY', notes: '',
};

export default function PlanlanmisOdemelerPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PayForm>({ ...emptyForm });
  const [showFilter, setShowFilter] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    setCurrentDate(new Date().toISOString().split('T')[0]);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [payRes, catRes, accRes] = await Promise.all([
        fetch('/api/planned-payments'),
        fetch('/api/categories'),
        fetch('/api/accounts'),
      ]);
      setItems(await payRes.json() ?? []);
      setCategories(await catRes.json() ?? []);
      setAccounts(await accRes.json() ?? []);
    } catch {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.description || !form.accountId || !form.dueDate) { toast.error('Zorunlu alanları doldurun'); return; }
    setSaving(true);
    try {
      const method = form.id ? 'PUT' : 'POST';
      const res = await fetch('/api/planned-payments', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success(form.id ? 'Güncellendi' : 'Eklendi');
      setDialogOpen(false);
      setForm({ ...emptyForm });
      load();
    } catch {
      toast.error('Hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (item: any) => {
    try {
      await fetch('/api/planned-payments', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, isPaid: !item.isPaid }) });
      toast.success(item.isPaid ? 'Ödenmemiş olarak işaretlendi' : 'Ödenmiş olarak işaretlendi');
      load();
    } catch {
      toast.error('Hata');
    }
  };

  const handleDelete = async () => {
    try {
      await fetch(`/api/planned-payments?id=${deleteId}`, { method: 'DELETE' });
      toast.success('Silindi');
      setDeleteOpen(false);
      load();
    } catch {
      toast.error('Silinemedi');
    }
  };

  const filtered = (items ?? []).filter((p: any) => {
    if (filterType === 'PAID') return p.isPaid;
    if (filterType === 'UNPAID') return !p.isPaid;
    return true;
  });

  const thisMonthTotal = filtered.filter((p: any) => {
    if (!currentDate) return false;
    const now = new Date(currentDate);
    const d = new Date(p.dueDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && !p.isPaid;
  }).reduce((s: number, p: any) => s + (p.type === 'EXPENSE' ? -(p.amount ?? 0) : (p.amount ?? 0)), 0);

  const nextMonthTotal = filtered.filter((p: any) => {
    if (!currentDate) return false;
    const now = new Date(currentDate);
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const d = new Date(p.dueDate);
    return d.getMonth() === next.getMonth() && d.getFullYear() === next.getFullYear() && !p.isPaid;
  }).reduce((s: number, p: any) => s + (p.type === 'EXPENSE' ? -(p.amount ?? 0) : (p.amount ?? 0)), 0);

  return (
    <div className="space-y-4">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">Planlanmış Ödemeler</h1>
            <p className="text-sm text-muted-foreground">Gelecek ödemelerinizi yönetin</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFilter(!showFilter)}>
              <Filter size={14} className="mr-1" /> Filtre
            </Button>
            <Button onClick={() => { setForm({ ...emptyForm, dueDate: currentDate, accountId: accounts[0]?.id ?? '' }); setDialogOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Plus size={16} className="mr-1" /> Yeni Ödeme
            </Button>
          </div>
        </div>
      </FadeIn>

      {showFilter && (
        <FadeIn>
          <Card><CardContent className="p-3">
            <div className="flex gap-2">
              {['ALL', 'UNPAID', 'PAID'].map(t => (
                <Button key={t} variant={filterType === t ? 'default' : 'outline'} size="sm" onClick={() => setFilterType(t)}>
                  {t === 'ALL' ? 'Tümü' : t === 'PAID' ? 'Ödenmiş' : 'Ödenmemiş'}
                </Button>
              ))}
            </div>
          </CardContent></Card>
        </FadeIn>
      )}

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-12 bg-muted/50 rounded animate-pulse" /></CardContent></Card>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarClock size={32} className="mx-auto mb-2 opacity-40" />
            <p>Planlanmış ödeme yok</p>
          </div>
        ) : (
          filtered.map((p: any, i: number) => (
            <SlideIn key={p.id} from="bottom" delay={i * 0.03}>
              <Card className={p.isPaid ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleMarkPaid(p)} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${p.isPaid ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-muted-foreground/30 hover:border-emerald-500'}`}>
                      {p.isPaid && <Check size={14} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {p.category && (
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.category.color }} />
                        )}
                        <p className={`font-medium text-sm ${p.isPaid ? 'line-through' : ''}`}>{p.description}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.account?.name ?? ''} • {formatDate(p.dueDate)}</p>
                      {p.isRecurring && <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded mt-1 inline-block">
                        {p.frequency === 'WEEKLY' ? 'Haftalık' : p.frequency === 'YEARLY' ? 'Yıllık' : 'Aylık'}
                      </span>}
                    </div>
                    <div className="text-right">
                      <p className={`font-bold font-mono text-sm ${p.type === 'INCOME' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {p.type === 'EXPENSE' ? '-' : ''}{formatCurrency(p.amount)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        setForm({ id: p.id, description: p.description, amount: String(p.amount), type: p.type, categoryId: p.categoryId ?? '', accountId: p.accountId, dueDate: formatDateInput(p.dueDate), isRecurring: p.isRecurring, frequency: p.frequency ?? 'MONTHLY', notes: p.notes ?? '' });
                        setDialogOpen(true);
                      }}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeleteId(p.id); setDeleteOpen(true); }}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SlideIn>
          ))
        )}
      </div>

      <FadeIn delay={0.1}>
        <Card><CardContent className="p-4 space-y-1">
          <div className="flex justify-between text-sm"><span>Bu ay:</span><span className={`font-bold font-mono ${thisMonthTotal >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatCurrency(thisMonthTotal)}</span></div>
          <div className="flex justify-between text-sm"><span>Gelecek ay:</span><span className={`font-bold font-mono ${nextMonthTotal >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatCurrency(nextMonthTotal)}</span></div>
        </CardContent></Card>
      </FadeIn>

      <CrudDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setForm({ ...emptyForm }); }} title={form.id ? 'Ödeme Düzenle' : 'Yeni Planlanmış Ödeme'} onSave={handleSave} saving={saving}>
        <FormField label="Açıklama" required value={form.description} onChange={(e: any) => setForm({ ...form, description: e?.target?.value ?? '' })} placeholder="Örn: Kira" />
        <FormField label="Tutar" required type="number" value={form.amount} onChange={(e: any) => setForm({ ...form, amount: e?.target?.value ?? '0' })} />
        <FormField label="Tür">
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.type} onChange={(e: any) => setForm({ ...form, type: e?.target?.value })}>
            <option value="EXPENSE">Gider</option>
            <option value="INCOME">Gelir</option>
          </select>
        </FormField>
        <FormField label="Kategori">
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.categoryId} onChange={(e: any) => setForm({ ...form, categoryId: e?.target?.value })}>
            <option value="">Seçin</option>
            {categories.filter((c: any) => c.type === form.type).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FormField>
        <FormField label="Hesap" required>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.accountId} onChange={(e: any) => setForm({ ...form, accountId: e?.target?.value })}>
            <option value="">Seçin</option>
            {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </FormField>
        <FormField label="Ödeme Tarihi" required type="date" value={form.dueDate} onChange={(e: any) => setForm({ ...form, dueDate: e?.target?.value })} />
        <div className="flex items-center gap-2">
          <input type="checkbox" id="isRecurring" checked={form.isRecurring} onChange={(e: any) => setForm({ ...form, isRecurring: e?.target?.checked })} className="rounded" />
          <label htmlFor="isRecurring" className="text-sm">Tekrarlı ödeme</label>
        </div>
        {form.isRecurring && (
          <FormField label="Tekrar Sıklığı">
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.frequency} onChange={(e: any) => setForm({ ...form, frequency: e?.target?.value })}>
              <option value="WEEKLY">Haftalık</option>
              <option value="MONTHLY">Aylık</option>
              <option value="YEARLY">Yıllık</option>
            </select>
          </FormField>
        )}
        <FormField label="Notlar" value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e?.target?.value })} />
      </CrudDialog>

      <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} />
    </div>
  );
}
