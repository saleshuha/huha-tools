export interface NoonTransaction {
  contract: string;
  contractTitle: string;
  date: Date;
  transaction: 'statement' | 'invoice' | 'payout' | 'contract_transfer';
  reference: string;
  detailsEN: string;
  amount: number;
  totalDue: number;
}

export interface WeeklySummary {
  reference: string;
  weekEndDate: Date;
  netProceeds: number;
  totalFees: number;
  vatAmount: number;
  payoutAmount: number;
  netAmount: number;
  transactions: NoonTransaction[];
  feeBreakdown: Record<string, number>;
}
