import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCountry } from '@/contexts/CountryContext';

const countries = [
  { code: 'UAE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'KSA', name: 'Saudi Arabia', flag: '🇸🇦' }
];

export function CountrySwitcher() {
  const { selectedCountry, setSelectedCountry } = useCountry();

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedCountry} onValueChange={(value: 'UAE' | 'KSA') => setSelectedCountry(value)}>
        <SelectTrigger className="w-[140px] h-10 bg-gradient-to-r from-primary/20 to-primary/10 border-0 rounded-full shadow-sm hover:shadow-md transition-all duration-200">
          <SelectValue>
            <div className="flex items-center gap-2">
              <span className="text-xl">{countries.find(c => c.code === selectedCountry)?.flag}</span>
              <span className="font-bold text-sm text-primary">{selectedCountry}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="w-[180px] z-[100] bg-background border shadow-xl rounded-lg">
          {countries.map((country) => (
            <SelectItem key={country.code} value={country.code} className="h-12 cursor-pointer hover:bg-primary/10 focus:bg-primary/10">
              <div className="flex items-center gap-2">
                <span className="text-lg">{country.flag}</span>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">{country.code}</span>
                  <span className="text-xs text-muted-foreground">{country.name}</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}