'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CrudDialog } from '@/components/crud-dialog';
import { DeleteConfirm } from '@/components/delete-confirm';
import { FormField } from '@/components/form-field';
import { FadeIn, SlideIn } from '@/components/ui/animate';
import { toast } from 'sonner';
import { formatCurrency, formatDate, getAccountTypeLabel } from '@/lib/format';
import { Plus, Pencil, Trash2, Wallet, Building2, CreditCard, Banknote, ChevronDown, ChevronRight, FileText, Receipt } from 'lucide-react';

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

interface DocGroup {
  groupId: string;
  vendorName: string;
  date: string;
  type: string;
  total: number;
  groupLabel: string | null;
  documentNo: string | null;
  itemCount: number;
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
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  const [docGroups, setDocGroups] = useState<DocGroup[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const [docTotals, setDocTotals] = useState({ income: 0, expense: 0 });

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

  const loadAccountTransactions = useCallback(async (accountId: string) => {
    setDocLoading(true);
    try {
      const res = await fetch(`/api/transactions?accountId=${accountId}&limit=500`);
      const data = await res.json();
      const txs = data?.transactions ?? [];

      // Group by groupId or single transaction
      const groupMap = new Map<string, DocGroup>();
      let totalIncome = 0;
      let totalExpense = 0;

      for (const tx of txs) {
        const key = tx.groupId || `single_${tx.id}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            groupId: key,
            vendorName: tx.vendor?.name || tx.groupLabel || tx.description || 'İşlem',
            date: tx.date,
            type: tx.type,
            total: 0,
            groupLabel: tx.groupLabel || null,
            documentNo: tx.documentNo || null,
            itemCount: 0,
          });
        }
        const group = groupMap.get(key)!;
        group.total += tx.amount ?? 0;
        group.itemCount += 1;

        if (tx.type === 'INCOME') totalIncome += tx.amount ?? 0;
        else if (tx.type === 'EXPENSE') totalExpense += tx.amount ?? 0;
      }

      setDocGroups(Array.from(groupMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setDocTotals({ income: totalIncome, expense: totalExpense });
    } catch {
      toast.error('İşlemler yüklenemedi');
    } finally {
      setDocLoading(false);
    }
  }, []);

  const toggleAccountExpand = (accountId: string) => {
    if (expandedAccountId === accountId) {
      setExpandedAccountId(null);
      setDocGroups([]);
    } else {
      setExpandedAccountId(accountId);
      loadAccountTransactions(accountId);
    }
  };

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

      <div className="grid grid-cols-1 gap-3">
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
            const isExpanded = expandedAccountId === a?.id;
            return (
              <SlideIn key={a?.id} from="bottom" delay={i * 0.05}>
                <Card className={`hover:shadow-md transition-shadow ${!a?.isActive ? 'opacity-50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => toggleAccountExpand(a?.id)}>
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${a?.color ?? '#10B981'}20` }}>
                          <Icon size={20} style={{ color: a?.color ?? '#10B981' }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">{a?.name}</p>
                          <p className="text-xs text-muted-foreground">{getAccountTypeLabel(a?.type)}</p>
                          {a?.bankName && <p className="text-xs text-muted-foreground">{a.bankName}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className={`text-lg font-bold font-mono ${(a?.balance ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {formatCurrency(a?.balance)}
                            </p>
                            {a?.currency !== 'TRY' && (
                              <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">{getCurrencySymbol(a?.currency)} {a?.currency}</span>
                            )}
                          </div>
                          {isExpanded ? <ChevronDown size={18} className="text-muted-foreground flex-shrink-0" /> : <ChevronRight size={18} className="text-muted-foreground flex-shrink-0" />}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
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

                    {/* Expanded document summary */}
                    {isExpanded && (
                      <div className="mt-4 border-t pt-3">
                        {docLoading ? (
                          <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, j) => (
                              <div key={j} className="h-10 bg-muted/50 rounded animate-pulse" />
                            ))}
                          </div>
                        ) : docGroups.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-3">Bu hesaba ait işlem bulunamadı</p>
                        ) : (
                          <>
                            {/* Summary totals */}
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 text-center">
                                <p className="text-xs text-muted-foreground">Toplam Gelir</p>
                                <p className="text-sm font-bold text-emerald-600 font-mono">{formatCurrency(docTotals.income)}</p>
                              </div>
                              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-center">
                                <p className="text-xs text-muted-foreground">Toplam Gider</p>
                                <p className="text-sm font-bold text-red-500 font-mono">{formatCurrency(docTotals.expense)}</p>
                              </div>
                            </div>

                            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                              <FileText size={12} /> Belge Bazlı Hareketler ({docGroups.length} belge)
                            </p>

                            <div className="space-y-1 max-h-[400px] overflow-y-auto">
                              {docGroups.map((group) => (
                                <div key={group.groupId} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <Receipt size={14} className={`flex-shrink-0 ${group.type === 'INCOME' ? 'text-emerald-500' : group.type === 'TRANSFER' ? 'text-blue-500' : 'text-red-400'}`} />
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <p className="text-sm font-medium truncate">{group.vendorName}</p>
                                        {group.groupLabel && (
                                          <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1 py-0.5 rounded">
                                            {group.groupLabel}
                                          </span>
                                        )}
                                        {group.itemCount > 1 && (
                                          <span className="text-[10px] bg-muted px-1 py-0.5 rounded text-muted-foreground">{group.itemCount} kalem</span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-muted-foreground">
                                        {formatDate(group.date)}
                                        {group.documentNo && <span> • No: {group.documentNo}</span>}
                                      </p>
                                    </div>
                                  </div>
                                  <p className={`text-sm font-bold font-mono flex-shrink-0 ml-2 ${group.type === 'INCOME' ? 'text-emerald-500' : group.type === 'TRANSFER' ? 'text-blue-500' : 'text-red-500'}`}>
                                    {group.type === 'INCOME' ? '+' : group.type === 'TRANSFER' ? '' : '-'}{formatCurrency(Math.abs(group.total))}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
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
