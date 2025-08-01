import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NoonOrderFeesData } from "@/types/noon-fees";
import { Search, Download, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface NoonFeesTableProps {
  feesData: NoonOrderFeesData[];
}

export function NoonFeesTable({ feesData }: NoonFeesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'delivered': 'bg-green-100 text-green-800',
      'shipped': 'bg-blue-100 text-blue-800',
      'cancelled': 'bg-red-100 text-red-800',
      'returned': 'bg-orange-100 text-orange-800',
      'pending': 'bg-yellow-100 text-yellow-800'
    };

    return (
      <Badge className={statusColors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const filteredData = feesData.filter(order =>
    order.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.order_nr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.product_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.brand?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  const calculateTotalFees = (order: NoonOrderFeesData) => {
    return (
      (order.fee_referral || 0) +
      (order.fee_shipping || 0) +
      (order.fee_noon_promo || 0) +
      (order.fee_noon_markup || 0) +
      (order.fee_outbound_fbn || 0) +
      (order.fee_weight_handling || 0) +
      (order.fee_crossdock || 0) +
      (order.fee_directship_outbound || 0) +
      (order.fee_damaged_return || 0) +
      (order.fee_noon_penalty || 0) +
      (order.fee_item_cancellation || 0) +
      (order.fee_warranty_penalty || 0) +
      (order.fee_retention_penalty || 0) +
      (order.fee_alternate_seller_fulfillment || 0) +
      (order.fee_miscellaneous || 0) +
      (order.fee_direct_collection || 0) +
      (order.fee_reinvoicing || 0)
    );
  };

  const exportToCSV = () => {
    const headers = [
      'Order Number', 'SKU', 'Product Title', 'Brand', 'Status',
      'Ordered Date', 'Delivered Date', 'Invoice Price', 'Total Fees', 'Net Payment'
    ];
    
    const csvData = filteredData.map(order => [
      order.order_nr,
      order.sku,
      order.product_title,
      order.brand,
      order.item_status,
      formatDate(order.ordered_date),
      formatDate(order.delivered_date),
      order.invoice_price || 0,
      calculateTotalFees(order),
      order.total_payment || 0
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'noon_fees_data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>Order Level Fees Details</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by SKU, Order Number, Product Title, or Brand..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Product Title</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ordered Date</TableHead>
                <TableHead>Delivered Date</TableHead>
                <TableHead className="text-right">Invoice Price</TableHead>
                <TableHead className="text-right">Total Fees</TableHead>
                <TableHead className="text-right">Net Payment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.map((order, index) => (
                <TableRow key={`${order.order_nr}-${order.item_nr}-${index}`}>
                  <TableCell className="font-medium">{order.order_nr}</TableCell>
                  <TableCell>{order.sku}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={order.product_title}>
                    {order.product_title}
                  </TableCell>
                  <TableCell>{order.brand}</TableCell>
                  <TableCell>{getStatusBadge(order.item_status)}</TableCell>
                  <TableCell>{formatDate(order.ordered_date)}</TableCell>
                  <TableCell>{formatDate(order.delivered_date)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(order.invoice_price || 0)}</TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(calculateTotalFees(order))}
                  </TableCell>
                  <TableCell className="text-right text-green-600 font-semibold">
                    {formatCurrency(order.total_payment || 0)}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Order Details - {order.order_nr}</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <h4 className="font-semibold">Order Information</h4>
                            <div className="space-y-2 text-sm">
                              <div><strong>Order Number:</strong> {order.order_nr}</div>
                              <div><strong>Item Number:</strong> {order.item_nr}</div>
                              <div><strong>AWB Number:</strong> {order.awb_nr}</div>
                              <div><strong>SKU:</strong> {order.sku}</div>
                              <div><strong>Partner SKU:</strong> {order.partner_sku}</div>
                              <div><strong>Status:</strong> {getStatusBadge(order.item_status)}</div>
                              <div><strong>Fulfillment Mode:</strong> {order.fulfillment_mode}</div>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <h4 className="font-semibold">Product Information</h4>
                            <div className="space-y-2 text-sm">
                              <div><strong>Title:</strong> {order.product_title}</div>
                              <div><strong>Brand:</strong> {order.brand}</div>
                              <div><strong>Family:</strong> {order.family}</div>
                              <div><strong>Product Type:</strong> {order.product_type}</div>
                              <div><strong>Country:</strong> {order.country_code}</div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-semibold">Pricing Details</h4>
                            <div className="space-y-2 text-sm">
                              <div><strong>Seller Price:</strong> {formatCurrency(order.seller_price || 0)}</div>
                              <div><strong>Base Price:</strong> {formatCurrency(order.base_price || 0)}</div>
                              <div><strong>Offer Price:</strong> {formatCurrency(order.offer_price || 0)}</div>
                              <div><strong>Invoice Price:</strong> {formatCurrency(order.invoice_price || 0)}</div>
                              <div><strong>Total Payment:</strong> <span className="text-green-600 font-semibold">{formatCurrency(order.total_payment || 0)}</span></div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-semibold">Fee Breakdown</h4>
                            <div className="space-y-2 text-sm">
                              <div><strong>Referral Fee:</strong> {formatCurrency(order.fee_referral || 0)}</div>
                              <div><strong>Shipping Fee:</strong> {formatCurrency(order.fee_shipping || 0)}</div>
                              <div><strong>FBN Outbound:</strong> {formatCurrency(order.fee_outbound_fbn || 0)}</div>
                              <div><strong>Weight Handling:</strong> {formatCurrency(order.fee_weight_handling || 0)}</div>
                              <div><strong>Penalty Fees:</strong> {formatCurrency((order.fee_noon_penalty || 0) + (order.fee_warranty_penalty || 0))}</div>
                              <div><strong>Total Fees:</strong> <span className="text-red-600 font-semibold">{formatCurrency(calculateTotalFees(order))}</span></div>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} orders
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}