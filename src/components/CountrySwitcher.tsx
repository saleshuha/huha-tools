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
        <SelectTrigger className="w-[150px] h-12 bg-gradient-to-r from-primary/20 via-accent/15 to-primary/20 border-2 border-primary/30 rounded-2xl shadow-soft hover:shadow-glow hover:scale-105 transition-all duration-300 backdrop-blur-sm">
          <SelectValue>
            <div className="flex items-center gap-2">
              <span className="text-xl">{countries.find(c => c.code === selectedCountry)?.flag}</span>
              <span className="font-bold text-sm text-gradient-primary">{selectedCountry}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="w-[200px] z-[100] bg-card/95 backdrop-blur-xl border-2 border-border/30 shadow-dramatic rounded-2xl">
          {countries.map((country) => (
            <SelectItem key={country.code} value={country.code} className="h-14 cursor-pointer hover:bg-gradient-primary/10 focus:bg-gradient-primary/10 rounded-xl m-1 transition-all duration-300 hover:scale-[1.02]">
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