import { useFinancialRecords } from '@/hooks/useFinancialRecords';
import { FinancialMetrics } from '@/components/financial/FinancialMetrics';
import { FinancialRecordsTable } from '@/components/financial/FinancialRecordsTable';
import { AddFinancialRecordDialog } from '@/components/financial/AddFinancialRecordDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const FinancialManagement = () => {
  const {
    records,
    metrics,
    isLoading,
    error,
    addRecord,
    updateRecord,
    deleteRecord,
    markAsPaid,
    isAdding,
    isUpdating,
    isDeleting,
    isMarkingPaid,
  } = useFinancialRecords();

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>Error loading financial records: {error.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Management</h1>
          <p className="text-muted-foreground">
            Track your loans, expenses, and amounts owed
          </p>
        </div>
        <AddFinancialRecordDialog onAdd={addRecord} isLoading={isAdding} />
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading financial records...</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <FinancialMetrics metrics={metrics} />
          
          <Card>
            <CardHeader>
              <CardTitle>Financial Records</CardTitle>
              <CardDescription>
                Manage your financial records, track payments, and monitor due dates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FinancialRecordsTable
                records={records}
                onUpdate={(id, updates) => updateRecord({ id, updates })}
                onDelete={deleteRecord}
                onMarkAsPaid={markAsPaid}
                isLoading={isUpdating || isDeleting || isMarkingPaid}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default FinancialManagement;