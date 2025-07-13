import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { X, Check } from 'lucide-react';
import { ExcelData, ColumnMapping } from '@/types/excel';

interface TableMappingViewProps {
  sourceData: ExcelData;
  targetData: ExcelData | null;
  mappings: ColumnMapping;
  onCreateMapping: (sourceColumn: string, targetColumn: string) => void;
  onRemoveMapping: (sourceColumn: string) => void;
}

export const TableMappingView: React.FC<TableMappingViewProps> = ({
  sourceData,
  targetData,
  mappings,
  onCreateMapping,
  onRemoveMapping
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

  const handleMappingToggle = (sourceColumn: string, targetColumn: string, isChecked: boolean) => {
    if (isChecked) {
      onCreateMapping(sourceColumn, targetColumn);
    } else {
      onRemoveMapping(sourceColumn);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Column Mapping Table</h3>
        <Badge variant="secondary">{Object.keys(mappings).length} mappings</Badge>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/3 text-primary font-semibold">Source Columns</TableHead>
              <TableHead className="text-center w-20">Action</TableHead>
              <TableHead className="w-1/3 text-accent font-semibold">Target Columns</TableHead>
              <TableHead className="w-20 text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sourceData.headers.map((sourceColumn) => (
              <TableRow key={sourceColumn} className="hover:bg-muted/50">
                <TableCell className="font-medium">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-primary/20 border-2 border-primary"></div>
                    <span>{sourceColumn}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <div className="w-8 h-0.5 bg-border"></div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    {targetData.headers.map((targetColumn) => {
                      const isCurrentMapping = mappings[sourceColumn] === targetColumn;
                      const isTargetMapped = Object.values(mappings).includes(targetColumn);
                      
                      return (
                        <div key={targetColumn} className="flex items-center space-x-2">
                          <Checkbox
                            checked={isCurrentMapping}
                            onCheckedChange={(checked) => 
                              handleMappingToggle(sourceColumn, targetColumn, checked as boolean)
                            }
                            disabled={isTargetMapped && !isCurrentMapping}
                            className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                          />
                          <span className={`text-sm ${
                            isCurrentMapping 
                              ? 'text-accent font-medium' 
                              : isTargetMapped 
                                ? 'text-muted-foreground line-through' 
                                : 'text-foreground'
                          }`}>
                            {targetColumn}
                          </span>
                          {isTargetMapped && !isCurrentMapping && (
                            <Badge variant="outline" className="text-xs">Used</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {mappings[sourceColumn] ? (
                    <div className="flex items-center justify-center space-x-2">
                      <Check className="w-4 h-4 text-success" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveMapping(sourceColumn)}
                        className="hover:bg-destructive/10 hover:text-destructive p-1"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted mx-auto"></div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};