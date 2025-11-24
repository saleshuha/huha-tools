import { useState } from 'react';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { NoonTransaction } from '@/types/noonFinancial';
import { Search } from 'lucide-react';
import { format } from 'date-fns';

interface TransactionTableProps {
  transactions: NoonTransaction[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = transactions.filter(transaction => {
    const search = searchTerm.toLowerCase();
    return (
      transaction.reference.toLowerCase().includes(search) ||
      transaction.detailsEN.toLowerCase().includes(search) ||
      transaction.contract.toLowerCase().includes(search)
    );
  });

  const getTransactionBadge = (type: NoonTransaction['transaction']) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      statement: 'default',
      invoice: 'secondary',
      payout: 'outline',
      contract_transfer: 'destructive',
    };
    
    return (
      <Badge variant={variants[type] || 'default'} className="capitalize">
        {type.replace('_', ' ')}
      </Badge>
    );
  };

  const getAmountColor = (amount: number) => {
    if (amount > 0) return 'text-green-600 dark:text-green-400';
    if (amount < 0) return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  return (
    <Card className="glass-container p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">All Transactions</h3>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by reference, details, or contract..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Total Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {format(transaction.date, 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>{getTransactionBadge(transaction.transaction)}</TableCell>
                    <TableCell className="text-xs font-mono">{transaction.reference}</TableCell>
                    <TableCell className="max-w-xs truncate">{transaction.detailsEN}</TableCell>
                    <TableCell className={`text-right font-semibold ${getAmountColor(transaction.amount)}`}>
                      {transaction.amount >= 0 ? '+' : ''}
                      {transaction.amount.toFixed(2)} SAR
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {transaction.totalDue.toFixed(2)} SAR
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="text-sm text-muted-foreground">
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </div>
      </div>
    </Card>
  );
}
