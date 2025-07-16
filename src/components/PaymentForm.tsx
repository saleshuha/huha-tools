import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Payment } from './PaymentsManager';

interface PaymentFormProps {
  onSubmit: (payment: { platform: string; region: 'UAE' | 'KSA'; amount: number; status: 'Unpaid' | 'Paid' | 'Reversed' }) => void;
  onCancel: () => void;
}

const platforms = ['Amazon', 'Noon', 'Carrefour', 'Trendyol'];
const regions: Array<'UAE' | 'KSA'> = ['UAE', 'KSA'];

export function PaymentForm({ onSubmit, onCancel }: PaymentFormProps) {
  const [platform, setPlatform] = useState('');
  const [region, setRegion] = useState<'UAE' | 'KSA' | ''>('');
  const [amount, setAmount] = useState('');

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
      status: 'Unpaid'
    });

    // Reset form
    setPlatform('');
    setRegion('');
    setAmount('');
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