import { NoonTransaction, WeeklySummary } from '@/types/noonFinancial';

export function parseNoonStatement(data: Record<string, any>[]): NoonTransaction[] {
  return data.map(row => {
    // Parse date - handle multiple possible column names
    const dateStr = row['Date'] || row['date'] || '';
    const date = dateStr ? new Date(dateStr) : new Date();

    // Parse transaction type
    const transactionStr = (row['Transaction'] || row['transaction'] || '').toLowerCase();
    let transaction: NoonTransaction['transaction'] = 'statement';
    if (transactionStr.includes('invoice')) transaction = 'invoice';
    else if (transactionStr.includes('payout')) transaction = 'payout';
    else if (transactionStr.includes('contract_transfer')) transaction = 'contract_transfer';

    // Parse amounts - remove commas and parse as float
    const parseAmount = (value: any): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const cleaned = value.replace(/,/g, '');
        return parseFloat(cleaned) || 0;
      }
      return 0;
    };

    return {
      contract: row['Contract'] || row['contract'] || '',
      contractTitle: row['Contract Title'] || row['contract_title'] || '',
      date,
      transaction,
      reference: row['Reference'] || row['reference'] || '',
      detailsEN: row['Details EN'] || row['details_en'] || row['Details'] || '',
      amount: parseAmount(row['Amount'] || row['amount']),
      totalDue: parseAmount(row['Total Due'] || row['total_due']),
    };
  });
}

export function groupTransactionsByWeek(transactions: NoonTransaction[]): WeeklySummary[] {
  // Group by reference (each reference = 1 week)
  const weeklyMap = new Map<string, NoonTransaction[]>();

  transactions.forEach(transaction => {
    if (!transaction.reference) return;
    
    if (!weeklyMap.has(transaction.reference)) {
      weeklyMap.set(transaction.reference, []);
    }
    weeklyMap.get(transaction.reference)!.push(transaction);
  });

  // Calculate summaries for each week
  const summaries: WeeklySummary[] = [];

  weeklyMap.forEach((weekTransactions, reference) => {
    // Sort by date to get the latest date as week end
    const sortedTransactions = [...weekTransactions].sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );

    const weekEndDate = sortedTransactions[0].date;

    // Calculate totals
    let netProceeds = 0;
    let totalFees = 0;
    let vatAmount = 0;
    let payoutAmount = 0;
    let netAmount = 0;
    const feeBreakdown: Record<string, number> = {};

    weekTransactions.forEach(transaction => {
      const amount = transaction.amount;
      
      if (transaction.transaction === 'payout') {
        payoutAmount += amount;
      } else if (transaction.transaction === 'invoice') {
        vatAmount += amount;
      } else {
        // Statement transactions
        if (amount > 0) {
          netProceeds += amount;
        } else {
          totalFees += Math.abs(amount);
          
          // Group fees by details
          const feeType = transaction.detailsEN;
          if (!feeBreakdown[feeType]) {
            feeBreakdown[feeType] = 0;
          }
          feeBreakdown[feeType] += Math.abs(amount);
        }
      }
      
      netAmount = transaction.totalDue;
    });

    summaries.push({
      reference,
      weekEndDate,
      netProceeds,
      totalFees,
      vatAmount,
      payoutAmount,
      netAmount,
      transactions: weekTransactions,
      feeBreakdown,
    });
  });

  // Sort by date (most recent first)
  return summaries.sort((a, b) => b.weekEndDate.getTime() - a.weekEndDate.getTime());
}
