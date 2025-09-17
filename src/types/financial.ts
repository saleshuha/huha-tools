export type FinancialRecordType = 'loan' | 'expense' | 'debt' | 'other';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';

export interface FinancialRecord {
  id: string;
  user_id: string;
  type: FinancialRecordType;
  person_name: string;
  description: string;
  amount: number;
  currency: string;
  payment_status: PaymentStatus;
  due_date: string | null;
  payment_date: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
  country: string;
}

export interface FinancialMetrics {
  totalOutstanding: number;
  totalPaid: number;
  totalOverdue: number;
  totalRecords: number;
  byType: Record<FinancialRecordType, number>;
  byStatus: Record<PaymentStatus, number>;
}