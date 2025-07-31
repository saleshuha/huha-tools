import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, DollarSign, Package, RefreshCw } from "lucide-react";
import { NoonTransaction, SalesSummary, ReturnsSummary } from "@/types/noon-sales";

interface NoonSalesStructureProps {
  transactions: NoonTransaction[];
  salesSummary: SalesSummary;
  returnsSummary: ReturnsSummary;
}

const NoonSalesStructure = ({ transactions, salesSummary, returnsSummary }: NoonSalesStructureProps) => {
  const [selectedTransaction, setSelectedTransaction] = useState<NoonTransaction | null>(null);

  const salesTransactions = transactions.filter(t => t.document_type === 'Invoice');
  const returnTransactions = transactions.filter(t => t.document_type === 'Creditnote');

  const formatCurrency = (amount?: number) => {
    if (!amount) return "0.00";
    return new Intl.NumberFormat('en-AE', { 
      style: 'currency', 
      currency: 'AED',
      minimumFractionDigits: 2 
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(salesSummary.total_gross_sales)}</div>
            <p className="text-xs text-muted-foreground">
              {salesSummary.transaction_count} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Received</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(salesSummary.total_net_received)}</div>
            <p className="text-xs text-muted-foreground">
              After commissions & fees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(returnsSummary.total_returns)}</div>
            <p className="text-xs text-muted-foreground">
              {returnsSummary.return_count} returns ({returnsSummary.return_rate.toFixed(1)}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deductions</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(returnsSummary.total_deducted)}</div>
            <p className="text-xs text-muted-foreground">
              Return charges & fees
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Sales Transactions
          </TabsTrigger>
          <TabsTrigger value="returns" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Returns & Credits
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Financial Breakdown
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Sales Transactions (Invoices)</CardTitle>
              <CardDescription>
                All sales invoices with commission and fee calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Nr</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Gross Sale</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Net Received</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesTransactions.map((transaction, index) => (
                    <TableRow 
                      key={index}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedTransaction(transaction)}
                    >
                      <TableCell className="font-medium">{transaction.invoice_nr}</TableCell>
                      <TableCell>{transaction.document_date}</TableCell>
                      <TableCell>{transaction.sku}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {transaction.description}
                      </TableCell>
                      <TableCell>{formatCurrency(transaction.price_including_vat_doc_currency)}</TableCell>
                      <TableCell>{formatCurrency(transaction.commission_amount)}</TableCell>
                      <TableCell>{formatCurrency(transaction.net_amount_received)}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.has_return ? "destructive" : "default"}>
                          {transaction.has_return ? "Returned" : "Completed"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="returns">
          <Card>
            <CardHeader>
              <CardTitle>Returns & Credit Notes</CardTitle>
              <CardDescription>
                All return transactions with associated charges and deductions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Credit Note Nr</TableHead>
                    <TableHead>Original Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Return Amount</TableHead>
                    <TableHead>Return Charges</TableHead>
                    <TableHead>Amount Deducted</TableHead>
                    <TableHead>Net Refund</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnTransactions.map((transaction, index) => (
                    <TableRow 
                      key={index}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedTransaction(transaction)}
                    >
                      <TableCell className="font-medium">{transaction.credit_note_nr}</TableCell>
                      <TableCell>{transaction.original_invoice_nr || transaction.invoice_nr}</TableCell>
                      <TableCell>{transaction.document_date}</TableCell>
                      <TableCell>{transaction.sku}</TableCell>
                      <TableCell>{formatCurrency(transaction.price_including_vat_doc_currency)}</TableCell>
                      <TableCell>{formatCurrency(transaction.return_charges)}</TableCell>
                      <TableCell>{formatCurrency(transaction.amount_deducted)}</TableCell>
                      <TableCell>{formatCurrency(transaction.refund_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sales Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Sales Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Gross Sales</span>
                  <span className="font-bold">{formatCurrency(salesSummary.total_gross_sales)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-red-600">
                  <span>Commission</span>
                  <span>-{formatCurrency(salesSummary.total_commission)}</span>
                </div>
                <div className="flex justify-between items-center text-red-600">
                  <span>Shipping Fees</span>
                  <span>-{formatCurrency(salesSummary.total_shipping_fees)}</span>
                </div>
                <div className="flex justify-between items-center text-red-600">
                  <span>Other Fees</span>
                  <span>-{formatCurrency(salesSummary.total_other_fees)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-green-600 font-bold">
                  <span>Net Received</span>
                  <span>{formatCurrency(salesSummary.total_net_received)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Returns Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Returns & Charges Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Returns</span>
                  <span className="font-bold">{formatCurrency(returnsSummary.total_returns)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-red-600">
                  <span>Return Charges</span>
                  <span>-{formatCurrency(returnsSummary.total_return_charges)}</span>
                </div>
                <div className="flex justify-between items-center text-red-600">
                  <span>Total Deducted</span>
                  <span>-{formatCurrency(returnsSummary.total_deducted)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-green-600 font-bold">
                  <span>Net Refunded</span>
                  <span>{formatCurrency(returnsSummary.total_refunded)}</span>
                </div>
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Return Rate</div>
                  <div className="text-lg font-bold">{returnsSummary.return_rate.toFixed(1)}%</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
            <CardDescription>
              {selectedTransaction.document_type} - {selectedTransaction.invoice_nr || selectedTransaction.credit_note_nr}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Transaction Info</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Type:</strong> {selectedTransaction.document_type}</div>
                  <div><strong>Date:</strong> {selectedTransaction.document_date}</div>
                  <div><strong>SKU:</strong> {selectedTransaction.sku}</div>
                  <div><strong>Description:</strong> {selectedTransaction.description}</div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Financial Details</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Price (Excl. VAT):</strong> {formatCurrency(selectedTransaction.price_excluding_vat_doc_currency)}</div>
                  <div><strong>VAT Amount:</strong> {formatCurrency(selectedTransaction.vat_amount_doc_currency)}</div>
                  <div><strong>Total Amount:</strong> {formatCurrency(selectedTransaction.price_including_vat_doc_currency)}</div>
                  <div><strong>Currency:</strong> {selectedTransaction.document_currency}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NoonSalesStructure;