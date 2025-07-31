import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CarrefourPaymentForm } from "@/components/carrefour/CarrefourPaymentForm";
import { CarrefourPaymentsTable } from "@/components/carrefour/CarrefourPaymentsTable";

export default function CarrefourPayments() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setDialogOpen(false);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Carrefour Payments</h1>
          <p className="text-muted-foreground">
            Manage and track your Carrefour payment records
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Carrefour Payment</DialogTitle>
            </DialogHeader>
            <CarrefourPaymentForm onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
          <CardDescription>
            All your Carrefour payment transactions and their details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CarrefourPaymentsTable refresh={refreshKey} />
        </CardContent>
      </Card>
    </div>
  );
}