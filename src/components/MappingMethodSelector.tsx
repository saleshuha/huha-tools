import React from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Move, ChevronDown, Link, Table, Sparkles } from 'lucide-react';
import { MappingMethod, MAPPING_METHODS } from '@/types/mappingMethods';

interface MappingMethodSelectorProps {
  selectedMethod: MappingMethod;
  onMethodChange: (method: MappingMethod) => void;
}

const getIcon = (iconName: string) => {
  const icons = {
    'move': Move,
    'chevron-down': ChevronDown,
    'link': Link,
    'table': Table,
    'sparkles': Sparkles
  };
  return icons[iconName as keyof typeof icons] || Move;
};

export const MappingMethodSelector: React.FC<MappingMethodSelectorProps> = ({
  selectedMethod,
  onMethodChange
}) => {
  return (
    <Card className="p-6 mb-6 bg-gradient-surface">
      <div className="space-y-4">
        <div>
          <Label className="text-lg font-semibold">Choose Mapping Method</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Select how you'd like to map columns between your source and target files
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1">
            <Select value={selectedMethod} onValueChange={onMethodChange}>
              <SelectTrigger className="w-full bg-background border-2 hover:border-primary/50 transition-colors">
                <SelectValue placeholder="Select mapping method" />
              </SelectTrigger>
              <SelectContent className="bg-background border-2 shadow-lg z-50">
                {MAPPING_METHODS.map((method) => {
                  const IconComponent = getIcon(method.icon);
                  return (
                    <SelectItem 
                      key={method.value} 
                      value={method.value}
                      className="hover:bg-muted focus:bg-muted cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <IconComponent className="w-4 h-4 text-primary" />
                        <div>
                          <div className="font-medium">{method.label}</div>
                          <div className="text-xs text-muted-foreground">{method.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            {MAPPING_METHODS.find(m => m.value === selectedMethod)?.label}
          </Badge>
        </div>
      </div>
    </Card>
  );
};