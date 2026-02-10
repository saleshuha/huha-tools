import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2 } from 'lucide-react';

interface CountrySettings {
  id?: string;
  country: string;
  credit_days: number;
  vat_rate: number;
  currency: string;
}

interface PaymentSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PaymentSettingsDialog = ({ open, onOpenChange }: PaymentSettingsDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CountrySettings[]>([
    { country: 'UAE', credit_days: 60, vat_rate: 5, currency: 'AED' },
    { country: 'KSA', credit_days: 45, vat_rate: 15, currency: 'SAR' },
  ]);

  useEffect(() => {
    if (open) fetchSettings();
  }, [open]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_terms')
        .select('*')
        .in('country', ['UAE', 'KSA']);

      if (error) throw error;

      if (data && data.length > 0) {
        setSettings(prev =>
          prev.map(s => {
            const found = data.find((d: any) => d.country === s.country);
            return found
              ? { ...s, id: (found as any).id, credit_days: (found as any).credit_days, vat_rate: (found as any).vat_rate, currency: (found as any).currency }
              : s;
          })
        );
      }
    } catch (error: any) {
      console.error('Error fetching payment settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const s of settings) {
        if (s.id) {
          const { error } = await supabase
            .from('payment_terms')
            .update({ credit_days: s.credit_days, vat_rate: s.vat_rate, currency: s.currency } as any)
            .eq('id', s.id);
          if (error) throw error;
        } else {
          const user = (await supabase.auth.getUser()).data.user;
          const { error } = await supabase
            .from('payment_terms')
            .insert({ country: s.country, credit_days: s.credit_days, vat_rate: s.vat_rate, currency: s.currency, user_id: user?.id } as any);
          if (error) throw error;
        }
      }

      toast({ title: 'Settings saved', description: 'Payment terms updated for both countries.' });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error saving settings', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (country: string, field: keyof CountrySettings, value: number | string) => {
    setSettings(prev =>
      prev.map(s => (s.country === country ? { ...s, [field]: value } : s))
    );
  };

  const countryLabels: Record<string, { name: string; flag: string }> = {
    UAE: { name: 'United Arab Emirates', flag: '🇦🇪' },
    KSA: { name: 'Kingdom of Saudi Arabia', flag: '🇸🇦' },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment Settings</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {settings.map(s => (
              <Card key={s.country}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span>{countryLabels[s.country]?.flag}</span>
                    {countryLabels[s.country]?.name} ({s.country})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Credit Days</Label>
                      <Input
                        type="number"
                        value={s.credit_days}
                        onChange={e => updateSetting(s.country, 'credit_days', parseInt(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">VAT Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={s.vat_rate}
                        onChange={e => updateSetting(s.country, 'vat_rate', parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Currency</Label>
                      <Input
                        value={s.currency}
                        onChange={e => updateSetting(s.country, 'currency', e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Settings
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
