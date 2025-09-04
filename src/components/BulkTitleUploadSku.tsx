import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, CheckCircle, Type, Copy, BookOpen } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface BulkTitleUploadSkuProps {
  inventory: any[];
  onTitleUpdate: (skuTitlePairs: { skuNumber: string; title: string }[]) => Promise<void>;
}

export function BulkTitleUploadSku({ inventory, onTitleUpdate }: BulkTitleUploadSkuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [uploadedData, setUploadedData] = useState<{ skuNumber: string; title: string }[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [matchResults, setMatchResults] = useState<{
    matched: { skuNumber: string; title: string; currentTitle?: string }[];
    unmatched: { skuNumber: string; title: string }[];
  }>({ matched: [], unmatched: [] });
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const processFile = async (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    try {
      if (fileExtension === 'csv') {
        return new Promise((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            complete: (results) => {
              resolve(results.data);
            },
            error: (error) => {
              reject(error);
            }
          });
        });
      } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_json(worksheet);
      } else {
        throw new Error('Unsupported file format. Please use CSV or Excel files.');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      throw error;
    }
  };

  const validateAndMapData = (data: any[]) => {
    const mapped: { skuNumber: string; title: string }[] = [];
    
    for (const row of data) {
      // Try to find SKU and Title columns (case-insensitive)
      const skuKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('sku') || key.toLowerCase() === 'sku'
      );
      const titleKey = Object.keys(row).find(key => 
        key.toLowerCase().includes('title') || key.toLowerCase() === 'title'
      );

      if (skuKey && titleKey && row[skuKey] && row[titleKey]) {
        mapped.push({
          skuNumber: String(row[skuKey]).trim(),
          title: String(row[titleKey]).trim()
        });
      }
    }

    if (mapped.length === 0) {
      throw new Error('No valid SKU and Title columns found. Please ensure your file has columns named "SKU" and "Title".');
    }

    return mapped;
  };

  const parsePastedText = (text: string) => {
    const mapped: { skuNumber: string; title: string }[] = [];
    const lines = text.trim().split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      // Try comma first, then tab, then any whitespace
      let parts = line.split(',');
      if (parts.length < 2) {
        parts = line.split('\t');
      }
      if (parts.length < 2) {
        parts = line.split(/\s+/);
      }
      
      if (parts.length >= 2) {
        const skuNumber = parts[0].trim();
        const title = parts.slice(1).join(' ').trim(); // Join remaining parts as title
        
        if (skuNumber && title) {
          mapped.push({ skuNumber, title });
        }
      }
    }

    if (mapped.length === 0) {
      throw new Error('No valid SKU-Title pairs found. Please ensure each line contains SKU followed by Title separated by comma, tab, or space.');
    }

    return mapped;
  };

  const matchWithInventory = (skuTitlePairs: { skuNumber: string; title: string }[]) => {
    const matched: { skuNumber: string; title: string; currentTitle?: string }[] = [];
    const unmatched: { skuNumber: string; title: string }[] = [];

    for (const pair of skuTitlePairs) {
      const inventoryItem = inventory.find(item => 
        item.skuNumber && item.skuNumber.toLowerCase() === pair.skuNumber.toLowerCase()
      );

      if (inventoryItem) {
        matched.push({
          ...pair,
          currentTitle: inventoryItem.title || 'No title'
        });
      } else {
        unmatched.push(pair);
      }
    }

    return { matched, unmatched };
  };

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setIsProcessing(true);
    try {
      const file = acceptedFiles[0];
      const data = await processFile(file);
      const mappedData = validateAndMapData(data as any[]);
      
      setUploadedData(mappedData);
      const results = matchWithInventory(mappedData);
      setMatchResults(results);
      
      toast({
        title: "File processed successfully",
        description: `Found ${mappedData.length} SKU-Title pairs. ${results.matched.length} matched with inventory.`,
      });
    } catch (error: any) {
      toast({
        title: "Error processing file",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const handlePasteProcess = () => {
    if (!pasteText.trim()) {
      toast({
        title: "No data to process",
        description: "Please paste some SKU-Title data first.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const mappedData = parsePastedText(pasteText);
      setUploadedData(mappedData);
      const results = matchWithInventory(mappedData);
      setMatchResults(results);
      
      toast({
        title: "Data processed successfully",
        description: `Found ${mappedData.length} SKU-Title pairs. ${results.matched.length} matched with inventory.`,
      });
    } catch (error: any) {
      toast({
        title: "Error processing data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateTitles = async () => {
    if (matchResults.matched.length === 0) {
      toast({
        title: "No matches found",
        description: "No SKU-Title pairs matched with your inventory.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      await onTitleUpdate(matchResults.matched.map(item => ({
        skuNumber: item.skuNumber,
        title: item.title
      })));
      
      resetData();
      setIsOpen(false);
      
      toast({
        title: "Titles updated successfully",
        description: `Updated titles for ${matchResults.matched.length} inventory items`,
      });
    } catch (error: any) {
      toast({
        title: "Error updating titles",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetData = () => {
    setUploadedData([]);
    setPasteText('');
    setMatchResults({ matched: [], unmatched: [] });
    setActiveTab('upload');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetData();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-2 hover:border-primary/50">
          <BookOpen className="w-4 h-4 mr-2" />
          Bulk Title Update
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Bulk SKU Title Update
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'upload' | 'paste')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload File
              </TabsTrigger>
              <TabsTrigger value="paste" className="flex items-center gap-2">
                <Type className="w-4 h-4" />
                Paste Data
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4">
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50'
                  }`}
              >
                <input {...getInputProps()} />
                <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Upload SKU-Title File</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Drag and drop your CSV or Excel file here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supported formats: CSV, Excel (.xlsx, .xls)
                </p>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  File Format Requirements
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• File must contain columns named "SKU" and "Title"</li>
                  <li>• SKU column should contain your inventory SKU numbers</li>
                  <li>• Title column should contain the product titles</li>
                  <li>• Other columns will be ignored</li>
                </ul>
              </div>
            </TabsContent>
            
            <TabsContent value="paste" className="space-y-4">
              <div>
                <Label htmlFor="pasteData">Paste SKU-Title Data</Label>
                <Textarea
                  id="pasteData"
                  placeholder="SKU123,Wireless Bluetooth Headphones&#10;SKU456,Gaming Mouse with RGB Lighting&#10;SKU789,USB-C Fast Charging Cable&#10;&#10;Format: One pair per line, separated by comma, tab, or space"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
                <Button 
                  onClick={handlePasteProcess} 
                  className="mt-2"
                  disabled={!pasteText.trim() || isProcessing}
                >
                  <Type className="w-4 h-4 mr-2" />
                  Process Data
                </Button>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Copy className="w-4 h-4" />
                  Paste Format Instructions
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• One SKU-Title pair per line</li>
                  <li>• Separate SKU and Title with comma, tab, or space</li>
                  <li>• Example: SKU123,Wireless Bluetooth Headphones</li>
                  <li>• Titles can contain spaces and special characters</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>

          {/* Results Display */}
          {(matchResults.matched.length > 0 || matchResults.unmatched.length > 0) && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Matched Items */}
                {matchResults.matched.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      Matched Items ({matchResults.matched.length})
                    </h4>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {matchResults.matched.slice(0, 10).map((item, index) => (
                        <div key={index} className="text-sm p-2 bg-green-50 rounded border-l-4 border-l-green-500">
                          <div className="font-mono">{item.skuNumber}</div>
                          <div className="text-xs text-muted-foreground">
                            Current: {item.currentTitle} → New: {item.title}
                          </div>
                        </div>
                      ))}
                      {matchResults.matched.length > 10 && (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          ... and {matchResults.matched.length - 10} more items
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Unmatched Items */}
                {matchResults.unmatched.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3 text-orange-600">
                      Unmatched Items ({matchResults.unmatched.length})
                    </h4>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {matchResults.unmatched.slice(0, 10).map((item, index) => (
                        <div key={index} className="text-sm p-2 bg-orange-50 rounded border-l-4 border-l-orange-500">
                          <div className="font-mono">{item.skuNumber}</div>
                          <div className="text-xs text-muted-foreground">{item.title}</div>
                        </div>
                      ))}
                      {matchResults.unmatched.length > 10 && (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          ... and {matchResults.unmatched.length - 10} more items
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-orange-600 mt-2">
                      These SKUs were not found in your inventory and will be skipped.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          {matchResults.matched.length > 0 && (
            <Button 
              onClick={handleUpdateTitles} 
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Update {matchResults.matched.length} Titles
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}