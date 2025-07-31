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
    <div className="flex items-center gap-4 bg-primary/5 px-4 py-2 rounded-lg border-2 border-primary/20">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🌍</span>
        <span className="text-sm font-bold text-primary uppercase tracking-wider">Country:</span>
      </div>
      <Select value={selectedCountry} onValueChange={(value: 'UAE' | 'KSA') => setSelectedCountry(value)}>
        <SelectTrigger className="w-[200px] h-12 bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/30 hover:border-primary transition-all duration-200 shadow-sm hover:shadow-md">
          <SelectValue>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{countries.find(c => c.code === selectedCountry)?.flag}</span>
              <div className="flex flex-col items-start">
                <span className="font-bold text-lg text-primary">{selectedCountry}</span>
                <span className="text-xs text-muted-foreground">
                  {countries.find(c => c.code === selectedCountry)?.name}
                </span>
              </div>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="w-[200px]">
          {countries.map((country) => (
            <SelectItem key={country.code} value={country.code} className="h-14">
              <div className="flex items-center gap-3 w-full">
                <span className="text-2xl">{country.flag}</span>
                <div className="flex flex-col items-start">
                  <span className="font-bold text-lg">{country.code}</span>
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