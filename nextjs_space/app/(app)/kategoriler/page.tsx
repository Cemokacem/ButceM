'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CrudDialog } from '@/components/crud-dialog';
import { DeleteConfirm } from '@/components/delete-confirm';
import { FormField } from '@/components/form-field';
import { FadeIn } from '@/components/ui/animate';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';

const COLORS = ['#10B981', '#3B82F6', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'];

interface CatForm {
  id?: string;
  name: string;
  type: string;
  color: string;
}

const emptyForm: CatForm = { name: '', type: 'EXPENSE', color: '#10B981' };

export default function KategorilerPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CatForm>({ ...emptyForm });
  const [tab, setTab] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data ?? []);
    } catch {
      toast.error('Kategoriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.name) { toast.error('Ad zorunlu'); return; }
    setSaving(true);
    try {
      const method = form.id ? 'PUT' : 'POST';
      const res = await fetch('/api/categories', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { const err = await res.json(); throw new Error(err?.error); }
      toast.success(form.id ? 'Kategori güncellendi' : 'Kategori eklendi');
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
      const res = await fetch(`/api/categories?id=${deleteId}`, { method: 'DELETE' });
      if (!res.ok) { const err = await res.json(); throw new Error(err?.error); }
      toast.success('Kategori silindi');
      setDeleteOpen(false);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Silinemedi');
    }
  };

  const filtered = (categories ?? []).filter((c: any) => c?.type === tab);

  return (
    <div className="space-y-4">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">Kategoriler</h1>
            <p className="text-sm text-muted-foreground">Gelir ve gider kategorilerinizi yönetin</p>
          </div>
          <Button onClick={() => { setForm({ ...emptyForm, type: tab }); setDialogOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            <Plus size={16} className="mr-1" /> Yeni Kategori
          </Button>
        </div>
      </FadeIn>

      <div className="flex gap-2">
        <Button variant={tab === 'EXPENSE' ? 'default' : 'outline'} size="sm" onClick={() => setTab('EXPENSE')}
          className={tab === 'EXPENSE' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}>Gider</Button>
        <Button variant={tab === 'INCOME' ? 'default' : 'outline'} size="sm" onClick={() => setTab('INCOME')}
          className={tab === 'INCOME' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}>Gelir</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i: number) => (
            <Card key={i}><CardContent className="p-4"><div className="h-10 bg-muted/50 rounded animate-pulse" /></CardContent></Card>
          ))
        ) : (filtered ?? []).length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <Tag size={32} className="mx-auto mb-2 opacity-40" />
            <p>Henüz kategori yok</p>
          </div>
        ) : (
          (filtered ?? []).map((c: any) => (
            <Card key={c?.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c?.color ?? '#6366F1' }} />
                  <span className="font-medium text-sm">{c?.name}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setForm({ id: c?.id, name: c?.name ?? '', type: c?.type ?? 'EXPENSE', color: c?.color ?? '#6366F1' }); setDialogOpen(true); }}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeleteId(c?.id ?? ''); setDeleteOpen(true); }}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <CrudDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setForm({ ...emptyForm }); }} title={form.id ? 'Kategori Düzenle' : 'Yeni Kategori'} onSave={handleSave} saving={saving}>
        <FormField label="Ad" required value={form.name} onChange={(e: any) => setForm({ ...form, name: e?.target?.value ?? '' })} placeholder="Kategori adı" />
        <FormField label="Tür" required>
          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.type} onChange={(e: any) => setForm({ ...form, type: e?.target?.value ?? 'EXPENSE' })}>
            <option value="EXPENSE">Gider</option>
            <option value="INCOME">Gelir</option>
          </select>
        </FormField>
        <FormField label="Renk">
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((color: string) => (
              <button key={color} className={`w-7 h-7 rounded-full border-2 transition-all ${
                form.color === color ? 'border-foreground scale-110' : 'border-transparent'
              }`} style={{ backgroundColor: color }} onClick={() => setForm({ ...form, color })} />
            ))}
          </div>
        </FormField>
      </CrudDialog>

      <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete}
        description="Bu kategoriye ait işlemler varsa silinemez." />
    </div>
  );
}
