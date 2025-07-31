import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, ShoppingCart, Receipt, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreateCarrefourSalesOrder } from "@/types/carrefour";
import { useCountry } from "@/contexts/CountryContext";

const formSchema = z.object({
  order_number: z.string().min(1, "Order number is required"),
  sku_number: z.string().min(1, "SKU number is required"),
  sale_value: z.number().min(0, "Sale value must be positive"),
  seller_fees: z.number().min(0, "Seller fees must be positive"),
  pending_amount: z.number().min(0, "Pending amount must be positive"),
  cost: z.number().min(0, "Cost must be positive"),
  profit: z.number(),
});

type FormData = z.infer<typeof formSchema>;

interface CarrefourSalesOrderFormProps {
  onSuccess: () => void;
}

export function CarrefourSalesOrderForm({ onSuccess }: CarrefourSalesOrderFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { selectedCountry } = useCountry();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      order_number: "",
      sku_number: "",
      sale_value: 0,
      seller_fees: 0,
      pending_amount: 0,
      cost: 0,
      profit: 0,
    },
  });

  // Watch form values to auto-calculate profit
  const saleValue = form.watch("sale_value") || 0;
  const cost = form.watch("cost") || 0;
  const fees = form.watch("seller_fees") || 0;
  
  // Auto-calculate profit when values change
  React.useEffect(() => {
    const calculatedProfit = saleValue - cost - fees;
    form.setValue("profit", calculatedProfit);
  }, [saleValue, cost, fees, form]);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const orderData: CreateCarrefourSalesOrder = {
        order_number: data.order_number,
        sku_number: data.sku_number,
        sale_value: data.sale_value,
        seller_fees: data.seller_fees,
        pending_amount: data.pending_amount,
        cost: data.cost,
        profit: data.profit,
        country: selectedCountry,
      };

      const { error } = await supabase
        .from("carrefour_payments")
        .insert([{ ...orderData, user_id: user.id }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sales order record created successfully",
      });

      form.reset();
      onSuccess();
    } catch (error) {
      console.error("Error creating sales order:", error);
      toast({
        title: "Error",
        description: "Failed to create sales order record",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-emerald-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-emerald-600" />
              Sales Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Order details and sale value</p>
          </CardContent>
        </Card>
        
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Receipt className="h-4 w-4 text-red-600" />
              Cost Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Product costs and platform fees</p>
          </CardContent>
        </Card>
        
        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Profit Calculation
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">Auto-calculated profit margin</p>
          </CardContent>
        </Card>
      </div>

      {/* Form */}
      <div className="bg-gradient-to-br from-background to-muted/20 p-6 rounded-lg border">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Sales Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-semibold text-emerald-700">Sales Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="order_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Order Number</FormLabel>
                      <FormControl>
                        <Input placeholder="CF-ORD-001" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sku_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">SKU Number</FormLabel>
                      <FormControl>
                        <Input placeholder="SKU-12345" className="h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sale_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Sale Value</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="100.00" 
                          className="h-11"
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Cost Analysis Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-red-700">Cost Analysis</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Cost of Goods</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="50.00" 
                          className="h-11"
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="seller_fees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Platform Fees</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="5.00" 
                          className="h-11"
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pending_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Outstanding Balance</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          className="h-11"
                          {...field} 
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Profit Calculation Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-700">Profit Calculation</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="profit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Net Profit (Auto-calculated)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          className="h-11 bg-blue-50 border-blue-200"
                          readOnly
                          {...field} 
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Formula: Sale Value - Cost of Goods - Platform Fees
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-center">
                  <Card className="w-full border-blue-200">
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-sm font-semibold text-blue-700">Profit Margin</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {saleValue > 0 ? ((form.getValues("profit") / saleValue) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t">
              <Button 
                type="submit" 
                disabled={isLoading} 
                size="lg"
                className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600"
              >
                {isLoading ? "Creating Sales Order..." : "Create Sales Order"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}