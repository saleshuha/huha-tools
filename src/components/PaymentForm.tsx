import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Payment } from './PaymentsManager';

interface PaymentFormProps {
  onSubmit: (payment: { platform: string; region: 'UAE' | 'KSA'; amount: number; status: 'Unpaid' | 'Paid' | 'Reversed'; payment_date?: string }) => void;
  onCancel: () => void;
}

const platforms = ['Amazon', 'Noon', 'Carrefour', 'Trendyol'];
const regions: Array<'UAE' | 'KSA'> = ['UAE', 'KSA'];

export function PaymentForm({ onSubmit, onCancel }: PaymentFormProps) {
  const [platform, setPlatform] = useState('');
  const [region, setRegion] = useState<'UAE' | 'KSA' | ''>('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!platform || !region || !amount) {
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return;
    }

    onSubmit({
      platform,
      region: region as 'UAE' | 'KSA',
      amount: numericAmount,
      status: 'Unpaid',
      payment_date: paymentDate?.toISOString()
    });

    // Reset form
    setPlatform('');
    setRegion('');
    setAmount('');
    setPaymentDate(undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="platform">E-commerce Platform</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger>
              <SelectValue placeholder="Select platform" />
            </SelectTrigger>
            <SelectContent>
              {platforms.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="region">Region/Market</Label>
          <Select value={region} onValueChange={(value) => setRegion(value as 'UAE' | 'KSA')}>
            <SelectTrigger>
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              {regions.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount (AED)</Label>
        <Input
          id="amount"
          type="number"
          min="0"
          step="0.01"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Payment Receiving Date (Optional)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !paymentDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={paymentDate}
              onSelect={setPaymentDate}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">
          Set when you expect to receive this payment for future tracking
        </p>
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!platform || !region || !amount}
        >
          Add Payment
        </Button>
      </div>
    </form>
  );
}