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
import { formatCurrency, formatDate, formatDateInput } from '@/lib/format';
import {
  Plus, Search, ArrowDownRight, ArrowUpRight, Pencil, Trash2,
  ChevronDown, ChevronRight, Minus, CirclePlus, Receipt, Store
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
  vendorName: string;
  notes: string;
  lines: LineItem[];
}

interface GroupedTx {
  groupId: string;
  vendorName: string;
  date: string;
  type: string;
  total: number;
  accountName: string;
  accountId: string;
  items: Array<{
    id: string;
    description: string;
    amount: number;
    categoryName: string | null;
    categoryColor: string | null;
    categoryId: string | null;
  }>;
}

const emptyLine: LineItem = { categoryId: '', amount: '', description: '' };
const emptyForm: TxForm = {
  type: 'EXPENSE', date: '', time: '', accountId: '', vendorId: '', vendorName: '',
  notes: '', lines: [{ ...emptyLine }],
};

export function TransactionsClient({ categories, accounts, vendors }: Props) {
  const [groups, setGroups] = useState<GroupedTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteGroupId, setDeleteGroupId] = useState('');
  const [deleteSingleId, setDeleteSingleId] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TxForm>({ ...emptyForm });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  // New account dialog
  const [newAccOpen, setNewAccOpen] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState('CASH');
  const [savingAcc, setSavingAcc] = useState(false);
  const [localAccounts, setLocalAccounts] = useState(accounts);

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
      params.set('limit', '500');
      const res = await fetch(`/api/transactions?${params.toString()}`);
      const data = await res.json();
      const txs: any[] = data?.transactions ?? [];

      // Group transactions by groupId or individual
      const groupMap = new Map<string, GroupedTx>();

      for (const tx of txs) {
        const key = tx.groupId || `single_${tx.id}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            groupId: key,
            vendorName: tx.vendor?.name || tx.description || 'İşlem',
            date: tx.date,
            type: tx.type,
            total: 0,
            accountName: tx.account?.name || '',
            accountId: tx.accountId || '',
            items: [],
          });
        }
        const group = groupMap.get(key)!;
        group.total += tx.amount ?? 0;
        group.items.push({
          id: tx.id,
          description: tx.description ?? '',
          amount: tx.amount ?? 0,
          categoryName: tx.category?.name ?? null,
          categoryColor: tx.category?.color ?? null,
          categoryId: tx.categoryId ?? null,
        });
      }

      setGroups(Array.from(groupMap.values()));
    } catch {
      toast.error('İşlemler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  // Check for ?new=true from OCR
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
        }
        setForm({
          ...emptyForm,
          date: params.get('date') || currentDate || new Date().toISOString().split('T')[0],
          time: currentTime || new Date().toTimeString().slice(0, 5),
          accountId: params.get('accountId') ?? '',
          vendorName: params.get('vendorName') ?? '',
          lines,
        });
        setDialogOpen(true);
        window.history.replaceState({}, '', '/islemler');
      }
    }
  }, [currentDate, currentTime]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Line item helpers
  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { ...emptyLine }] }));
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
        // Edit single transaction
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
        // Batch create
        const res = await fetch('/api/transactions/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: form.type,
            date: form.date || currentDate,
            accountId: form.accountId,
            vendorId: form.vendorId,
            vendorName: form.vendorName,
            notes: form.notes,
            lines: validLines.map(l => ({
              categoryId: l.categoryId || null,
              amount: l.amount,
              description: l.description || (categories.find(c => c.id === l.categoryId)?.name ?? 'Diğer'),
            })),
          }),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err?.error); }
        toast.success(`${validLines.length} kalem eklendi`);
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

  const handleDeleteGroup = async () => {
    try {
      if (deleteGroupId.startsWith('single_')) {
        const txId = deleteGroupId.replace('single_', '');
        const res = await fetch(`/api/transactions?id=${txId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
      } else {
        const res = await fetch(`/api/transactions/batch?groupId=${deleteGroupId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
      }
      toast.success('İşlem silindi');
      setDeleteOpen(false);
      loadTransactions();
    } catch {
      toast.error('Silinemedi');
    }
  };

  const handleDeleteSingle = async () => {
    try {
      const res = await fetch(`/api/transactions?id=${deleteSingleId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Kalem silindi');
      setDeleteOpen(false);
      loadTransactions();
    } catch {
      toast.error('Silinemedi');
    }
  };

  const openEdit = (item: GroupedTx['items'][0], group: GroupedTx) => {
    setForm({
      id: item.id,
      type: group.type,
      date: formatDateInput(group.date),
      time: group.date ? new Date(group.date).toTimeString().slice(0, 5) : '',
      accountId: group.accountId,
      vendorId: '',
      vendorName: group.vendorName,
      notes: '',
      lines: [{
        categoryId: item.categoryId ?? '',
        amount: String(item.amount ?? ''),
        description: item.description ?? '',
      }],
    });
    setDialogOpen(true);
  };

  // New account handler
  const handleCreateAccount = async () => {
    if (!newAccName.trim()) { toast.error('Hesap adı gerekli'); return; }
    setSavingAcc(true);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAccName.trim(), type: newAccType }),
      });
      if (!res.ok) throw new Error();
      const acc = await res.json();
      setLocalAccounts(prev => [...prev, { id: acc.id, name: acc.name, type: acc.type }]);
      setForm(f => ({ ...f, accountId: acc.id }));
      setNewAccOpen(false);
      setNewAccName('');
      toast.success('Hesap oluşturuldu');
    } catch {
      toast.error('Hesap oluşturulamadı');
    } finally {
      setSavingAcc(false);
    }
  };

  const filtered = groups.filter(g =>
    (g.vendorName ?? '').toLowerCase().includes((search ?? '').toLowerCase()) ||
    g.items.some(item => (item.description ?? '').toLowerCase().includes((search ?? '').toLowerCase()))
  );

  const filteredCategories = (categories ?? []).filter((c: any) => !form.type || c?.type === form.type);

  return (
    <div className="space-y-4">
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">İşlemler</h1>
            <p className="text-sm text-muted-foreground">Fiş ve belgelerinizi gruplu olarak görüntüleyin</p>
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
          <Input placeholder="Satıcı veya açıklama ara..." value={search} onChange={(e: any) => setSearch(e?.target?.value ?? '')} className="pl-9" />
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

      {/* Grouped Transaction List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Receipt size={32} className="mx-auto mb-2 opacity-40" />
              <p>İşlem bulunamadı</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((group) => {
                const isExpanded = expandedGroups.has(group.groupId);
                return (
                  <div key={group.groupId}>
                    {/* Group Header - Satıcı, Tarih, Toplam */}
                    <div
                      className="flex items-center justify-between p-3 hover:bg-accent/30 transition-colors cursor-pointer"
                      onClick={() => toggleGroup(group.groupId)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${
                          group.type === 'INCOME' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                        }`}>
                          {group.type === 'INCOME' ? <ArrowUpRight size={18} className="text-emerald-500" /> : <ArrowDownRight size={18} className="text-red-500" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold truncate">{group.vendorName}</p>
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {group.items.length} kalem
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {group.accountName} • {formatDate(group.date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-mono font-bold whitespace-nowrap ${
                          group.type === 'INCOME' ? 'text-emerald-500' : 'text-red-500'
                        }`}>
                          {group.type === 'INCOME' ? '+' : '-'}{formatCurrency(group.total)}
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e: any) => { e.stopPropagation(); setDeleteGroupId(group.groupId); setDeleteSingleId(''); setDeleteOpen(true); }}>
                          <Trash2 size={14} />
                        </Button>
                        {isExpanded ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
                      </div>
                    </div>

                    {/* Expanded Detail - Category items */}
                    {isExpanded && (
                      <div className="bg-muted/20 border-t border-border">
                        {group.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between px-6 py-2 pl-14 hover:bg-accent/20 transition-colors">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.categoryColor ?? '#9CA3AF' }} />
                              <span className="text-xs font-medium truncate">{item.categoryName ?? item.description}</span>
                              {item.description && item.categoryName && item.description !== item.categoryName && (
                                <span className="text-xs text-muted-foreground truncate">({item.description})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-mono font-semibold ${
                                group.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'
                              }`}>
                                {formatCurrency(item.amount)}
                              </span>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(item, group)}>
                                <Pencil size={12} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => { setDeleteSingleId(item.id); setDeleteGroupId(''); setDeleteOpen(true); }}>
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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

          {/* Vendor name */}
          {!form.id && (
            <FormField label="Satıcı / Fiş Adı">
              <Input value={form.vendorName} onChange={(e: any) => setForm({ ...form, vendorName: e?.target?.value ?? '' })} placeholder="ör: BİM, A101, Migros" />
            </FormField>
          )}

          {/* Line items */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Kalemler</p>
            {form.lines.map((line, idx) => (
              <div key={idx} className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30">
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
                      <label className="text-xs text-muted-foreground">Tutar</label>
                      <div className="flex items-center gap-1">
                        <input type="number" className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm font-mono" value={line.amount} onChange={(e: any) => updateLine(idx, 'amount', e?.target?.value ?? '')} placeholder="0" />
                        <span className="text-sm text-muted-foreground">₺</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Açıklama</label>
                    <input className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={line.description} onChange={(e: any) => updateLine(idx, 'description', e?.target?.value ?? '')} placeholder="İsteğe bağlı" />
                  </div>
                </div>
                <button onClick={() => removeLine(idx)} className="mt-1 p-1.5 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0" disabled={form.lines.length <= 1}>
                  <Minus size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Total & Add line */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Toplam: <span className="font-mono font-bold">{formatCurrency(totalAmount)}</span></p>
            {!form.id && (
              <button onClick={addLine} className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                <CirclePlus size={20} /> Kalem Ekle
              </button>
            )}
          </div>

          {/* Common fields */}
          <div className="border-t pt-4 space-y-3">
            <FormField label="Hesap" required>
              <div className="flex gap-2">
                <select className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.accountId} onChange={(e: any) => setForm({ ...form, accountId: e?.target?.value ?? '' })}>
                  <option value="">Seçiniz</option>
                  {(localAccounts ?? []).map((a: any) => <option key={a?.id} value={a?.id}>{a?.name}</option>)}
                </select>
                <Button type="button" variant="outline" size="sm" className="h-10 px-3 text-emerald-600 border-emerald-300 hover:bg-emerald-50" onClick={() => setNewAccOpen(true)}>
                  <Plus size={14} />
                </Button>
              </div>
            </FormField>
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
            <FormField label="Notlar">
              <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]" value={form.notes} onChange={(e: any) => setForm({ ...form, notes: e?.target?.value ?? '' })} placeholder="Notlar" />
            </FormField>
          </div>
        </div>
      </CrudDialog>

      {/* New Account Dialog */}
      <CrudDialog
        open={newAccOpen}
        onClose={() => setNewAccOpen(false)}
        title="Yeni Hesap Oluştur"
        onSave={handleCreateAccount}
        saving={savingAcc}
        saveLabel="Oluştur"
      >
        <div className="space-y-3">
          <FormField label="Hesap Adı" required value={newAccName} onChange={(e: any) => setNewAccName(e?.target?.value ?? '')} placeholder="ör: Nakit, Garanti" />
          <FormField label="Hesap Türü" required>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={newAccType} onChange={(e: any) => setNewAccType(e?.target?.value ?? 'CASH')}>
              <option value="CASH">Nakit</option>
              <option value="BANK">Banka</option>
              <option value="CREDIT_CARD">Kredi Kartı</option>
              <option value="OTHER">Diğer</option>
            </select>
          </FormField>
        </div>
      </CrudDialog>

      <DeleteConfirm
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteSingleId ? handleDeleteSingle : handleDeleteGroup}
        title={deleteSingleId ? 'Bu kalemi silmek istediğinize emin misiniz?' : 'Tüm fişi silmek istediğinize emin misiniz?'}
        description={deleteSingleId ? 'Sadece bu kalem silinecek.' : 'Fişe ait tüm kalemler silinecek.'}
      />
    </div>
  );
}
