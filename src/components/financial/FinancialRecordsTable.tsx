import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import { EditFinancialRecordDialog } from './EditFinancialRecordDialog';
import { FinancialRecord, FinancialRecordType, PaymentStatus } from '@/types/financial';
import { Edit, Trash2, CheckCircle, Search, Calendar } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface FinancialRecordsTableProps {
  records: FinancialRecord[];
  onUpdate: (id: string, updates: Partial<FinancialRecord>) => void;
  onDelete: (id: string) => void;
  onMarkAsPaid: (id: string) => void;
  isLoading?: boolean;
}

export const FinancialRecordsTable = ({ 
  records, 
  onUpdate, 
  onDelete, 
  onMarkAsPaid, 
  isLoading 
}: FinancialRecordsTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<FinancialRecordType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const matchesSearch = 
        record.person_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'all' || record.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || record.payment_status === statusFilter;

      // Date range filter for due dates
      let matchesDateRange = true;
      if (startDate || endDate) {
        const dueDate = record.due_date ? new Date(record.due_date) : null;
        if (dueDate) {
          if (startDate && dueDate < startDate) matchesDateRange = false;
          if (endDate && dueDate > endDate) matchesDateRange = false;
        } else if (startDate || endDate) {
          matchesDateRange = false; // Exclude records without due date when filtering by date
        }
      }

      return matchesSearch && matchesType && matchesStatus && matchesDateRange;
    });
  }, [records, searchTerm, typeFilter, statusFilter, startDate, endDate]);

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const handleEdit = (record: FinancialRecord) => {
    setEditingRecord(record);
    setEditDialogOpen(true);
  };

  const getTypeLabel = (type: FinancialRecordType) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  if (records.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No financial records found. Add your first record to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by person name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={typeFilter} onValueChange={(value: FinancialRecordType | 'all') => setTypeFilter(value)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="loan">Loan</SelectItem>
            <SelectItem value="debt">Debt</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(value: PaymentStatus | 'all') => setStatusFilter(value)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>

        {/* Date Range Filter */}
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[150px] justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "MMM dd, yyyy") : "Start Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[150px] justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "MMM dd, yyyy") : "End Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {(startDate || endDate) && (
            <Button
              variant="outline"
              onClick={() => {
                setStartDate(undefined);
                setEndDate(undefined);
              }}
              className="px-3"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredRecords.length} of {records.length} records
      </p>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Person/Entity</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell>
                  <span className="capitalize font-medium">
                    {getTypeLabel(record.type)}
                  </span>
                </TableCell>
                <TableCell className="font-medium">
                  {record.person_name}
                </TableCell>
                <TableCell>
                  <div>
                    <p>{record.description}</p>
                    {record.notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {record.notes}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-mono">
                  {formatAmount(record.amount, record.currency)}
                </TableCell>
                <TableCell>
                  <PaymentStatusBadge status={record.payment_status} />
                </TableCell>
                <TableCell>
                  {formatDate(record.due_date)}
                </TableCell>
                <TableCell>
                  {formatDate(record.payment_date)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {record.payment_status !== 'paid' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onMarkAsPaid(record.id)}
                        disabled={isLoading}
                        title="Mark as paid"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(record)}
                      title="Edit record"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          title="Delete record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Financial Record</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this record for "{record.person_name}"? 
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => onDelete(record.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EditFinancialRecordDialog
        record={editingRecord}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUpdate={onUpdate}
        isLoading={isLoading}
      />
    </div>
  );
};