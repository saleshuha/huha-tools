import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Database, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  AlertTriangle,
  CheckCircle,
  Hash,
  Type
} from "lucide-react";
import { useLabelDataset } from "@/hooks/useLabelDataset";

interface DataMappingPanelProps {
  selectedObject: any | null;
  datasetId: string | null;
  onObjectUpdate: (updates: any) => void;
}

interface MappedObject {
  dataColumn?: string;
  dataMode?: 'static' | 'column';
  dataTransform?: {
    prefix?: string;
    suffix?: string;
    uppercase?: boolean;
    truncate?: number;
  };
  barcodeOptions?: {
    symbology: 'CODE128' | 'EAN13';
    height: number;
    displayValue: boolean;
  };
  qrOptions?: {
    moduleSize: number;
    margin: number;
  };
}

export function DataMappingPanel({ 
  selectedObject, 
  datasetId, 
  onObjectUpdate 
}: DataMappingPanelProps) {
  const { dataset } = useLabelDataset(datasetId);
  const [previewRowIndex, setPreviewRowIndex] = useState(0);
  
  if (!selectedObject) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-muted-foreground">
            <Hash className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Select an element to view properties</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const mappedObj = selectedObject as MappedObject;
  const isMapped = mappedObj.dataMode === 'column' && mappedObj.dataColumn;
  const hasDataset = dataset && dataset.data.length > 0;

  const getPreviewValue = () => {
    if (!hasDataset || !isMapped) return mappedObj.dataMode === 'static' ? (mappedObj as any).text : 'No data';
    
    const columnIndex = dataset.headers.indexOf(mappedObj.dataColumn!);
    if (columnIndex === -1) return 'Column not found';
    
    const rawValue = dataset.data[previewRowIndex]?.[columnIndex]?.toString() || '';
    
    // Apply transforms
    let value = rawValue;
    if (mappedObj.dataTransform?.prefix) value = mappedObj.dataTransform.prefix + value;
    if (mappedObj.dataTransform?.suffix) value = value + mappedObj.dataTransform.suffix;
    if (mappedObj.dataTransform?.uppercase) value = value.toUpperCase();
    if (mappedObj.dataTransform?.truncate && value.length > mappedObj.dataTransform.truncate) {
      value = value.substring(0, mappedObj.dataTransform.truncate) + '...';
    }
    
    return value;
  };

  const validateMapping = () => {
    const errors = [];
    
    if (mappedObj.barcodeOptions?.symbology === 'EAN13') {
      const value = getPreviewValue();
      if (!/^\d{12,13}$/.test(value.replace(/[^0-9]/g, ''))) {
        errors.push('EAN-13 requires 12-13 digits');
      }
    }
    
    return errors;
  };

  const validationErrors = validateMapping();

  return (
    <div className="space-y-4">
      {/* Data Tab */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="w-5 h-5" />
            Data Mapping
          </CardTitle>
          <CardDescription>
            Connect this element to your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mapping Status */}
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            isMapped ? 'bg-success/10 border-2 border-success/20' : 'bg-muted/50'
          }`}>
            {isMapped ? (
              <CheckCircle className="w-4 h-4 text-success" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">
                {isMapped ? `Mapped to: ${mappedObj.dataColumn}` : 'No data mapping'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isMapped ? 'Element will use data from column' : 'Element uses static content'}
              </p>
            </div>
          </div>

          {/* Data Source Selection */}
          <div className="space-y-3">
            <Label>Data Source</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={mappedObj.dataMode === 'static' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onObjectUpdate({ dataMode: 'static' })}
              >
                <Type className="w-4 h-4 mr-2" />
                Static
              </Button>
              <Button
                variant={mappedObj.dataMode === 'column' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onObjectUpdate({ dataMode: 'column' })}
                disabled={!hasDataset}
              >
                <Database className="w-4 h-4 mr-2" />
                Data Column
              </Button>
            </div>
          </div>

          {mappedObj.dataMode === 'static' && (
            <div>
              <Label htmlFor="static-text">Static Text</Label>
              <Input
                id="static-text"
                value={(mappedObj as any).text || ''}
                onChange={(e) => onObjectUpdate({ text: e.target.value })}
                placeholder="Enter your text..."
              />
            </div>
          )}

          {mappedObj.dataMode === 'column' && hasDataset && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="column-select">Data Column</Label>
                <Select
                  value={mappedObj.dataColumn || ''}
                  onValueChange={(value) => onObjectUpdate({ dataColumn: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dataset.headers.map((header) => (
                      <SelectItem key={header} value={header}>
                        <div className="flex items-center justify-between w-full">
                          <span>{header}</span>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {dataset.data[0]?.[dataset.headers.indexOf(header)]?.toString().substring(0, 8) || 'N/A'}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data Transforms */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <Label className="text-sm font-medium">Transform Options</Label>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label htmlFor="prefix" className="text-xs">Prefix</Label>
                    <Input
                      id="prefix"
                      size={32}
                      value={mappedObj.dataTransform?.prefix || ''}
                      onChange={(e) => onObjectUpdate({
                        dataTransform: { ...mappedObj.dataTransform, prefix: e.target.value }
                      })}
                      placeholder="SKU-"
                    />
                  </div>
                  <div>
                    <Label htmlFor="suffix" className="text-xs">Suffix</Label>
                    <Input
                      id="suffix"
                      size={32}
                      value={mappedObj.dataTransform?.suffix || ''}
                      onChange={(e) => onObjectUpdate({
                        dataTransform: { ...mappedObj.dataTransform, suffix: e.target.value }
                      })}
                      placeholder="-001"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={mappedObj.dataTransform?.uppercase || false}
                      onCheckedChange={(checked) => onObjectUpdate({
                        dataTransform: { ...mappedObj.dataTransform, uppercase: checked }
                      })}
                    />
                    <Label className="text-xs">Uppercase</Label>
                  </div>
                  <div>
                    <Label htmlFor="truncate" className="text-xs">Max Length</Label>
                    <Input
                      id="truncate"
                      type="number"
                      size={32}
                      value={mappedObj.dataTransform?.truncate || ''}
                      onChange={(e) => onObjectUpdate({
                        dataTransform: { 
                          ...mappedObj.dataTransform, 
                          truncate: e.target.value ? parseInt(e.target.value) : undefined 
                        }
                      })}
                      placeholder="20"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Row Preview Controls */}
          {hasDataset && isMapped && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Preview Data</Label>
                  <Badge variant="outline" className="text-xs">
                    Row {previewRowIndex + 1} of {dataset.data.length}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewRowIndex(Math.max(0, previewRowIndex - 1))}
                    disabled={previewRowIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex-1">
                    <Slider
                      value={[previewRowIndex]}
                      onValueChange={(value) => setPreviewRowIndex(value[0])}
                      max={dataset.data.length - 1}
                      min={0}
                      step={1}
                    />
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewRowIndex(Math.min(dataset.data.length - 1, previewRowIndex + 1))}
                    disabled={previewRowIndex === dataset.data.length - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                <div className="p-3 bg-card border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Preview Output</span>
                  </div>
                  <div className="font-mono text-sm bg-muted/50 p-2 rounded border">
                    {getPreviewValue() || 'No value'}
                  </div>
                </div>

                {/* Validation Warnings */}
                {validationErrors.length > 0 && (
                  <div className="p-3 bg-warning/10 border-2 border-warning/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <span className="text-sm font-medium text-warning">Validation Issues</span>
                    </div>
                    <ul className="text-xs text-warning space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}