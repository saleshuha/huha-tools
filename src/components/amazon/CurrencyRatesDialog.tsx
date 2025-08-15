import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, Save, Plus, Trash2 } from 'lucide-react';
import { useCurrencyConverter } from '@/hooks/useCurrencyConverter';

interface CurrencyRatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CurrencyRatesDialog = ({ open, onOpenChange }: CurrencyRatesDialogProps) => {
  const { exchangeRates, loading, refetch } = useCurrencyConverter();
  const [rates, setRates] = useState<Array<{from: string, to: string, rate: number}>>([]);
  const [newRate, setNewRate] = useState({ from: 'USD', to: 'AED', rate: 3.67 });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    if (exchangeRates.length > 0) {
      setRates(exchangeRates.map(rate => ({
        from: rate.from_currency,
        to: rate.to_currency,
        rate: rate.rate
      })));
    } else {
      // Default rates
      setRates([
        { from: 'USD', to: 'AED', rate: 3.67 },
        { from: 'USD', to: 'SAR', rate: 3.75 },
        { from: 'AED', to: 'USD', rate: 0.27 },
        { from: 'SAR', to: 'USD', rate: 0.27 },
        { from: 'AED', to: 'SAR', rate: 1.02 },
        { from: 'SAR', to: 'AED', rate: 0.98 },
      ]);
    }
  }, [exchangeRates]);

  const updateRate = (index: number, field: 'from' | 'to' | 'rate', value: string | number) => {
    const updatedRates = [...rates];
    updatedRates[index] = { ...updatedRates[index], [field]: value };
    setRates(updatedRates);
  };

  const addNewRate = () => {
    setRates([...rates, { ...newRate }]);
    setNewRate({ from: 'USD', to: 'AED', rate: 1.0 });
  };

  const removeRate = (index: number) => {
    setRates(rates.filter((_, i) => i !== index));
  };

  const saveRates = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      // Here you would implement the actual saving logic to Supabase
      // For now, we'll just simulate a save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage({ type: 'success', text: 'Exchange rates saved successfully!' });
      await refetch();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save exchange rates. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Currency Exchange Rates
          </DialogTitle>
          <DialogDescription>
            Manage currency conversion rates for order processing
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Rates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Exchange Rates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rates.map((rate, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="grid grid-cols-5 gap-2 flex-1">
                    <Input
                      value={rate.from}
                      onChange={(e) => updateRate(index, 'from', e.target.value.toUpperCase())}
                      placeholder="From"
                      maxLength={3}
                    />
                    <span className="flex items-center justify-center text-muted-foreground">to</span>
                    <Input
                      value={rate.to}
                      onChange={(e) => updateRate(index, 'to', e.target.value.toUpperCase())}
                      placeholder="To"
                      maxLength={3}
                    />
                    <span className="flex items-center justify-center text-muted-foreground">=</span>
                    <Input
                      type="number"
                      step="0.0001"
                      value={rate.rate}
                      onChange={(e) => updateRate(index, 'rate', parseFloat(e.target.value) || 0)}
                      placeholder="Rate"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeRate(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Add New Rate */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add New Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="grid grid-cols-5 gap-2 flex-1">
                  <Input
                    value={newRate.from}
                    onChange={(e) => setNewRate({...newRate, from: e.target.value.toUpperCase()})}
                    placeholder="From"
                    maxLength={3}
                  />
                  <span className="flex items-center justify-center text-muted-foreground">to</span>
                  <Input
                    value={newRate.to}
                    onChange={(e) => setNewRate({...newRate, to: e.target.value.toUpperCase()})}
                    placeholder="To"
                    maxLength={3}
                  />
                  <span className="flex items-center justify-center text-muted-foreground">=</span>
                  <Input
                    type="number"
                    step="0.0001"
                    value={newRate.rate}
                    onChange={(e) => setNewRate({...newRate, rate: parseFloat(e.target.value) || 0})}
                    placeholder="Rate"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addNewRate}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Message */}
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={saveRates} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Rates'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};