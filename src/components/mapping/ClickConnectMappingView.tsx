import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, MousePointer, ArrowRight } from 'lucide-react';
import { ExcelData, ColumnMapping } from '@/types/excel';

interface ClickConnectMappingViewProps {
  sourceData: ExcelData;
  targetData: ExcelData | null;
  mappings: ColumnMapping;
  defaultValues?: Record<string, string>;
  onCreateMapping: (sourceColumn: string, targetColumn: string) => void;
  onRemoveMapping: (sourceColumn: string) => void;
  onSetDefaultValue?: (targetColumn: string, value: string) => void;
  onRemoveDefaultValue?: (targetColumn: string) => void;
}

export const ClickConnectMappingView: React.FC<ClickConnectMappingViewProps> = ({
  sourceData,
  targetData,
  mappings,
  defaultValues = {},
  onCreateMapping,
  onRemoveMapping,
  onSetDefaultValue,
  onRemoveDefaultValue
}) => {
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [step, setStep] = useState<'select-source' | 'select-target'>('select-source');

  const handleSourceClick = (sourceColumn: string) => {
    setSelectedSource(sourceColumn);
    setStep('select-target');
  };

  const handleTargetClick = (targetColumn: string) => {
    if (selectedSource) {
      onCreateMapping(selectedSource, targetColumn);
      setSelectedSource(null);
      setStep('select-source');
    }
  };

  const resetSelection = () => {
    setSelectedSource(null);
    setStep('select-source');
  };

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
      {/* Instructions */}
      <Card className="p-4 bg-gradient-surface border-2 border-primary/20">
        <div className="flex items-center space-x-3">
          <MousePointer className="w-5 h-5 text-primary" />
          <div>
            <p className="font-medium text-primary">
              {step === 'select-source' ? 'Step 1: Click a source column' : 'Step 2: Click a target column'}
            </p>
            <p className="text-sm text-muted-foreground">
              {step === 'select-source' 
                ? 'Select a source column to map' 
                : `Selected: ${selectedSource} → Click target column to connect`}
            </p>
          </div>
          {selectedSource && (
            <Button variant="outline" size="sm" onClick={resetSelection}>
              Cancel
            </Button>
          )}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Source Columns */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-primary">Source Columns</h3>
          <div className="space-y-2">
            {sourceData.headers.map((column) => (
              <Button
                key={column}
                variant={selectedSource === column ? "default" : "outline"}
                className={`w-full justify-start text-left p-4 h-auto ${
                  step === 'select-source' 
                    ? 'hover:bg-primary/10 hover:border-primary/50' 
                    : 'opacity-50 cursor-not-allowed'
                } ${
                  mappings[column] ? 'bg-success/10 border-success/30' : ''
                }`}
                onClick={() => step === 'select-source' && handleSourceClick(column)}
                disabled={step !== 'select-source'}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{column}</span>
                  <div className="flex items-center space-x-2">
                    {mappings[column] && (
                      <>
                        <ArrowRight className="w-4 h-4" />
                        <Badge variant="secondary" className="text-xs">
                          {mappings[column]}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveMapping(column);
                          }}
                          className="hover:bg-destructive/10 hover:text-destructive p-1"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </Card>

        {/* Target Columns */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-accent">Target Columns</h3>
          <div className="space-y-2">
            {targetData.headers.map((column) => {
              const isMapped = Object.values(mappings).includes(column);
              return (
                <Button
                  key={column}
                  variant="outline"
                  className={`w-full justify-start text-left p-4 h-auto ${
                    step === 'select-target' 
                      ? 'hover:bg-accent/10 hover:border-accent/50' 
                      : 'opacity-50 cursor-not-allowed'
                  } ${
                    isMapped ? 'bg-success/10 border-success/30' : ''
                  }`}
                  onClick={() => step === 'select-target' && handleTargetClick(column)}
                  disabled={step !== 'select-target'}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{column}</span>
                    {isMapped && (
                      <Badge variant="secondary" className="text-xs">
                        Mapped
                      </Badge>
                    )}
                  </div>
                </Button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Default Values for Unmapped Columns */}
      {unmappedTargetColumns.length > 0 && (
        <Card className="p-6 border-2 border-accent/30 bg-accent/5">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-foreground">
            <span>Set Default Values for Unmapped Columns</span>
            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
              {unmappedTargetColumns.length} columns need defaults
            </Badge>
          </h3>
          
          <div className="space-y-3">
            {unmappedTargetColumns.map((targetColumn) => (
              <div key={targetColumn} className="flex items-center space-x-4 p-4 border-2 border-accent/20 rounded-lg bg-background/50">
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
        </Card>
      )}
    </div>
  );
};