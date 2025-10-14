import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PaymentTerms } from '@/types/amazon-fulfillment';
import { useCountry } from '@/contexts/CountryContext';

export const usePaymentTerms = () => {
  const { selectedCountry } = useCountry();
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentTerms = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('payment_terms')
          .select('*')
          .eq('country', selectedCountry)
          .single();

        if (error) {
          console.error('Error fetching payment terms:', error);
          return;
        }

        setPaymentTerms(data as any);
      } catch (error) {
        console.error('Error fetching payment terms:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentTerms();
  }, [selectedCountry]);

  // Default to 45 days if no payment terms found
  const creditDays = paymentTerms?.credit_days || 45;
  const vatRate = paymentTerms?.vat_rate || (selectedCountry === 'KSA' ? 15 : 5);
  const currency = paymentTerms?.currency || (selectedCountry === 'KSA' ? 'SAR' : 'AED');

  return {
    paymentTerms,
    creditDays,
    vatRate,
    currency,
    loading
  };
};