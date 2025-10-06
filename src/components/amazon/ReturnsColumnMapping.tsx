import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ColumnMapping } from '@/types/amazon-returns';

interface ReturnsColumnMappingProps {
  headers: string[];
  mappings: ColumnMapping;
  onMappingChange: (mappings: ColumnMapping) => void;
}

const REQUIRED_FIELDS = [
  { key: 'asin', label: 'ASIN', required: true },
  { key: 'shipped_units', label: 'Shipped Units', required: true },
  { key: 'returned_units', label: 'Returned Units', required: true },
];

const OPTIONAL_FIELDS = [
  { key: 'product_title', label: 'Product Title', required: false },
  { key: 'notes', label: 'Notes', required: false },
];

const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

export const ReturnsColumnMapping: React.FC<ReturnsColumnMappingProps> = ({
  headers,
  mappings,
  onMappingChange,
}) => {
  const handleMappingChange = (targetField: string, sourceColumn: string) => {
    const newMappings = { ...mappings };
    
    // Remove any existing mapping to this source column
    Object.keys(newMappings).forEach(key => {
      if (newMappings[key] === sourceColumn) {
        delete newMappings[key];
      }
    });

    // Add new mapping
    if (sourceColumn !== 'none') {
      newMappings[targetField] = sourceColumn;
    } else {
      delete newMappings[targetField];
    }

    onMappingChange(newMappings);
  };

  const isFieldMapped = (field: string) => {
    return mappings[field] !== undefined;
  };

  const getSelectedValue = (field: string) => {
    return mappings[field] || 'none';
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Map Your Columns</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Match your file columns to the required fields. Fields marked with * are required.
        </p>
      </div>

      <div className="space-y-3">
        {ALL_FIELDS.map((field) => (
          <div key={field.key} className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="flex items-center gap-2">
                {field.label}
                {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
              </Label>
            </div>
            <div className="flex-1">
              <Select
                value={getSelectedValue(field.key)}
                onValueChange={(value) => handleMappingChange(field.key, value)}
              >
                <SelectTrigger className={!isFieldMapped(field.key) && field.required ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- None --</SelectItem>
                  {headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
