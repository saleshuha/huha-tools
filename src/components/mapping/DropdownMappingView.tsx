import React from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X, ArrowRight } from 'lucide-react';
import { ExcelData, ColumnMapping } from '@/types/excel';

interface DropdownMappingViewProps {
  sourceData: ExcelData;
  targetData: ExcelData | null;
  mappings: ColumnMapping;
  defaultValues?: Record<string, string>;
  onCreateMapping: (sourceColumn: string, targetColumn: string) => void;
  onRemoveMapping: (sourceColumn: string) => void;
  onSetDefaultValue?: (targetColumn: string, value: string) => void;
  onRemoveDefaultValue?: (targetColumn: string) => void;
}

export const DropdownMappingView: React.FC<DropdownMappingViewProps> = ({
  sourceData,
  targetData,
  mappings,
  defaultValues = {},
  onCreateMapping,
  onRemoveMapping,
  onSetDefaultValue,
  onRemoveDefaultValue
}) => {
  if (!targetData) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">
          Please upload a target file to start mapping columns
        </p>
      </Card>
    );
  }

  const mappedTargetColumns = Object.values(mappings);
  const unmappedTargetColumns = targetData.headers.filter(col => !mappedTargetColumns.includes(col));

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6 flex items-center space-x-2">
          <span>Column Mappings</span>
          <Badge variant="secondary">{Object.keys(mappings).length} mapped</Badge>
          {unmappedTargetColumns.length > 0 && (
            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
              {unmappedTargetColumns.length} need defaults
            </Badge>
          )}
        </h3>
        
        <div className="space-y-4">
          {sourceData.headers.map((sourceColumn) => (
            <div key={sourceColumn} className="flex items-center space-x-4 p-4 border rounded-lg bg-gradient-surface">
              <div className="flex-1">
                <Label className="text-sm font-medium text-primary">{sourceColumn}</Label>
              </div>
              
              <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              
              <div className="flex-1">
                <Select
                  value={mappings[sourceColumn] || ''}
                  onValueChange={(value) => {
                    if (value) {
                      onCreateMapping(sourceColumn, value);
                    }
                  }}
                >
                  <SelectTrigger className="bg-background border-2 hover:border-primary/50">
                    <SelectValue placeholder="Select target column" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-2 shadow-lg z-50 max-h-60">
                    {targetData.headers.map((targetColumn) => (
                      <SelectItem 
                        key={targetColumn} 
                        value={targetColumn}
                        className="hover:bg-muted focus:bg-muted cursor-pointer"
                      >
                        {targetColumn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {mappings[sourceColumn] && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveMapping(sourceColumn)}
                  className="flex-shrink-0 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {unmappedTargetColumns.length > 0 && (
          <div className="mt-8 pt-6 border-t border-border/50">
            <h4 className="text-md font-semibold mb-4 flex items-center space-x-2 text-foreground">
              <span>Set Default Values for Unmapped Columns</span>
              <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                {unmappedTargetColumns.length} columns need defaults
              </Badge>
            </h4>
            
            <div className="space-y-3">
              {unmappedTargetColumns.map((targetColumn) => (
                <div key={targetColumn} className="flex items-center space-x-4 p-4 border-2 border-accent/20 rounded-lg bg-accent/5">
                  <div className="flex-1">
                    <Label className="text-sm font-semibold text-foreground">{targetColumn}</Label>
                    <p className="text-xs text-muted-foreground mt-1">This column will use the default value for all rows</p>
                  </div>
                  
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="Enter default value for all rows"
                      value={defaultValues[targetColumn] || ''}
                      onChange={(e) => {
                        if (onSetDefaultValue) {
                          onSetDefaultValue(targetColumn, e.target.value);
                        }
                      }}
                      className="bg-background border-2 hover:border-accent/50 focus:border-accent"
                    />
                  </div>
                  
                  {defaultValues[targetColumn] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (onRemoveDefaultValue) {
                          onRemoveDefaultValue(targetColumn);
                        }
                      }}
                      className="flex-shrink-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};