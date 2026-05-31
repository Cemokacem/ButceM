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
import { Plus, Pencil, Trash2, Target, ChevronLeft, ChevronRight } from 'lucide-react';

const COLORS = ['#10B981', '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

interface BudgetForm {
  id?: string;
  name: string;
  amount: string;
  period: string;
  categoryId: string;
  startDate: string;
  endDate: string;
  color: string;
}

const emptyForm: BudgetForm = {
  name: '', amount: '0', period: 'MONTHLY', categoryId: '',
  startDate: '', endDate: '', color: '#10B981',
};

export default function ButcelerPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<BudgetForm>({ ...emptyForm });
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => { setCurrentDate(new Date()); }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [budRes, catRes] = await Promise.all([
        fetch('/api/budgets'),
        fetch('/api/categories'),
      ]);
      setItems(await budRes.json() ?? []);
      setCategories(await catRes.json() ?? []);
    } catch {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name || !form.startDate || !form.endDate) { toast.error('Zorunlu alanları doldurun'); return; }
    setSaving(true);
    try {
      const method = form.id ? 'PUT' : 'POST';
      const res = await fetch('/api/budgets', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
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
      await fetch(`/api/budgets?id=${deleteId}`, { method: 'DELETE' });
      toast.success('Silindi');
      setDeleteOpen(false);
      load();
    } catch {
      toast.error('Silinemedi');
    }
  };

  const getDefaultDates = (period: string) => {
    if (!currentDate) return { startDate: '', endDate: '' };
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    if (period === 'WEEKLY') {
      const dow = (currentDate.getDay() + 6) % 7;
      const start = new Date(currentDate);
      start.setDate(start.getDate() - dow);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
    }
    return {
      startDate: new Date(y, m, 1).toISOString().split('T')[0],
      endDate: new Date(y, m + 1, 0).toISOString().split('T')[0],
    };
  };

  const weeklyBudgets = (items ?? []).filter((b: any) => b.period === 'WEEKLY' && b.isActive);
  const monthlyBudgets = (items ?? []).filter((b: any) => b.period === 'MONTHLY' && b.isActive);

  const monthlyTotalSpent = monthlyBudgets.reduce((s: number, b: any) => s + (b.spent ?? 0), 0);
  const monthlyTotalBudget = monthlyBudgets.reduce((s: number, b: any) => s + b.amount, 0);

  const BudgetCard = ({ b, i }: { b: any; i: number }) => {
    const pct = b.amount > 0 ? Math.min(100, (b.spent / b.amount) * 100) : 0;
    const remaining = b.amount - b.spent;
    return (
      <SlideIn from="bottom" delay={i * 0.03}>
        <Card className="mb-3">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold">{b.name}</h3>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                  setForm({ id: b.id, name: b.name, amount: String(b.amount), period: b.period, categoryId: b.categoryId ?? '', startDate: formatDateInput(b.startDate), endDate: formatDateInput(b.endDate), color: b.color });
                  setDialogOpen(true);
                }}>
                  <Pencil size={14} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeleteId(b.id); setDeleteOpen(true); }}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
            {b.category && <p className="text-xs text-muted-foreground mb-1">{b.category.name}</p>}
            <div className="mb-1">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{formatDate(b.startDate)}</span>
                <span>%{Math.round(pct)}</span>
                <span>{formatDate(b.endDate)}</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct > 90 ? '#EF4444' : pct > 60 ? '#F59E0B' : b.color }} />
              </div>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-muted-foreground">{formatCurrency(0)}</span>
              <span className="font-medium">{formatCurrency(b.spent)}</span>
              <span className="text-muted-foreground">{formatCurrency(b.amount)}</span>
            </div>
            <p className="text-sm mt-1">Kalan tutar: <span className={`font-bold ${remaining >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{formatCurrency(remaining)}</span></p>
          </CardContent>
        </Card>
      </SlideIn>
    );
  };

  return (
    <div className="space-y-4">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">Bütçeler</h1>
            <p className="text-sm text-muted-foreground">Harcama limitlerini takip edin</p>
          </div>
          <Button onClick={() => {
            const dates = getDefaultDates('MONTHLY');
            setForm({ ...emptyForm, ...dates });
            setDialogOpen(true);
          }} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            <Plus size={16} className="mr-1" /> Yeni Bütçe
          </Button>
        </div>
      </FadeIn>

      {/* Weekly budgets */}
      {weeklyBudgets.length > 0 && (
        <FadeIn delay={0.1}>
          <Card>
            <CardContent className="p-4">
              <h2 className="text-center font-bold text-lg mb-4">HAFTALIK BÜTÇELER</h2>
              {weeklyBudgets.map((b: any, i: number) => <BudgetCard key={b.id} b={b} i={i} />)}
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Monthly budgets */}
      <FadeIn delay={0.15}>
        <Card>
          <CardContent className="p-4">
            <h2 className="text-center font-bold text-lg mb-4">AYLIK BÜTÇELER</h2>
            {monthlyBudgets.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Target size={32} className="mx-auto mb-2 opacity-40" />
                <p>Henüz aylık bütçe yok</p>
              </div>
            ) : (
              <>
                {monthlyBudgets.map((b: any, i: number) => <BudgetCard key={b.id} b={b} i={i} />)}
                <div className="text-right text-sm font-bold mt-2">
                  <span className={monthlyTotalSpent > monthlyTotalBudget ? 'text-red-500' : 'text-emerald-500'}>
                    {formatCurrency(monthlyTotalSpent)}
                  </span>
                  <span className="text-muted-foreground"> / {formatCurrency(monthlyTotalBudget)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      <CrudDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setForm({ ...emptyForm }); }} title={form.id ? 'Bütçe Düzenle' : 'Yeni Bütçe'} onSave={handleSave} saving={saving}>
        <FormField label="Bütçe Adı" required value={form.name} onChange={(e: any) => setForm({ ...form, name: e?.target?.value ?? '' })} placeholder="Örn: Dışarıda yemek yeme" />
        <FormField label="Limit Tutarı (₺)" required type="number" value={form.amount} onChange={(e: any) => setForm({ ...form, amount: e?.target?.value ?? '0' })} />
        <FormField label="Periyot">
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.period} onChange={(e: any) => {
            const newPeriod = e?.target?.value;
            const dates = getDefaultDates(newPeriod);
            setForm({ ...form, period: newPeriod, ...dates });
          }}>
            <option value="WEEKLY">Haftalık</option>
            <option value="MONTHLY">Aylık</option>
          </select>
        </FormField>
        <FormField label="Kategori">
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.categoryId} onChange={(e: any) => setForm({ ...form, categoryId: e?.target?.value })}>
            <option value="">Tüm kategoriler</option>
            {categories.filter((c: any) => c.type === 'EXPENSE').map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Başlangıç" required type="date" value={form.startDate} onChange={(e: any) => setForm({ ...form, startDate: e?.target?.value })} />
          <FormField label="Bitiş" required type="date" value={form.endDate} onChange={(e: any) => setForm({ ...form, endDate: e?.target?.value })} />
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
