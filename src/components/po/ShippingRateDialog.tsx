import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, Save } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/components/ui/use-toast';

interface ShippingRateDialogProps {
  currentRate: number;
  onUpdateRate: (rate: number) => void;
  isLoading: boolean;
}

export function ShippingRateDialog({ currentRate, onUpdateRate, isLoading }: ShippingRateDialogProps) {
  const [open, setOpen] = useState(false);
  const [shippingRate, setShippingRate] = useState(currentRate.toString());
  const [savedRate, setSavedRate] = useState(currentRate);
  const { profile } = useUserProfile();
  const { toast } = useToast();

  const getCurrencySymbol = (country: string) => {
    switch (country) {
      case 'KSA': return 'SAR';
      case 'UAE': return 'AED';
      default: return 'USD';
    }
  };

  const currencySymbol = profile?.country ? getCurrencySymbol(profile.country) : 'AED';

  const handleSave = () => {
    const rate = parseFloat(shippingRate);
    if (!isNaN(rate) && rate >= 0) {
      onUpdateRate(rate);
      setSavedRate(rate); // Save the rate locally to prevent unwanted changes
      toast({
        title: "Shipping Rate Updated",
        description: `Shipping rate set to ${rate.toFixed(3)} ${currencySymbol} per gram`,
      });
      setOpen(false);
    }
  };

  const handleCancel = () => {
    // Reset to saved rate on cancel to prevent unwanted changes
    setShippingRate(savedRate.toString());
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset to saved rate when closing without saving
      setShippingRate(savedRate.toString());
    } else {
      // Initialize with current saved rate when opening
      setShippingRate(savedRate.toString());
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Truck className="h-4 w-4 mr-2" />
          Shipping Rate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Shipping Rate</DialogTitle>
          <DialogDescription>
            Set the shipping cost per gram for calculating shipping charges.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shipping-rate">Shipping Rate (per gram)</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="shipping-rate"
                type="number"
                step="0.001"
                min="0"
                value={shippingRate}
                onChange={(e) => setShippingRate(e.target.value)}
                placeholder="0.00"
              />
              <span className="text-sm text-muted-foreground">{currencySymbol}</span>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Current rate: {currentRate.toFixed(3)} {currencySymbol} per gram
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            Save Rate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}