// ---------------------------------------------------------------------------
// Domain types matching the Prisma schema
// ---------------------------------------------------------------------------

export type AccountType = 'BANK' | 'CREDIT_CARD' | 'CASH' | 'OTHER';
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type DebtStatus = 'ACTIVE' | 'PAID' | 'PARTIAL';
export type DebtDirection = 'DEBT' | 'CREDIT';
export type DocumentStatus = 'PENDING' | 'PROCESSED' | 'FAILED';
export type DocumentFileType = 'IMAGE' | 'PDF';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  color: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreditCard {
  id: string;
  name: string;
  accountId: string;
  creditLimit: number;
  currentUsage: number;
  interestRate: number | null;
  billingDay: number | null;
  dueDay: number | null;
  autoPayment: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  type: 'INCOME' | 'EXPENSE' | 'BOTH';
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  balance: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  accountId: string;
  categoryId: string | null;
  vendorId: string | null;
  documentId: string | null;
  groupId: string | null;
  groupLabel: string | null;
  transferToAccountId: string | null;
  account?: Account;
  category?: Category | null;
  vendor?: Vendor | null;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  name: string;
  amount: number;
  spent: number;
  color: string;
  period: 'WEEKLY' | 'MONTHLY';
  startDate: string;
  endDate: string;
  categoryId: string | null;
  category?: Category | null;
  createdAt: string;
  updatedAt: string;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  date: string;
  note: string | null;
  createdAt: string;
}

export interface DebtCredit {
  id: string;
  direction: DebtDirection;
  personName: string;
  amount: number;
  remaining: number;
  status: DebtStatus;
  dueDate: string | null;
  description: string | null;
  payments?: DebtPayment[];
  createdAt: string;
  updatedAt: string;
}

export interface Installment {
  id: string;
  name: string;
  totalAmount: number;
  installmentCount: number;
  paidCount: number;
  monthlyAmount: number;
  startDate: string;
  accountId: string;
  categoryId: string | null;
  account?: Account;
  category?: Category | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlannedPayment {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  isRecurring: boolean;
  recurringPeriod: 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null;
  accountId: string | null;
  categoryId: string | null;
  account?: Account | null;
  category?: Category | null;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  billingDay: number;
  accountId: string | null;
  categoryId: string | null;
  color: string | null;
  account?: Account | null;
  category?: Category | null;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  fileName: string;
  fileType: DocumentFileType;
  cloudStoragePath: string;
  status: DocumentStatus;
  ocrData: Record<string, unknown> | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Legacy / form types (kept for compatibility)
// ---------------------------------------------------------------------------

export type Expense = {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: Date;
};

export type ExpenseFormData = Omit<Expense, 'id' | 'date'> & {
  date: string;
};

export type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};
