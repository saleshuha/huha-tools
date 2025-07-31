import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Download, TrendingUp, TrendingDown } from "lucide-react";

interface ItemProfitTableProps {
  profitData: any[];
}

export function ItemProfitTable({ profitData }: ItemProfitTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("finalProfit");
  const [sortOrder, setSortOrder] = useState("desc");
  const [filterBy, setFilterBy] = useState("all");

  if (!profitData || profitData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Item Profit Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No profit data available</p>
        </CardContent>
      </Card>
    );
  }

  // Filter and sort data
  let filteredData = profitData.filter(item => {
    const matchesSearch = 
      (item.itemName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (item.sku?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (item.asin?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesFilter = 
      filterBy === "all" ||
      (filterBy === "profitable" && (item.finalProfit || 0) > 0) ||
      (filterBy === "unprofitable" && (item.finalProfit || 0) <= 0) ||
      (filterBy === "returns" && (item.returnLoss || 0) > 0);

    return matchesSearch && matchesFilter;
  });

  filteredData.sort((a, b) => {
    const aValue = a[sortBy] || 0;
    const bValue = b[sortBy] || 0;
    return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
  });

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const getProfitBadge = (profit: number) => {
    if (profit > 0) return <Badge className="bg-green-500">{formatCurrency(profit)}</Badge>;
    if (profit < 0) return <Badge variant="destructive">{formatCurrency(profit)}</Badge>;
    return <Badge variant="secondary">{formatCurrency(profit)}</Badge>;
  };

  const getMarginBadge = (margin: number) => {
    if (margin > 20) return <Badge className="bg-green-500">{formatPercentage(margin)}</Badge>;
    if (margin > 10) return <Badge className="bg-yellow-500">{formatPercentage(margin)}</Badge>;
    if (margin > 0) return <Badge className="bg-orange-500">{formatPercentage(margin)}</Badge>;
    return <Badge variant="destructive">{formatPercentage(margin)}</Badge>;
  };

  const exportToCSV = () => {
    const headers = [
      'Item Name', 'SKU', 'ASIN', 'Selling Price', 'Cost Price', 'Gross Profit',
      'Return Loss', 'Final Profit', 'Profit Margin (%)', 'VAT Amount', 'Commission', 'Net Payout'
    ];
    
    const csvData = filteredData.map(item => [
      item.itemName || '',
      item.sku || '',
      item.asin || '',
      item.sellingPrice || 0,
      item.costPrice || 0,
      item.grossProfit || 0,
      item.returnLoss || 0,
      item.finalProfit || 0,
      item.profitMargin || 0,
      item.vatAmount || 0,
      item.commissionAmount || 0,
      item.netPayout || 0
    ]);

    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'profit-analysis.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items, SKU, or ASIN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              
              <Select value={filterBy} onValueChange={setFilterBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="profitable">Profitable Only</SelectItem>
                  <SelectItem value="unprofitable">Unprofitable Only</SelectItem>
                  <SelectItem value="returns">With Returns</SelectItem>
                </SelectContent>
              </Select>

              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-');
                setSortBy(field);
                setSortOrder(order);
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="finalProfit-desc">Highest Profit</SelectItem>
                  <SelectItem value="finalProfit-asc">Lowest Profit</SelectItem>
                  <SelectItem value="profitMargin-desc">Highest Margin</SelectItem>
                  <SelectItem value="profitMargin-asc">Lowest Margin</SelectItem>
                  <SelectItem value="sellingPrice-desc">Highest Revenue</SelectItem>
                  <SelectItem value="returnLoss-desc">Highest Return Loss</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={exportToCSV} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredData.length} of {profitData.length} items
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Item Profit Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU/ASIN</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead className="text-right">Cost Price</TableHead>
                  <TableHead className="text-right">Gross Profit</TableHead>
                  <TableHead className="text-right">Return Loss</TableHead>
                  <TableHead className="text-right">Final Profit</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Net Payout</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium max-w-48">
                      <div className="truncate" title={item.itemName}>
                        {item.itemName || 'Unknown Item'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {item.sku && <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>}
                        {item.asin && <div className="text-xs text-muted-foreground">ASIN: {item.asin}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.sellingPrice || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.costPrice || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={`font-medium ${(item.grossProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(item.grossProfit || 0)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-red-600">
                        {formatCurrency(item.returnLoss || 0)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {getProfitBadge(item.finalProfit || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {getMarginBadge(item.profitMargin || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.netPayout || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}