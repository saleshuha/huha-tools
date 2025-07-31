import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const NoonPaymentsReconciliation = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Noon Payments Reconciliation</h1>
          <p className="text-muted-foreground">
            Reconcile and manage Noon marketplace payment transactions
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Reconciliation Dashboard</CardTitle>
          <CardDescription>
            Upload and process Noon payment reports for reconciliation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 border-2 border-dashed border-muted rounded-lg">
            <p className="text-muted-foreground">Noon Payments Reconciliation features coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NoonPaymentsReconciliation;