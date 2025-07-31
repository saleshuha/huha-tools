import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreateCarrefourPayment } from "@/types/carrefour";
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

interface CarrefourPaymentFormProps {
  onSuccess: () => void;
}

export function CarrefourPaymentForm({ onSuccess }: CarrefourPaymentFormProps) {
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

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const paymentData: CreateCarrefourPayment = {
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
        .insert([{ ...paymentData, user_id: user.id }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Carrefour payment record created successfully",
      });

      form.reset();
      onSuccess();
    } catch (error) {
      console.error("Error creating payment:", error);
      toast({
        title: "Error",
        description: "Failed to create payment record",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-background to-muted/20 p-6 rounded-lg border">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField
            control={form.control}
            name="order_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">Order Number</FormLabel>
                <FormControl>
                  <Input placeholder="Enter order number" className="h-11" {...field} />
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
                  <Input placeholder="Enter SKU number" className="h-11" {...field} />
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

          <FormField
            control={form.control}
            name="seller_fees"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">Seller Fees</FormLabel>
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

          <FormField
            control={form.control}
            name="pending_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">Pending Amount</FormLabel>
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

          <FormField
            control={form.control}
            name="cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">Cost</FormLabel>
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

          <FormField
            control={form.control}
            name="profit"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">Profit</FormLabel>
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

        <div className="flex justify-end pt-4 border-t">
          <Button 
            type="submit" 
            disabled={isLoading} 
            size="lg"
            className="px-8 py-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            {isLoading ? "Creating Record..." : "Create Payment Record"}
          </Button>
        </div>
      </form>
    </Form>
    </div>
  );
}