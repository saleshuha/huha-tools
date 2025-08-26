import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLabelDoc } from '@/contexts/LabelDocContext';

export const DataPreviewPanel: React.FC = () => {
  const { dataset, document: labelDoc } = useLabelDoc();
  const [previewIndex, setPreviewIndex] = useState(0);

  if (!dataset || !labelDoc || dataset.data.length === 0) {
    return (
      <Card className="w-80 h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Data Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Load a dataset to preview how data will appear on labels
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentRow = dataset.data[previewIndex];
  const mappedElements = labelDoc.elements.filter(el => el.dataColumn);

  const getPreviewValue = (element: any) => {
    if (!element.dataColumn || !currentRow) return element.text || '';
    
    const columnIndex = dataset.headers.indexOf(element.dataColumn);
    if (columnIndex === -1) return element.text || '';
    
    let value = currentRow[columnIndex] || '';
    
    // Apply transformations
    if (element.dataTransform) {
      const { prefix, suffix, uppercase, truncate } = element.dataTransform;
      
      if (prefix) value = prefix + value;
      if (suffix) value = value + suffix;
      if (uppercase) value = value.toUpperCase();
      if (truncate && value.length > truncate) {
        value = value.substring(0, truncate) + '...';
      }
    }
    
    return value;
  };

  return (
    <Card className="w-80 h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Data Preview
        </CardTitle>
        <div className="flex items-center justify-between mt-2">
          <Badge variant="outline" className="text-xs">
            Row {previewIndex + 1} of {dataset.data.length}
          </Badge>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
              disabled={previewIndex === 0}
              className="h-6 w-6 p-0"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPreviewIndex(Math.min(dataset.data.length - 1, previewIndex + 1))}
              disabled={previewIndex === dataset.data.length - 1}
              className="h-6 w-6 p-0"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Row Selector */}
        <div>
          <Select
            value={previewIndex.toString()}
            onValueChange={(value) => setPreviewIndex(parseInt(value))}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-48">
              {dataset.data.slice(0, 50).map((row, index) => {
                // Try to show meaningful row identifier (first few columns)
                const identifier = row.slice(0, 2).join(' - ') || `Row ${index + 1}`;
                return (
                  <SelectItem key={index} value={index.toString()}>
                    {identifier.length > 30 ? identifier.substring(0, 30) + '...' : identifier}
                  </SelectItem>
                );
              })}
              {dataset.data.length > 50 && (
                <SelectItem value="" disabled>
                  ... and {dataset.data.length - 50} more rows
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Current Row Data */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Current Row Data:</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {dataset.headers.map((header, index) => (
              <div key={header} className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">{header}:</span>
                <span className="max-w-32 truncate text-right">
                  {currentRow[index] || '-'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mapped Elements Preview */}
        {mappedElements.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Label Preview:</h4>
            <div className="p-3 bg-muted rounded-lg space-y-2">
              {mappedElements.map((element) => (
                <div key={element.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs px-2 py-0">
                      {element.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      → {element.dataColumn}
                    </span>
                  </div>
                  <div className="p-2 bg-background border rounded text-sm">
                    {element.type === 'barcode' || element.type === 'qr' ? (
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded dark:bg-gray-800">
                        {getPreviewValue(element)}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: element.fontSize ? `${Math.max(8, element.fontSize * 0.8)}px` : '12px',
                          fontFamily: element.fontFamily || 'Arial',
                          fontWeight: element.fontWeight || 'normal',
                          color: element.color || '#000000',
                        }}
                      >
                        {getPreviewValue(element)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {mappedElements.length === 0 && (
          <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground text-center">
            No elements are mapped to data columns yet.
            <br />
            Select an element and choose a data column to map.
          </div>
        )}

        {/* Quick Stats */}
        <div className="p-3 bg-muted rounded-lg text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Rows:</span>
            <span className="font-medium">{dataset.rowCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Columns:</span>
            <span className="font-medium">{dataset.headers.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mapped Elements:</span>
            <span className="font-medium">{mappedElements.length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};