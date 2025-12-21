import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Download, Printer, CheckCircle, AlertTriangle, XCircle, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MatchedItem, MatchingSummary } from '@/hooks/useInventoryMatching';
import { MatchingSummaryCards } from './MatchingSummaryCards';

interface MatchingResultsDisplayProps {
  results: MatchedItem[];
  summary: MatchingSummary;
  sessionName: string;
  onExportCSV: () => void;
  onPrint: () => void;
  printRef: React.RefObject<HTMLDivElement>;
}

type SortField = 'identifier' | 'requiredQty' | 'inStockQty' | 'shortageQty' | 'status';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'in-stock' | 'partial' | 'out-of-stock';

export function MatchingResultsDisplay({
  results,
  summary,
  sessionName,
  onExportCSV,
  onPrint,
  printRef
}: MatchingResultsDisplayProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Filter and sort results
  const filteredResults = useMemo(() => {
    let filtered = results;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.identifier.toLowerCase().includes(term) ||
        (item.title?.toLowerCase().includes(term))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'identifier':
          comparison = a.identifier.localeCompare(b.identifier);
          break;
        case 'requiredQty':
          comparison = a.requiredQty - b.requiredQty;
          break;
        case 'inStockQty':
          comparison = a.inStockQty - b.inStockQty;
          break;
        case 'shortageQty':
          comparison = a.shortageQty - b.shortageQty;
          break;
        case 'status':
          const statusOrder = { 'out-of-stock': 0, 'partial': 1, 'in-stock': 2 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [results, searchTerm, statusFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getStatusBadge = (status: 'in-stock' | 'partial' | 'out-of-stock') => {
    switch (status) {
      case 'in-stock':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/30 gap-1">
            <CheckCircle className="w-3 h-3" />
            In Stock
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/30 gap-1">
            <AlertTriangle className="w-3 h-3" />
            Partial
          </Badge>
        );
      case 'out-of-stock':
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/30 gap-1">
            <XCircle className="w-3 h-3" />
            Out of Stock
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <MatchingSummaryCards summary={summary} />

      {/* Controls */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by ASIN/SKU or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            <span className="text-sm text-muted-foreground">
              Showing {filteredResults.length} of {results.length} items
            </span>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onExportCSV} className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={onPrint} className="gap-2">
              <Printer className="w-4 h-4" />
              Print
            </Button>
          </div>
        </div>
      </Card>

      {/* Results Table */}
      <Card className="overflow-hidden">
        <div className="max-h-[500px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('identifier')}
                >
                  <div className="flex items-center gap-1">
                    ASIN/SKU
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('requiredQty')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Required
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('inStockQty')}
                >
                  <div className="flex items-center justify-end gap-1">
                    In Stock
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead 
                  className="text-right cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('shortageQty')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Shortage
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map((item, index) => (
                <TableRow key={`${item.identifier}-${index}`} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-sm">
                    <div>
                      {item.identifier}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({item.identifierType.toUpperCase()})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">
                    {item.title || <span className="text-muted-foreground italic">No title</span>}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {item.requiredQty}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-medium tabular-nums",
                    item.inStockQty > 0 ? "text-green-600" : "text-muted-foreground"
                  )}>
                    {item.inStockQty}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right tabular-nums",
                    item.pendingQty > 0 ? "text-blue-600" : "text-muted-foreground"
                  )}>
                    {item.pendingQty}
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-medium tabular-nums",
                    item.shortageQty > 0 ? "text-red-600" : "text-muted-foreground"
                  )}>
                    {item.shortageQty > 0 ? `-${item.shortageQty}` : '0'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(item.status)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Hidden print document */}
      <div className="hidden">
        <div ref={printRef}>
          <MatchingPrintContent results={results} summary={summary} sessionName={sessionName} />
        </div>
      </div>
    </div>
  );
}

// Print-friendly content component
function MatchingPrintContent({ 
  results, 
  summary, 
  sessionName 
}: { 
  results: MatchedItem[]; 
  summary: MatchingSummary;
  sessionName: string;
}) {
  return (
    <div className="p-8 font-sans">
      <style>
        {`
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        `}
      </style>
      
      {/* Header */}
      <div className="text-center mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold">Inventory Matching Report</h1>
        <p className="text-gray-600">{sessionName}</p>
        <p className="text-sm text-gray-500">Generated: {new Date().toLocaleString()}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border p-4 rounded text-center">
          <p className="text-2xl font-bold">{summary.totalItems}</p>
          <p className="text-sm text-gray-600">Total Items</p>
        </div>
        <div className="border p-4 rounded text-center" style={{ borderColor: '#22c55e' }}>
          <p className="text-2xl font-bold" style={{ color: '#22c55e' }}>{summary.inStockCount}</p>
          <p className="text-sm text-gray-600">In Stock</p>
        </div>
        <div className="border p-4 rounded text-center" style={{ borderColor: '#f97316' }}>
          <p className="text-2xl font-bold" style={{ color: '#f97316' }}>{summary.partialCount}</p>
          <p className="text-sm text-gray-600">Partial</p>
        </div>
        <div className="border p-4 rounded text-center" style={{ borderColor: '#ef4444' }}>
          <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>{summary.outOfStockCount}</p>
          <p className="text-sm text-gray-600">Out of Stock</p>
        </div>
        <div className="border p-4 rounded text-center">
          <p className="text-2xl font-bold">{summary.totalRequired}</p>
          <p className="text-sm text-gray-600">Total Required</p>
        </div>
        <div className="border p-4 rounded text-center" style={{ borderColor: '#ef4444' }}>
          <p className="text-2xl font-bold" style={{ color: '#ef4444' }}>{summary.totalShortage}</p>
          <p className="text-sm text-gray-600">Total Shortage</p>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">ASIN/SKU</th>
            <th className="border p-2 text-left">Title</th>
            <th className="border p-2 text-right">Required</th>
            <th className="border p-2 text-right">In Stock</th>
            <th className="border p-2 text-right">Shortage</th>
            <th className="border p-2 text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {results.map((item, index) => (
            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="border p-2 font-mono">{item.identifier}</td>
              <td className="border p-2 max-w-[200px] truncate">{item.title || '-'}</td>
              <td className="border p-2 text-right">{item.requiredQty}</td>
              <td className="border p-2 text-right">{item.inStockQty}</td>
              <td className="border p-2 text-right" style={{ color: item.shortageQty > 0 ? '#ef4444' : 'inherit' }}>
                {item.shortageQty > 0 ? `-${item.shortageQty}` : '0'}
              </td>
              <td className="border p-2 text-center">
                <span style={{ 
                  color: item.status === 'in-stock' ? '#22c55e' : 
                         item.status === 'partial' ? '#f97316' : '#ef4444'
                }}>
                  {item.status === 'in-stock' ? '✓ In Stock' : 
                   item.status === 'partial' ? '⚠ Partial' : '✗ Out of Stock'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
