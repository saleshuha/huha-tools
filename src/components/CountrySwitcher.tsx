import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Pin, PinOff } from 'lucide-react';
import { useCountry } from '@/contexts/CountryContext';
import { toast } from 'sonner';

const countries = [
  { code: 'UAE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'KSA', name: 'Saudi Arabia', flag: '🇸🇦' }
];

export function CountrySwitcher() {
  const { selectedCountry, setSelectedCountry, pinCountry, unpinCountry, isPinned } = useCountry();

  const handlePinToggle = () => {
    if (isPinned) {
      unpinCountry();
      toast.success('Country unpinned - will use your profile country');
    } else {
      pinCountry(selectedCountry);
      toast.success(`${selectedCountry} pinned - will persist across all pages`);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedCountry} onValueChange={(value: 'UAE' | 'KSA') => setSelectedCountry(value)}>
        <SelectTrigger className="w-[140px] h-10 bg-gradient-to-r from-primary/20 to-primary/10 border-0 rounded-full shadow-sm hover:shadow-md transition-all duration-200">
          <SelectValue>
            <div className="flex items-center gap-2">
              <span className="text-xl">{countries.find(c => c.code === selectedCountry)?.flag}</span>
              <span className="font-bold text-sm text-primary">{selectedCountry}</span>
              {isPinned && <Pin className="h-3 w-3 text-primary" />}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="w-[220px] z-[100] bg-background border shadow-xl rounded-lg">
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
          <div className="px-2 py-1 border-t mt-1">
            <Button
              variant="ghost" 
              size="sm"
              onClick={handlePinToggle}
              className="w-full justify-start gap-2 h-8 text-xs"
            >
              {isPinned ? (
                <>
                  <PinOff className="h-3 w-3" />
                  Unpin Country
                </>
              ) : (
                <>
                  <Pin className="h-3 w-3" />
                  Pin {selectedCountry}
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-1 px-2">
              {isPinned ? 'Pinned country persists across pages' : 'Pin to override profile country'}
            </p>
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}