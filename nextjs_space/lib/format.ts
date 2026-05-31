export function formatCurrency(amount: number | null | undefined): string {
  const val = amount ?? 0;
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(val);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatDateInput(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0] ?? '';
}

export function getMonthName(month: number): string {
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return months[month] ?? '';
}

export function getTransactionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    INCOME: 'Gelir',
    EXPENSE: 'Gider',
    TRANSFER: 'Transfer',
  };
  return labels[type] ?? type;
}

export function getAccountTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    BANK: 'Banka',
    CREDIT_CARD: 'Kredi Kartı',
    CASH: 'Nakit',
    OTHER: 'Diğer',
  };
  return labels[type] ?? type;
}
