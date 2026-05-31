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
import { Plus, Pencil, Trash2, Users, Phone, Mail, MapPin } from 'lucide-react';

interface VendorForm {
  id?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  balance: string;
  notes: string;
}

const emptyForm: VendorForm = { name: '', phone: '', email: '', address: '', balance: '0', notes: '' };

export default function SaticilarPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<VendorForm>({ ...emptyForm });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/vendors');
      const data = await res.json();
      setVendors(data ?? []);
    } catch {
      toast.error('Yüklenemedi');
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
      const res = await fetch('/api/vendors', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      toast.success(form.id ? 'Güncellendi' : 'Eklendi');
      setDialogOpen(false);
      setForm({ ...emptyForm });
      load();
    } catch {
      toast.error('Hata');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await fetch(`/api/vendors?id=${deleteId}`, { method: 'DELETE' });
      toast.success('Silindi');
      setDeleteOpen(false);
      load();
    } catch {
      toast.error('Silinemedi');
    }
  };

  return (
    <div className="space-y-4">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">Satıcılar</h1>
            <p className="text-sm text-muted-foreground">Satıcı cari hesap takibi</p>
          </div>
          <Button onClick={() => { setForm({ ...emptyForm }); setDialogOpen(true); }} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            <Plus size={16} className="mr-1" /> Yeni Satıcı
          </Button>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i: number) => (
            <Card key={i}><CardContent className="p-4"><div className="h-20 bg-muted/50 rounded animate-pulse" /></CardContent></Card>
          ))
        ) : (vendors ?? []).length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <Users size={32} className="mx-auto mb-2 opacity-40" />
            <p>Henüz satıcı yok</p>
          </div>
        ) : (
          (vendors ?? []).map((v: any, i: number) => (
            <SlideIn key={v?.id} from="bottom" delay={i * 0.05}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{v?.name}</p>
                      <div className="mt-1 space-y-0.5">
                        {v?.phone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10} />{v.phone}</p>}
                        {v?.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail size={10} />{v.email}</p>}
                        {v?.address && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={10} />{v.address}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        setForm({ id: v?.id, name: v?.name ?? '', phone: v?.phone ?? '', email: v?.email ?? '', address: v?.address ?? '', balance: String(v?.balance ?? 0), notes: v?.notes ?? '' });
                        setDialogOpen(true);
                      }}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setDeleteId(v?.id ?? ''); setDeleteOpen(true); }}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {v?._count?.transactions ?? 0} işlem · {v?._count?.installments ?? 0} taksit
                    </span>
                    <span className={`text-sm font-mono font-semibold ${
                      (v?.balance ?? 0) > 0 ? 'text-emerald-500' : (v?.balance ?? 0) < 0 ? 'text-red-500' : 'text-muted-foreground'
                    }`}>
                      {(v?.balance ?? 0) > 0 ? 'Alacak: ' : (v?.balance ?? 0) < 0 ? 'Borç: ' : ''}
                      {formatCurrency(Math.abs(v?.balance ?? 0))}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </SlideIn>
          ))
        )}
      </div>

      <CrudDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setForm({ ...emptyForm }); }}
        title={form.id ? 'Satıcı Düzenle' : 'Yeni Satıcı'} onSave={handleSave} saving={saving}>
        <FormField label="Ad" required value={form.name} onChange={(e: any) => setForm({ ...form, name: e?.target?.value ?? '' })} placeholder="Satıcı adı" />
        <FormField label="Telefon" value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e?.target?.value ?? '' })} placeholder="0555 123 4567" />
        <FormField label="E-posta" value={form.email} onChange={(e: any) => setForm({ ...form, email: e?.target?.value ?? '' })} placeholder="ornek@mail.com" />
        <FormField label="Adres" value={form.address} onChange={(e: any) => setForm({ ...form, address: e?.target?.value ?? '' })} />
        <FormField label="Bakiye (₺)" type="number" value={form.balance} onChange={(e: any) => setForm({ ...form, balance: e?.target?.value ?? '0' })} />
        <FormField label="Not" value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e?.target?.value ?? '' })} />
      </CrudDialog>

      <DeleteConfirm open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} />
    </div>
  );
}
