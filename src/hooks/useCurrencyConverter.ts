import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExchangeRate } from '@/types/amazon-fulfillment';

export const useCurrencyConverter = () => {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExchangeRates = async () => {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*');

      if (error) throw error;
      setExchangeRates(data || []);
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return amount;

    const rate = exchangeRates.find(
      r => r.from_currency === fromCurrency && r.to_currency === toCurrency
    );

    if (rate) {
      return amount * rate.rate;
    }

    // Fallback: try reverse conversion
    const reverseRate = exchangeRates.find(
      r => r.from_currency === toCurrency && r.to_currency === fromCurrency
    );

    if (reverseRate) {
      return amount / reverseRate.rate;
    }

    // Default fallback rates
    const defaultRates: { [key: string]: number } = {
      'USD_AED': 3.67,
      'USD_SAR': 3.75,
      'AED_USD': 0.27,
      'SAR_USD': 0.27,
      'AED_SAR': 1.02,
      'SAR_AED': 0.98,
    };

    const key = `${fromCurrency}_${toCurrency}`;
    return amount * (defaultRates[key] || 1);
  };

  const formatCurrency = (amount: number, currency: string): string => {
    const symbols: { [key: string]: string } = {
      USD: '$',
      AED: 'د.إ',
      SAR: 'ر.س',
    };

    const symbol = symbols[currency] || currency;
    return `${symbol} ${amount.toFixed(2)}`;
  };

  useEffect(() => {
    fetchExchangeRates();
  }, []);

  return {
    exchangeRates,
    loading,
    convertCurrency,
    formatCurrency,
    refetch: fetchExchangeRates,
  };
};