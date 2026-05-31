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
import { Plus, Pencil, Trash2, Bell, TrendingUp } from 'lucide-react';

const COLORS = ['#F59E0B', '#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

interface SubForm {
  id?: string;
  name: string;
  amount: string;
  frequency: string;
  categoryId: string;
  accountId: string;
  startDate: string;
  color: string;
  notes: string;
}

const emptyForm: SubForm = {
  name: '', amount: '0', frequency: 'MONTHLY', categoryId: '', accountId: '',
  startDate: '', color: '#F59E0B', notes: '',
};

export default function AboneliklerPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SubForm>({ ...emptyForm });
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => { setCurrentDate(new Date()); }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [subRes, catRes, accRes] = await Promise.all([
        fetch('/api/subscriptions'),
        fetch('/api/categories'),
        fetch('/api/accounts'),
      ]);
      setItems(await subRes.json() ?? []);
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
    if (!form.name || !form.accountId || !form.startDate) { toast.error('Zorunlu alanları doldurun'); return; }
    setSaving(true);
    try {
      const method = form.id ? 'PUT' : 'POST';
      const res = await fetch('/api/subscriptions', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
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

  const handleDelete = async () => {
    try {
      await fetch(`/api/subscriptions?id=${deleteId}`, { method: 'DELETE' });
      toast.success('Silindi');
      setDeleteOpen(false);
      load();
    } catch {
      toast.error('Silinemedi');
    }
  };

  const getProgress = (sub: any) => {
    if (!currentDate) return 0;
    const start = new Date(sub.startDate);
    const next = new Date(sub.nextPayDate);
    const total = next.getTime() - start.getTime();
    const elapsed = currentDate.getTime() - start.getTime();
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const activeSubs = (items ?? []).filter((s: any) => s.isActive);
  const monthlyTotal = activeSubs.reduce((s: number, sub: any) => {
    if (sub.frequency === 'YEARLY') return s + (sub.amount / 12);
    return s + sub.amount;
  }, 0);
  const yearlyTotal = monthlyTotal * 12;
  const next30DaysTotal = activeSubs.filter((s: any) => {
    if (!currentDate) return false;
    const next = new Date(s.nextPayDate);
    const diff = (next.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 30 && diff >= 0;
  }).reduce((s: number, sub: any) => s + sub.amount, 0);

  return (
    <div className="space-y-4">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">Abonelikler</h1>
            <p className="text-sm text-muted-foreground">Abonelik ödemelerinizi takip edin</p>
          </div>
          <Button onClick={() => { setForm({ ...emptyForm, startDate: currentDate ? currentDate.toISOString().split('T')[0] : '', accountId: accounts[0]?.id ?? '' }); setDialogOpen(true); }} className="bg-amber-500 hover:bg-amber-600 text-white">
            <Plus size={16} className="mr-1" /> Yeni Abonelik
          </Button>
        </div>
      </FadeIn>

      {/* Summary Cards */}
      <FadeIn delay={0.1}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Abonelik Sayısı</p>
            <p className="text-xl font-bold">{activeSubs.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Sonraki 30 gün</p>
            <p className="text-xl font-bold text-red-500">-{formatCurrency(next30DaysTotal)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Aylık ortalama</p>
            <p className="text-xl font-bold text-red-500">-{formatCurrency(monthlyTotal)}</p>
          </CardContent></Card>
        </div>
      </FadeIn>

      {/* Subscriptions list */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><div className="h-20 bg-muted/50 rounded animate-pulse" /></CardContent></Card>
          ))
        ) : activeSubs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell size={32} className="mx-auto mb-2 opacity-40" />
            <p>Henüz abonelik yok</p>
          </div>
        ) : (
          activeSubs.map((s: any, i: number) => {
            const progress = getProgress(s);
            const monthlyAmt = s.frequency === 'YEARLY' ? s.amount / 12 : s.amount;
            const yearlyAmt = s.frequency === 'YEARLY' ? s.amount : s.amount * 12;
            return (
              <SlideIn key={s.id} from="bottom" delay={i * 0.03}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-base">{s.name}</h3>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          setForm({ id: s.id, name: s.name, amount: String(s.amount), frequency: s.frequency, categoryId: s.categoryId ?? '', accountId: s.accountId, startDate: formatDateInput(s.startDate), color: s.color, notes: s.notes ?? '' });
                          setDialogOpen(true);
                        }}>
                          <Pencil size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeleteId(s.id); setDeleteOpen(true); }}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{formatDate(s.startDate)}</span>
                        <span>%{Math.round(progress)}</span>
                        <span>{formatDate(s.nextPayDate)}</span>
                      </div>
                      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: s.color }} />
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="font-bold">{formatCurrency(s.amount)} <span className="font-normal text-sm text-muted-foreground">{s.frequency === 'YEARLY' ? 'her yıl' : 'her ay'}</span></p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(monthlyAmt)} / ay = {formatCurrency(yearlyAmt)} / yıl</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{s.account?.name}</span>
                    </div>
                  </CardContent>
                </Card>
              </SlideIn>
            );
          })
        )}
      </div>

      <CrudDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setForm({ ...emptyForm }); }} title={form.id ? 'Abonelik Düzenle' : 'Yeni Abonelik'} onSave={handleSave} saving={saving}>
        <FormField label="Ad" required value={form.name} onChange={(e: any) => setForm({ ...form, name: e?.target?.value ?? '' })} placeholder="Örn: Netflix" />
        <FormField label="Tutar" required type="number" value={form.amount} onChange={(e: any) => setForm({ ...form, amount: e?.target?.value ?? '0' })} />
        <FormField label="Sıklık">
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.frequency} onChange={(e: any) => setForm({ ...form, frequency: e?.target?.value })}>
            <option value="MONTHLY">Aylık</option>
            <option value="YEARLY">Yıllık</option>
          </select>
        </FormField>
        <FormField label="Kategori">
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.categoryId} onChange={(e: any) => setForm({ ...form, categoryId: e?.target?.value })}>
            <option value="">Seçin</option>
            {categories.filter((c: any) => c.type === 'EXPENSE').map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FormField>
        <FormField label="Hesap" required>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.accountId} onChange={(e: any) => setForm({ ...form, accountId: e?.target?.value })}>
            <option value="">Seçin</option>
            {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </FormField>
        <FormField label="Başlangıç Tarihi" required type="date" value={form.startDate} onChange={(e: any) => setForm({ ...form, startDate: e?.target?.value })} />
        <FormField label="Notlar" value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e?.target?.value })} />
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
