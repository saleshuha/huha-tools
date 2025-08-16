import React, { createContext, useContext, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DollarSign } from 'lucide-react';

const currencies = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س' }
];

interface CurrencyDisplayContextType {
  displayCurrency: string;
  setDisplayCurrency: (currency: string) => void;
}

const CurrencyDisplayContext = createContext<CurrencyDisplayContextType | undefined>(undefined);

export const CurrencyDisplayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [displayCurrency, setDisplayCurrency] = useState('USD');

  return (
    <CurrencyDisplayContext.Provider value={{ displayCurrency, setDisplayCurrency }}>
      {children}
    </CurrencyDisplayContext.Provider>
  );
};

export const useCurrencyDisplay = () => {
  const context = useContext(CurrencyDisplayContext);
  if (!context) {
    throw new Error('useCurrencyDisplay must be used within CurrencyDisplayProvider');
  }
  return context;
};

export const CurrencySelector: React.FC = () => {
  const { displayCurrency, setDisplayCurrency } = useCurrencyDisplay();

  return (
    <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
      <SelectTrigger className="w-[140px] h-10 bg-gradient-to-r from-primary/20 to-primary/10 border-0 rounded-full shadow-sm hover:shadow-md transition-all duration-200">
        <SelectValue>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm text-primary">{displayCurrency}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="w-[180px] z-[100] bg-background border shadow-xl rounded-lg">
        {currencies.map((currency) => (
          <SelectItem key={currency.code} value={currency.code} className="h-12 cursor-pointer hover:bg-primary/10 focus:bg-primary/10">
            <div className="flex items-center gap-2">
              <span className="text-lg">{currency.symbol}</span>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">{currency.code}</span>
                <span className="text-xs text-muted-foreground">{currency.name}</span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};